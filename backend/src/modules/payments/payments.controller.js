const PaymentsService = require('./payments.service');

class PaymentsController {
  /**
   * POST /api/v1/payments/create-order
   * Server creates gateway order from server-calculated totals ONLY, never client amount
   */
  static async createOrder(req, res, next) {
    try {
      // Zero-trust check: Client must never dictate payment amounts
      if (req.body && req.body.amount !== undefined) {
        return res.status(400).json({
          success: false,
          message: 'Client-specified amount is not allowed. Gateway order amounts are calculated authoritatively by the server.',
        });
      }

      const orderData = await PaymentsService.createGatewayOrder(req.body || {});
      return res.status(201).json({
        success: true,
        data: orderData,
        message: 'Gateway order created successfully from server-calculated totals',
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Backward-compatible alias for create
   */
  static async create(req, res, next) {
    return PaymentsController.createOrder(req, res, next);
  }

  /**
   * POST /api/v1/payments/verify
   * Verify signature from payment gateway
   */
  static async verify(req, res, next) {
    try {
      const verification = await PaymentsService.verifyPayment(req.body || {});
      return res.status(200).json({
        success: true,
        verified: true,
        data: verification,
        message: 'Payment verified successfully',
      });
    } catch (err) {
      if (err.statusCode === 400) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: err.message,
        });
      }
      return next(err);
    }
  }

  /**
   * POST /api/v1/payments/refund
   */
  static async refund(req, res, next) {
    try {
      const refund = await PaymentsService.initiateRefund(req.body || {});
      return res.status(200).json({ success: true, data: refund });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = PaymentsController;
