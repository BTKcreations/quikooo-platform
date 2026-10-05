const NotificationsService = require('./notifications.service');

class NotificationsController {
  static async send(req, res, next) {
    try {
      const result = await NotificationsService.sendNotification(req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  static async list(req, res, next) {
    try {
      const list = await NotificationsService.listUserNotifications(req.user?.userId || req.query.userId);
      return res.status(200).json({ success: true, data: list });
    } catch (err) {
      return next(err);
    }
  }

  static async markRead(req, res, next) {
    try {
      const result = await NotificationsService.markAsRead(req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = NotificationsController;
