const AdminService = require('./admin.service');

class AdminController {
  static async getConfig(req, res, next) {
    try {
      const config = await AdminService.getSystemConfig();
      return res.status(200).json({ success: true, data: config });
    } catch (err) {
      return next(err);
    }
  }

  static async updateConfig(req, res, next) {
    try {
      const result = await AdminService.updateSystemConfig(req.body);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  static async getAuditLogs(req, res, next) {
    try {
      const logs = await AdminService.getAuditLogs(req.query);
      return res.status(200).json({ success: true, data: logs });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = AdminController;
