const ZonesService = require('./zones.service');

class ZonesController {
  static async list(req, res, next) {
    try {
      const zones = await ZonesService.listZones();
      return res.status(200).json({ success: true, data: zones });
    } catch (err) {
      return next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const zone = await ZonesService.getZoneById(req.params.id);
      return res.status(200).json({ success: true, data: zone });
    } catch (err) {
      return next(err);
    }
  }

  static checkEligibility(req, res, next) {
    try {
      const { orderTime } = req.body;
      const result = ZonesService.checkRuralEligibility(orderTime);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = ZonesController;
