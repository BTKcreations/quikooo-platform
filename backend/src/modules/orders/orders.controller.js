const OrdersService = require('./orders.service');

class OrdersController {
  /**
   * POST /api/v1/orders/calculate
   * Centralized server-authoritative money calculation
   */
  static async calculate(req, res, next) {
    try {
      const { vendorId, items, addressId, zoneType } = req.body;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'vendorId is required',
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'items array is required and must not be empty',
        });
      }

      const calculation = OrdersService.calculateOrder({
        vendorId,
        items,
        addressId,
        zoneType,
      });

      return res.status(200).json({
        success: true,
        data: calculation,
      });
    } catch (err) {
      if (err.message.includes('single vendor')) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      return next(err);
    }
  }

  /**
   * POST /api/v1/orders
   * Create an order
   */
  static async create(req, res, next) {
    try {
      const order = await OrdersService.createOrder(req.body);
      return res.status(201).json({
        success: true,
        data: order,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/orders/:id
   */
  static async getById(req, res, next) {
    try {
      const order = await OrdersService.getById(req.params.id);
      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/orders/:id/transition
   */
  static async transitionStatus(req, res, next) {
    try {
      const { currentStatus, nextStatus } = req.body;

      // Security rule: Only payment webhooks can transition an order to PAYMENT_CONFIRMED
      if (nextStatus === 'PAYMENT_CONFIRMED') {
        return res.status(403).json({
          success: false,
          message: 'Client cannot transition order to PAYMENT_CONFIRMED. Only verified payment webhooks can confirm payments.',
        });
      }

      const result = OrdersService.transitionStatus(currentStatus, nextStatus);
      return res.status(200).json({
        success: true,
        data: {
          orderId: req.params.id,
          ...result,
        },
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/orders
   */
  static async list(req, res, next) {
    try {
      const list = await OrdersService.list(req.query);
      return res.status(200).json({
        success: true,
        data: list,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = OrdersController;
