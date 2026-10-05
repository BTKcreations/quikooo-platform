const FinanceService = require('./finance.service');

class FinanceController {
  static async getLedger(req, res, next) {
    try {
      const data = await FinanceService.getLedgerEntries(req.query);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  }

  static createEntry(req, res, next) {
    try {
      const entry = FinanceService.createLedgerEntry(req.body);
      return res.status(201).json({ success: true, data: entry });
    } catch (err) {
      return next(err);
    }
  }

  static async getSummary(req, res, next) {
    try {
      const summary = await FinanceService.getFinancialSummary(req.query.zoneId);
      return res.status(200).json({ success: true, data: summary });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = FinanceController;
