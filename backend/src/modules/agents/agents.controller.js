const AgentsService = require('./agents.service');

class AgentsController {
  static async list(req, res, next) {
    try {
      const agents = await AgentsService.listAgents();
      return res.status(200).json({ success: true, data: agents });
    } catch (err) {
      return next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const agent = await AgentsService.getAgentById(req.params.id);
      return res.status(200).json({ success: true, data: agent });
    } catch (err) {
      return next(err);
    }
  }

  static async getAnalytics(req, res, next) {
    try {
      const analytics = await AgentsService.getAgentAnalytics(req.params.id);
      return res.status(200).json({ success: true, data: analytics });
    } catch (err) {
      return next(err);
    }
  }

  static async getPayouts(req, res, next) {
    try {
      const payouts = await AgentsService.getAgentPayouts(req.params.id);
      return res.status(200).json({ success: true, data: payouts });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = AgentsController;
