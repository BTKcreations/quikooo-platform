const OrderService = require('../../services/OrderService');
const db = require('../../db');

class OrdersModuleService {
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
        return orderInsert.rows[0];
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // Graceful offline/mock return
    return {
      id: 'mock-order-uuid',
      ...snapshot,
      _persisted: false,
    };
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

  static async getById(id) {
    // TODO: Connect with DB query SELECT * FROM orders WHERE id = $1
    return {
      id,
      orderNumber: `QK-ORD-${id.substring(0, 6)}`,
      status: OrderService.ORDER_STATUS.ORDER_PLACED,
      note: 'Order details stub',
    };
  }

  static async list(filters = {}) {
    // TODO: Connect with DB query SELECT * FROM orders
    return {
      items: [],
      total: 0,
      filters,
    };
  }
}

module.exports = OrdersModuleService;
