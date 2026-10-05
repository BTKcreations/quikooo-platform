const request = require('supertest');
const { app } = require('../src/index');
const OrderService = require('../src/services/OrderService');

describe('OrderService & Orders API Tests', () => {
  describe('State Machine Transitions', () => {
    test('allows standard happy path forward transitions', () => {
      const { ORDER_STATUS } = OrderService;

      expect(OrderService.validateTransition(ORDER_STATUS.ORDER_PLACED, ORDER_STATUS.PAYMENT_CONFIRMED)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.PAYMENT_CONFIRMED, ORDER_STATUS.VENDOR_ACCEPTED)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.VENDOR_ACCEPTED, ORDER_STATUS.PREPARING)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.PREPARING, ORDER_STATUS.READY_FOR_PICKUP)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.READY_FOR_PICKUP, ORDER_STATUS.DELIVERY_ASSIGNED)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.DELIVERY_ASSIGNED, ORDER_STATUS.DELIVERY_ACCEPTED)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.DELIVERY_ACCEPTED, ORDER_STATUS.PICKED_UP)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.PICKED_UP, ORDER_STATUS.OUT_FOR_DELIVERY)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED)).toBe(true);
    });

    test('allows rural batch workflow transitions', () => {
      const { ORDER_STATUS } = OrderService;

      expect(OrderService.validateTransition(ORDER_STATUS.PAYMENT_CONFIRMED, ORDER_STATUS.SCHEDULED_FOR_NEXT_DAY)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.SCHEDULED_FOR_NEXT_DAY, ORDER_STATUS.READY_FOR_MORNING_DISPATCH)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.READY_FOR_MORNING_DISPATCH, ORDER_STATUS.DELIVERY_ASSIGNED)).toBe(true);
    });

    test('allows cancellation and refund flow', () => {
      const { ORDER_STATUS } = OrderService;

      expect(OrderService.validateTransition(ORDER_STATUS.ORDER_PLACED, ORDER_STATUS.CANCELLED)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUND_INITIATED)).toBe(true);
      expect(OrderService.validateTransition(ORDER_STATUS.REFUND_INITIATED, ORDER_STATUS.REFUNDED)).toBe(true);
    });

    test('throws error on invalid state transitions', () => {
      const { ORDER_STATUS } = OrderService;

      // Jumping directly from ORDER_PLACED to DELIVERED
      expect(() => {
        OrderService.validateTransition(ORDER_STATUS.ORDER_PLACED, ORDER_STATUS.DELIVERED);
      }).toThrow(/Invalid order status transition/);

      // Terminal DELIVERED attempting backward transition
      expect(() => {
        OrderService.validateTransition(ORDER_STATUS.DELIVERED, ORDER_STATUS.PREPARING);
      }).toThrow(/Invalid order status transition/);

      // CANCELLED attempting to go to DELIVERED
      expect(() => {
        OrderService.validateTransition(ORDER_STATUS.CANCELLED, ORDER_STATUS.DELIVERED);
      }).toThrow(/Invalid order status transition/);
    });
  });

  describe('MVP Single Vendor Cart Constraint', () => {
    test('succeeds when all items belong to same vendor', () => {
      const items = [
        { productId: 'p1', vendorId: 'v1', quantity: 1, originalPrice: 100 },
        { productId: 'p2', vendorId: 'v1', quantity: 2, originalPrice: 50 },
      ];

      expect(() => OrderService.validateSingleVendor(items, 'v1')).not.toThrow();
    });

    test('throws when items from multiple vendors are in cart', () => {
      const items = [
        { productId: 'p1', vendorId: 'v1', quantity: 1, originalPrice: 100 },
        { productId: 'p2', vendorId: 'v2', quantity: 1, originalPrice: 150 },
      ];

      expect(() => OrderService.validateSingleVendor(items, 'v1')).toThrow(
        'MVP cart only supports items from a single vendor.'
      );
    });
  });

  describe('Order Snapshot Creation', () => {
    test('creates full order snapshot with immutable commission, fees, and tax fields', () => {
      const snapshot = OrderService.createOrderSnapshot({
        customerId: 'cust-123',
        vendorId: 'vendor-456',
        zoneId: 'zone-789',
        agentId: 'agent-101',
        addressId: 'addr-202',
        items: [{ productId: 'p1', originalPrice: 100, quantity: 1 }],
      });

      expect(snapshot.orderNumber).toMatch(/^QK-/);
      expect(snapshot.zoneId).toBe('zone-789');
      expect(snapshot.agentId).toBe('agent-101');
      expect(snapshot.subtotal).toBe(105);
      expect(snapshot.platformFee).toBe(5);
      expect(snapshot.deliveryFee).toBe(25);
      expect(snapshot.totalAmount).toBe(135);
      expect(snapshot.commissionPercent).toBe(10);
      expect(snapshot.taxRate).toBe(0.18);
      expect(snapshot.agentCommissionShare).toBeGreaterThan(0);
      expect(snapshot.quikoooRevenueShare).toBeGreaterThan(0);
    });
  });

  describe('HTTP REST API: /health and /api/v1/orders/calculate', () => {
    test('GET /health returns 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toContain('QUIKOOO');
    });

    test('POST /api/v1/orders/calculate returns server-calculated amounts (payable 135 for 100 original)', async () => {
      const res = await request(app)
        .post('/api/v1/orders/calculate')
        .send({
          vendorId: 'vendor-123',
          items: [{ productId: 'prod-1', originalPrice: 100, quantity: 1 }],
          addressId: 'addr-456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.totalOriginalPrice).toBe(100);
      expect(data.subtotal).toBe(105); // customerMenuPrice (100 + 5)
      expect(data.platformFee).toBe(5);
      expect(data.deliveryFee).toBe(25);
      expect(data.customerPayable).toBe(135); // 105 + 5 + 25 = 135
      expect(data.vendorSettlement).toBe(90); // 100 - 10
      expect(data.quikoooGrossRevenue).toBe(15); // 5 + 10
    });

    test('POST /api/v1/orders/calculate rejects multi-vendor cart with 400', async () => {
      const res = await request(app)
        .post('/api/v1/orders/calculate')
        .send({
          vendorId: 'vendor-1',
          items: [
            { productId: 'p1', vendorId: 'vendor-1', originalPrice: 100, quantity: 1 },
            { productId: 'p2', vendorId: 'vendor-2', originalPrice: 100, quantity: 1 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('MVP cart only supports items from a single vendor');
    });
  });
});
