const PaymentsService = require('./payments.service');

class PaymentsController {
  static async create(req, res, next) {
    try {
      const payment = await PaymentsService.createPayment(req.body);
      return res.status(201).json({ success: true, data: payment });
    } catch (err) {
      return next(err);
    }
  }

  static async verify(req, res, next) {
    try {
      const verification = await PaymentsService.verifyPayment(req.body);
      return res.status(200).json({ success: true, data: verification });
    } catch (err) {
      return next(err);
    }
  }

  static async refund(req, res, next) {
    try {
      const refund = await PaymentsService.initiateRefund(req.body);
      return res.status(200).json({ success: true, data: refund });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = PaymentsController;
