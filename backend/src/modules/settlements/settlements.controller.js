const SettlementsService = require('./settlements.service');

class SettlementsController {
  static async list(req, res, next) {
    try {
      const data = await SettlementsService.listSettlements(req.query);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  }

  static async calculate(req, res, next) {
    try {
      const data = await SettlementsService.calculateSettlementBatch(req.body);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  }

  static async process(req, res, next) {
    try {
      const data = await SettlementsService.processSettlement(req.body);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = SettlementsController;
