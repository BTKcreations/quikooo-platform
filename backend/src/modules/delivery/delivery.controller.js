const DeliveryService = require('./delivery.service');

class DeliveryController {
  static async assign(req, res, next) {
    try {
      const assignment = await DeliveryService.assignDelivery(req.body);
      return res.status(201).json({ success: true, data: assignment });
    } catch (err) {
      return next(err);
    }
  }

  static async track(req, res, next) {
    try {
      const tracking = await DeliveryService.trackDelivery(req.params.id);
      return res.status(200).json({ success: true, data: tracking });
    } catch (err) {
      return next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const updated = await DeliveryService.updateDeliveryStatus(req.body);
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = DeliveryController;
