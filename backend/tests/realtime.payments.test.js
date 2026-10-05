const request = require('supertest');
const { app } = require('../src/index');
const {
  verifyGatewaySignature,
  generateGatewaySignature,
  clearProcessedTransactions,
  DEFAULT_WEBHOOK_SECRET,
} = require('../src/modules/payments/payments.webhook');
const { clearTrackingStore } = require('../src/modules/delivery/delivery.tracking');
const OrdersModuleService = require('../src/modules/orders/orders.service');
const OrderService = require('../src/services/OrderService');
const {
  emitOrderStatus,
  emitDeliveryLocation,
  emitBatchUpdate,
  getRoomName,
} = require('../src/realtime');

describe('Phase 5: Realtime Dispatch, Payments Webhook Hardening & Delivery Tracking', () => {
  beforeEach(() => {
    clearProcessedTransactions();
    clearTrackingStore();
    OrdersModuleService.clearStore();
  });

  describe('1. Payments Webhook Signature Hardening', () => {
    test('generateGatewaySignature and verifyGatewaySignature validate HMAC-SHA256 correctly', () => {
      const payload = { transaction_id: 'txn_test_1', order_id: 'ord_test_1', amount: 135.0 };
      const validSig = generateGatewaySignature(payload, DEFAULT_WEBHOOK_SECRET);

      expect(typeof validSig).toBe('string');
      expect(validSig.length).toBe(64); // 256 bits = 64 hex chars

      // Valid signature passes
      expect(verifyGatewaySignature(payload, validSig, DEFAULT_WEBHOOK_SECRET)).toBe(true);

      // Tampered payload fails
      const tamperedPayload = { ...payload, amount: 999.0 };
      expect(verifyGatewaySignature(tamperedPayload, validSig, DEFAULT_WEBHOOK_SECRET)).toBe(false);

      // Tampered signature fails
      expect(verifyGatewaySignature(payload, 'deadbeef'.repeat(8), DEFAULT_WEBHOOK_SECRET)).toBe(false);

      // Missing signature fails
      expect(verifyGatewaySignature(payload, null)).toBe(false);
      expect(verifyGatewaySignature(payload, '')).toBe(false);
    });

    test('POST /api/v1/payments/webhook rejects missing or bad signature with 401', async () => {
      const payload = { transaction_id: 'txn_bad_sig', order_id: 'ord_1', amount: 135 };

      // 1. Missing signature
      const resNoSig = await request(app)
        .post('/api/v1/payments/webhook')
        .send(payload);
      expect(resNoSig.status).toBe(401);
      expect(resNoSig.body.success).toBe(false);
      expect(resNoSig.body.message).toMatch(/Invalid or missing gateway signature/i);

      // 2. Bad/Invalid signature header
      const resBadSig = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-gateway-signature', 'invalid_signature_hex_value')
        .send(payload);
      expect(resBadSig.status).toBe(401);
      expect(resBadSig.body.success).toBe(false);
      expect(resBadSig.body.message).toMatch(/Invalid or missing gateway signature/i);
    });
  });

  describe('2. Idempotent Webhook Processing', () => {
    test('same transaction received twice -> exactly 1 order confirmed, duplicate detected', async () => {
      const orderId = 'ord-phase5-idempotent';
      OrdersModuleService.setMockOrder(orderId, {
        id: orderId,
        orderNumber: 'QK-ORD-IDEMPOTENT',
        status: OrderService.ORDER_STATUS.ORDER_PLACED,
        zoneId: 'zone-north',
      });

      const payload = {
        transaction_id: 'txn_unique_998877',
        order_id: orderId,
        amount: 135.0,
        currency: 'INR',
      };
      const signature = generateGatewaySignature(payload, DEFAULT_WEBHOOK_SECRET);

      // First webhook call: must confirm payment
      const res1 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-gateway-signature', signature)
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.duplicate).toBe(false);
      expect(res1.body.status).toBe(OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);
      expect(res1.body.transaction_id).toBe('txn_unique_998877');

      // Verify state in order store
      const orderAfterFirst = await OrdersModuleService.getById(orderId);
      expect(orderAfterFirst.status).toBe(OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);

      // Second webhook call with the SAME transaction_id (gateway retry)
      const res2 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-gateway-signature', signature)
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.duplicate).toBe(true);
      expect(res2.body.message).toMatch(/already processed/i);
      expect(res2.body.status).toBe(OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);

      // Status must still remain PAYMENT_CONFIRMED (no duplicate mutations)
      const orderAfterSecond = await OrdersModuleService.getById(orderId);
      expect(orderAfterSecond.status).toBe(OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);
    });

    test('webhook rejects payloads without transaction_id', async () => {
      const payload = { order_id: 'ord_missing_txn', amount: 135.0 };
      const signature = generateGatewaySignature(payload, DEFAULT_WEBHOOK_SECRET);

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-gateway-signature', signature)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Missing transaction_id/i);
    });
  });

  describe('3. Order State Security: Only Webhook Marks PAYMENT_CONFIRMED', () => {
    test('client POST /orders/:id/transition cannot mark PAYMENT_CONFIRMED (blocked with 403)', async () => {
      const orderId = 'ord-client-attempt';
      OrdersModuleService.setMockOrder(orderId, {
        id: orderId,
        status: OrderService.ORDER_STATUS.ORDER_PLACED,
      });

      const res = await request(app)
        .post(`/api/v1/orders/${orderId}/transition`)
        .send({
          currentStatus: OrderService.ORDER_STATUS.ORDER_PLACED,
          nextStatus: OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Only verified payment webhooks can confirm payments/i);

      // Verify order status in store was NOT modified
      const order = await OrdersModuleService.getById(orderId);
      expect(order.status).toBe(OrderService.ORDER_STATUS.ORDER_PLACED);
    });

    test('invalid transition is blocked when order is in terminal or incompatible state', async () => {
      const orderId = 'ord-already-cancelled';
      // Order is already CANCELLED
      OrdersModuleService.setMockOrder(orderId, {
        id: orderId,
        status: OrderService.ORDER_STATUS.CANCELLED,
      });

      const payload = {
        transaction_id: 'txn_cancelled_order',
        order_id: orderId,
        amount: 135.0,
      };
      const signature = generateGatewaySignature(payload, DEFAULT_WEBHOOK_SECRET);

      // Webhook trying to mark a CANCELLED order as PAYMENT_CONFIRMED
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-gateway-signature', signature)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid order status transition from CANCELLED to PAYMENT_CONFIRMED/i);

      // Order status remains CANCELLED
      const order = await OrdersModuleService.getById(orderId);
      expect(order.status).toBe(OrderService.ORDER_STATUS.CANCELLED);
    });

    test('valid post-payment client transitions succeed', async () => {
      const res = await request(app)
        .post('/api/v1/orders/ord-test/transition')
        .send({
          currentStatus: OrderService.ORDER_STATUS.VENDOR_ACCEPTED,
          nextStatus: OrderService.ORDER_STATUS.PREPARING,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.toStatus).toBe(OrderService.ORDER_STATUS.PREPARING);
    });
  });

  describe('4. Delivery Tracking Validation & Throttling', () => {
    test('POST /api/v1/delivery/:id/location accepts valid coordinates and returns location data', async () => {
      const deliveryId = 'deliv-val-1';
      const res = await request(app)
        .post(`/api/v1/delivery/${deliveryId}/location`)
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
          speed: 28.5,
          bearing: 180.0,
          orderId: 'ord-101',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deliveryId).toBe(deliveryId);
      expect(res.body.data.latitude).toBe(12.9716);
      expect(res.body.data.longitude).toBe(77.5946);
      expect(res.body.data.throttled).toBe(false);
      expect(res.body.data.note).toMatch(/Location recorded and broadcast via realtime/i);
    });

    test('POST /api/v1/delivery/:id/location rejects invalid coordinates with 400', async () => {
      const deliveryId = 'deliv-invalid';

      // 1. Latitude > 90
      const resLatHigh = await request(app)
        .post(`/api/v1/delivery/${deliveryId}/location`)
        .send({ latitude: 91.5, longitude: 77.0 });
      expect(resLatHigh.status).toBe(400);
      expect(resLatHigh.body.success).toBe(false);
      expect(resLatHigh.body.message).toMatch(/Latitude must be between -90 and 90/i);

      // 2. Latitude < -90
      const resLatLow = await request(app)
        .post(`/api/v1/delivery/${deliveryId}/location`)
        .send({ latitude: -95.0, longitude: 77.0 });
      expect(resLatLow.status).toBe(400);
      expect(resLatLow.body.success).toBe(false);

      // 3. Longitude > 180
      const resLngHigh = await request(app)
        .post(`/api/v1/delivery/${deliveryId}/location`)
        .send({ latitude: 12.0, longitude: 185.0 });
      expect(resLngHigh.status).toBe(400);
      expect(resLngHigh.body.success).toBe(false);
      expect(resLngHigh.body.message).toMatch(/Longitude must be between -180 and 180/i);

      // 4. Non-numeric coordinates
      const resNotNum = await request(app)
        .post(`/api/v1/delivery/${deliveryId}/location`)
        .send({ latitude: 'not-a-number', longitude: 'not-a-number' });
      expect(resNotNum.status).toBe(400);
      expect(resNotNum.body.success).toBe(false);
    });

    test('throttling mechanism flags rapid successive GPS pings to prevent write amplification', async () => {
      const deliveryId = 'deliv-throttle-test';

      // First ping: regular write
      const res1 = await request(app)
        .post(`/api/v1/delivery/${deliveryId}/location`)
        .send({ lat: 12.9716, lng: 77.5946 });

      expect(res1.status).toBe(200);
      expect(res1.body.data.throttled).toBe(false);

      // Immediate second ping (<3 seconds): must be throttled
      const res2 = await request(app)
        .post(`/api/v1/delivery/${deliveryId}/location`)
        .send({ lat: 12.9720, lng: 77.5950 });

      expect(res2.status).toBe(200);
      expect(res2.body.data.throttled).toBe(true);
      expect(res2.body.data.note).toMatch(/throttled.*prevent write amplification/i);
    });

    test('GET /api/v1/delivery/:id/track retrieves current location and breadcrumb history', async () => {
      const deliveryId = 'deliv-track-fetch';

      await request(app)
        .post(`/api/v1/delivery/${deliveryId}/location`)
        .send({ latitude: 12.9716, longitude: 77.5946 });

      const res = await request(app).get(`/api/v1/delivery/${deliveryId}/track`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deliveryId).toBe(deliveryId);
      expect(res.body.data.status).toBe('IN_TRANSIT');
      expect(res.body.data.currentLocation.latitude).toBe(12.9716);
      expect(res.body.data.currentLocation.longitude).toBe(77.5946);
    });
  });

  describe('5. Realtime Socket.IO Pipeline & Room Conventions', () => {
    test('getRoomName formats order:{id}, zone:{id}, driver:{id} correctly', () => {
      expect(getRoomName('order', 'ord_123')).toBe('order:ord_123');
      expect(getRoomName('zone', 'zone_blr')).toBe('zone:zone_blr');
      expect(getRoomName('driver', 'drv_55')).toBe('driver:drv_55');
    });

    test('emitOrderStatus, emitDeliveryLocation, and emitBatchUpdate run without error', () => {
      expect(() => {
        emitOrderStatus('ord_99', { status: 'PREPARING', zoneId: 'zone_1' });
      }).not.toThrow();

      expect(() => {
        emitDeliveryLocation('deliv_99', {
          orderId: 'ord_99',
          driverId: 'drv_1',
          latitude: 12.9716,
          longitude: 77.5946,
        });
      }).not.toThrow();

      expect(() => {
        emitBatchUpdate('batch_01', {
          zoneId: 'zone_rural_1',
          cutoff: '21:00',
          dispatchWindow: '05:00 - 08:00',
          orderCount: 12,
        });
      }).not.toThrow();
    });
  });
});
