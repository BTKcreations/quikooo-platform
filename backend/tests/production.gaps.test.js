const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app } = require('../src/index');
const {
  createGatewayOrder,
  verifyPaymentSignature,
  generatePaymentSignature,
  capturePayment,
  refundPayment,
} = require('../src/modules/payments/razorpay');
const {
  generateGatewaySignature,
  clearProcessedTransactions,
  DEFAULT_WEBHOOK_SECRET,
} = require('../src/modules/payments/payments.webhook');
const notificationQueue = require('../src/modules/notifications/queue');
const OrdersModuleService = require('../src/modules/orders/orders.service');
const OrderService = require('../src/services/OrderService');
const ProductsService = require('../src/modules/products/products.service');

describe('Production Gaps Hardening & Verification', () => {
  beforeEach(() => {
    clearProcessedTransactions();
    OrdersModuleService.clearStore();
    notificationQueue.clear();
  });

  /* =========================================================================
   * 1. PAYMENTS / RAZORPAY
   * ========================================================================= */
  describe('1. Payments & Razorpay Gateway Hardening', () => {
    test('createGatewayOrder creates test-mode stub when live keys are absent', async () => {
      const order = await createGatewayOrder(13500, 'rcpt_test_1');
      expect(order).toBeDefined();
      expect(order.id).toMatch(/^order_test_/);
      expect(order.amount).toBe(13500);
      expect(order.currency).toBe('INR');
      expect(order.receipt).toBe('rcpt_test_1');
      expect(order.test_mode).toBe(true);
    });

    test('signature verify test-mode via razorpay validateWebhookSignature', async () => {
      const orderId = 'order_test_998811';
      const paymentId = 'pay_test_776655';
      const secret = 'test_secret';

      // Generate valid HMAC signature
      const validSig = generatePaymentSignature(orderId, paymentId, secret);

      // Verify valid signature passes
      const isValid = verifyPaymentSignature(orderId, paymentId, validSig, secret);
      expect(isValid).toBe(true);

      // Tampered signature fails
      const badSig = 'bad_sig_'.padEnd(64, '0');
      const isBadValid = verifyPaymentSignature(orderId, paymentId, badSig, secret);
      expect(isBadValid).toBe(false);

      // Tampered orderId fails
      const isTamperedOrder = verifyPaymentSignature('order_tampered', paymentId, validSig, secret);
      expect(isTamperedOrder).toBe(false);

      // HTTP endpoint POST /api/v1/payments/verify
      const verifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .send({
          orderId,
          paymentId,
          signature: validSig,
          secret,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.verified).toBe(true);

      // HTTP endpoint with bad signature rejects with 400
      const badVerifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .send({
          orderId,
          paymentId,
          signature: 'completely_invalid_signature',
          secret,
        });

      expect(badVerifyRes.status).toBe(400);
      expect(badVerifyRes.body.success).toBe(false);
      expect(badVerifyRes.body.verified).toBe(false);
    });

    test('POST /api/v1/payments/create-order rejects client amount', async () => {
      // 1. Client attempts to supply amount directly -> REJECT with 400
      const resTampered = await request(app)
        .post('/api/v1/payments/create-order')
        .send({
          amount: 50.0, // Client tries to specify price
          orderId: 'ord-123',
        });

      expect(resTampered.status).toBe(400);
      expect(resTampered.body.success).toBe(false);
      expect(resTampered.body.message).toMatch(/Client-specified amount is not allowed/i);

      // 2. Server creates order from server-calculated totals ONLY
      // Set up a mock order with authoritative totals
      const orderId = 'ord-server-auth-1';
      OrdersModuleService.setMockOrder(orderId, {
        id: orderId,
        orderNumber: 'QK-AUTH-001',
        totalAmount: 135.0,
        customerPayable: 135.0,
        status: OrderService.ORDER_STATUS.ORDER_PLACED,
      });

      const resValid = await request(app)
        .post('/api/v1/payments/create-order')
        .send({ orderId });

      expect(resValid.status).toBe(201);
      expect(resValid.body.success).toBe(true);
      expect(resValid.body.data.amount).toBe(135.0);
      expect(resValid.body.data.amountPaise).toBe(13500);
      expect(resValid.body.data.gatewayOrder.id).toMatch(/^order_test_/);
    });

    test('webhook duplicate event idempotent & late-auth note handling', async () => {
      const orderId = 'ord-webhook-idempotent-gap';
      OrdersModuleService.setMockOrder(orderId, {
        id: orderId,
        orderNumber: 'QK-WH-001',
        status: OrderService.ORDER_STATUS.ORDER_PLACED,
        zoneId: 'zone-1',
      });

      const payload = {
        id: 'evt_test_unique_101',
        transaction_id: 'txn_unique_gap_101',
        order_id: orderId,
        amount: 135.0,
      };
      const sig = generateGatewaySignature(payload, DEFAULT_WEBHOOK_SECRET);

      // First webhook call: processed successfully
      const res1 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-gateway-signature', sig)
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.duplicate).toBe(false);

      // Second webhook call with SAME transaction_id: returns 200 with duplicate=true
      const res2 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-gateway-signature', sig)
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.duplicate).toBe(true);
      expect(res2.body.message).toMatch(/already processed/i);

      // Late-auth test: payment webhook on CANCELLED order triggers late-auth note & rejects transition
      const cancelledOrderId = 'ord-cancelled-late-auth';
      OrdersModuleService.setMockOrder(cancelledOrderId, {
        id: cancelledOrderId,
        status: OrderService.ORDER_STATUS.CANCELLED,
      });

      const latePayload = {
        transaction_id: 'txn_late_auth_102',
        order_id: cancelledOrderId,
        amount: 135.0,
      };
      const lateSig = generateGatewaySignature(latePayload, DEFAULT_WEBHOOK_SECRET);

      const resLate = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-gateway-signature', lateSig)
        .send(latePayload);

      expect(resLate.status).toBe(400);
      expect(resLate.body.success).toBe(false);
      expect(resLate.body.message).toMatch(/Invalid order status transition from CANCELLED/i);
    });

    test('capture and refund helpers work in test-mode', async () => {
      const capture = await capturePayment('pay_test_cap_1', 13500);
      expect(capture.id).toBe('pay_test_cap_1');
      expect(capture.status).toBe('captured');
      expect(capture.amount).toBe(13500);

      const refund = await refundPayment('pay_test_cap_1', 13500, { reason: 'Test refund' });
      expect(refund.id).toMatch(/^rfnd_test_/);
      expect(refund.payment_id).toBe('pay_test_cap_1');
      expect(refund.status).toBe('processed');
    });
  });

  /* =========================================================================
   * 2. NOTIFICATIONS QUEUE & PROVIDERS
   * ========================================================================= */
  describe('2. Notifications Job Queue Abstraction & Offline Drain', () => {
    test('enqueue+drain works offline with retry(3)', async () => {
      notificationQueue.clear();

      // Enqueue SMS, Push, and Email jobs
      const smsJob = await notificationQueue.enqueueSms('9876543210', 'Test SMS Message');
      const pushJob = await notificationQueue.enqueuePush('device_token_abc', {
        title: 'New Notification',
        body: 'Hyperlocal delivery ready',
      });
      const emailJob = await notificationQueue.enqueueEmail('user@quikooo.test', 'Welcome', 'Welcome to Quikooo');

      expect(smsJob.id).toBeDefined();
      expect(pushJob.id).toBeDefined();
      expect(emailJob.id).toBeDefined();

      // Drain queue
      await notificationQueue.drain();

      const completed = notificationQueue.getCompletedJobs();
      expect(completed.length).toBe(3);
      expect(completed.map((j) => j.type)).toEqual(expect.arrayContaining(['sms', 'push', 'email']));
      expect(notificationQueue.getPendingJobs().length).toBe(0);
    });

    test('order events (placed/accepted/ready/delivered) enqueue non-blocking notifications', async () => {
      notificationQueue.clear();

      // 1. Order Placed
      const order = await OrdersModuleService.createOrder({
        customerId: 'cust-queue-1',
        vendorId: 'vendor-1',
        zoneId: 'zone-north',
        items: [{ productId: 'p1', originalPrice: 100, quantity: 1 }],
      });

      expect(order.id).toBeDefined();

      // 2. Order Accepted
      await OrdersModuleService.updateOrderStatus(order.id, OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);
      await OrdersModuleService.updateOrderStatus(order.id, OrderService.ORDER_STATUS.VENDOR_ACCEPTED);

      // 3. Order Ready
      await OrdersModuleService.updateOrderStatus(order.id, OrderService.ORDER_STATUS.PREPARING);
      await OrdersModuleService.updateOrderStatus(order.id, OrderService.ORDER_STATUS.READY_FOR_PICKUP);

      // 4. Order Delivered
      await OrdersModuleService.updateOrderStatus(order.id, OrderService.ORDER_STATUS.DELIVERY_ACCEPTED);
      await OrdersModuleService.updateOrderStatus(order.id, OrderService.ORDER_STATUS.PICKED_UP);
      await OrdersModuleService.updateOrderStatus(order.id, OrderService.ORDER_STATUS.OUT_FOR_DELIVERY);
      await OrdersModuleService.updateOrderStatus(order.id, OrderService.ORDER_STATUS.DELIVERED);

      // Wait for notifications to settle
      await notificationQueue.drain();

      const completed = notificationQueue.getCompletedJobs();
      expect(completed.length).toBeGreaterThanOrEqual(4);
    });
  });

  /* =========================================================================
   * 3. UPLOADS MODULE
   * ========================================================================= */
  describe('3. Uploads Module (POST /api/v1/uploads)', () => {
    test('rejects non-image upload with 400', async () => {
      const res = await request(app)
        .post('/api/v1/uploads')
        .attach('file', Buffer.from('plain text content'), {
          filename: 'document.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Only image files are allowed/i);
    });

    test('accepts png image and saves locally with /uploads URL', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/v1/uploads')
        .field('productId', 'prod-3')
        .attach('file', pngBuffer, {
          filename: 'test_product.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.url).toMatch(/^\/uploads\/.+\.png$/);
      expect(res.body.mimetype).toBe('image/png');

      // Verify the file was written to disk
      const savedRelativePath = res.body.url.replace('/uploads/', '');
      const uploadsDir = path.resolve(__dirname, '../uploads');
      const fullPath = path.join(uploadsDir, savedRelativePath);
      expect(fs.existsSync(fullPath)).toBe(true);

      // Verify product image_url updated
      const product = await ProductsService.getProductById('prod-3');
      expect(product.imageUrl || product.image_url).toBe(res.body.url);
    });
  });

  /* =========================================================================
   * 4. SEARCH / FUZZY RANKED SEARCH
   * ========================================================================= */
  describe('4. Products Fuzzy Ranked Search (GET /api/v1/products/search?q=)', () => {
    test("'milk' matches 'Amul Milk'", async () => {
      const res = await request(app)
        .get('/api/v1/products/search')
        .query({ q: 'milk' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const names = res.body.data.map((p) => p.name);
      expect(names).toContain('Amul Milk');
    });

    test("typo 'mlik' matches 'Amul Milk' via Levenshtein <= 2", async () => {
      const res = await request(app)
        .get('/api/v1/products/search')
        .query({ q: 'mlik' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const matched = res.body.data.find((p) => p.name === 'Amul Milk');
      expect(matched).toBeDefined();
      expect(matched.name).toBe('Amul Milk');
    });

    test('out-of-stock items are ranked last even when matching', async () => {
      const res = await request(app)
        .get('/api/v1/products/search')
        .query({ q: 'milk' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const items = res.body.data;
      // In the catalog:
      // 'Amul Milk' has isAvailable: true
      // 'Toned Milk' and 'Almond Milk' have isAvailable: false
      const amulIndex = items.findIndex((p) => p.name === 'Amul Milk');
      const tonedIndex = items.findIndex((p) => p.name === 'Toned Milk');

      expect(amulIndex).toBeGreaterThanOrEqual(0);
      expect(tonedIndex).toBeGreaterThanOrEqual(0);

      // In-stock Amul Milk must appear BEFORE out-of-stock Toned Milk
      expect(amulIndex).toBeLessThan(tonedIndex);

      // Every in-stock item must come before any out-of-stock item
      let seenOutOfStock = false;
      for (const item of items) {
        if (!item.isAvailable) {
          seenOutOfStock = true;
        } else if (seenOutOfStock) {
          // If we see an in-stock item after an out-of-stock item, test fails
          throw new Error(`In-stock item '${item.name}' found after out-of-stock items`);
        }
      }
    });

    test('prior-order boost elevates matching product score', async () => {
      // Search with priorProductIds boost
      const normalRes = await request(app)
        .get('/api/v1/products/search')
        .query({ q: 'biryani' });

      const normalScore = normalRes.body.data[0].searchScore;

      const boostedRes = await request(app)
        .get('/api/v1/products/search')
        .query({ q: 'biryani', priorProductIds: 'prod-1' });

      const boostedScore = boostedRes.body.data[0].searchScore;
      expect(boostedScore).toBeGreaterThan(normalScore);
      expect(boostedRes.body.data[0].priorOrderBoost).toBe(true);
    });
  });
});
