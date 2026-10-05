const ReportsService = require('./reports.service');

class ReportsController {
  static async getSales(req, res, next) {
    try {
      const report = await ReportsService.getSalesReport(req.query);
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      return next(err);
    }
  }

  static async getAgentCommissions(req, res, next) {
    try {
      const report = await ReportsService.getAgentCommissionsReport(req.query);
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      return next(err);
    }
  }

  static async getRuralBatches(req, res, next) {
    try {
      const report = await ReportsService.getRuralBatchesReport(req.query);
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = ReportsController;
