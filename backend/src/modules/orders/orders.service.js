const OrderService = require('../../services/OrderService');
const db = require('../../db');
const notificationQueue = require('../notifications/queue');

// In-memory order store for offline/test environments
const orderMemoryStore = new Map();

class OrdersModuleService {
  static getStore() {
    return orderMemoryStore;
  }

  static clearStore() {
    orderMemoryStore.clear();
  }

  /**
   * Calculates order totals with 100% server authority
   */
  static calculateOrder(data) {
    return OrderService.calculateOrder(data);
  }

  /**
   * Creates an order record with snapshot
   */
  static async createOrder(data) {
    const snapshot = OrderService.createOrderSnapshot(data);
    
    // In production with DB connected, insert into orders & order_items
    if (db.isConnected()) {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        const orderInsert = await client.query(
          `INSERT INTO orders (
            order_number, customer_id, vendor_id, zone_id, agent_id, address_id,
            status, zone_type, original_food_total, subtotal, platform_fee,
            delivery_fee, delivery_partner_payout, total_amount, menu_adjustment_percent,
            menu_adjustment_amount, commission_percent, commission_amount, vendor_payout,
            quikooo_gross_revenue, tax_rate, tax_amount, agent_commission_share, quikooo_revenue_share
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
          RETURNING *`,
          [
            snapshot.orderNumber, snapshot.customerId, snapshot.vendorId, snapshot.zoneId,
            snapshot.agentId, snapshot.addressId, snapshot.status, snapshot.zoneType,
            snapshot.totalOriginalPrice || snapshot.subtotal, snapshot.subtotal,
            snapshot.platformFee, snapshot.deliveryFee, snapshot.deliveryPartnerPayout,
            snapshot.totalAmount, snapshot.menuAdjustmentPercent, snapshot.menuAdjustmentAmount || 0,
            snapshot.commissionPercent, snapshot.commissionAmount || 0, snapshot.vendorPayout,
            snapshot.quikoooGrossRevenue, snapshot.taxRate, snapshot.taxAmount,
            snapshot.agentCommissionShare, snapshot.quikoooRevenueShare
          ]
        );
        await client.query('COMMIT');
        const insertedOrder = orderInsert.rows[0];

        // Non-blocking notification dispatch for order placed
        notificationQueue.notifyOrderEvent(insertedOrder, 'placed');

        return insertedOrder;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // Graceful offline/test return
    const orderId = data.id || `ord-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const mockOrder = {
      id: orderId,
      ...snapshot,
      _persisted: false,
    };
    orderMemoryStore.set(orderId, mockOrder);

    // Non-blocking notification dispatch for order placed
    notificationQueue.notifyOrderEvent(mockOrder, 'placed');

    return mockOrder;
  }

  /**
   * Transitions status using state machine validator
   */
  static transitionStatus(currentStatus, nextStatus) {
    OrderService.validateTransition(currentStatus, nextStatus);
    return {
      fromStatus: currentStatus,
      toStatus: nextStatus,
      transitionedAt: new Date().toISOString(),
    };
  }

  /**
   * Updates order status with validation against current state
   */
  static async updateOrderStatus(id, nextStatus) {
    const order = await this.getById(id);
    OrderService.validateTransition(order.status, nextStatus);

    order.status = nextStatus;
    order.updatedAt = new Date().toISOString();
    orderMemoryStore.set(id, order);

    if (db.isConnected()) {
      await db.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [nextStatus, id]);
    }

    // Non-blocking notification dispatch for status changes
    if (nextStatus === OrderService.ORDER_STATUS.VENDOR_ACCEPTED) {
      notificationQueue.notifyOrderEvent(order, 'accepted');
    } else if (
      nextStatus === OrderService.ORDER_STATUS.READY_FOR_PICKUP ||
      nextStatus === OrderService.ORDER_STATUS.READY_FOR_MORNING_DISPATCH
    ) {
      notificationQueue.notifyOrderEvent(order, 'ready');
    } else if (nextStatus === OrderService.ORDER_STATUS.DELIVERED) {
      notificationQueue.notifyOrderEvent(order, 'delivered');
    }

    return order;
  }

  /**
   * Retrieves an order by ID from memory store or DB
   */
  static async getById(id) {
    if (orderMemoryStore.has(id)) {
      return orderMemoryStore.get(id);
    }

    if (db.isConnected()) {
      const res = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (res.rows[0]) return res.rows[0];
    }

    // Default stub fallback
    const stub = {
      id,
      orderNumber: `QK-ORD-${id.substring(0, 6)}`,
      status: OrderService.ORDER_STATUS.ORDER_PLACED,
      zoneId: 'zone-default',
      note: 'Order details stub',
    };
    orderMemoryStore.set(id, stub);
    return stub;
  }

  /**
   * Helper to set mock order for testing
   */
  static setMockOrder(id, orderData) {
    const existing = orderMemoryStore.get(id) || {};
    const merged = { ...existing, id, ...orderData };
    orderMemoryStore.set(id, merged);
    return merged;
  }

  static async list(filters = {}) {
    if (orderMemoryStore.size > 0) {
      const items = Array.from(orderMemoryStore.values());
      return {
        items,
        total: items.length,
        filters,
      };
    }

    return {
      items: [],
      total: 0,
      filters,
    };
  }
}

module.exports = OrdersModuleService;
