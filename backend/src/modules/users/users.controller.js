const UsersService = require('./users.service');

class UsersController {
  static async getProfile(req, res, next) {
    try {
      const user = await UsersService.getProfile(req.params.id || req.user?.userId);
      return res.status(200).json({ success: true, data: user });
    } catch (err) {
      return next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const updated = await UsersService.updateProfile(req.params.id, req.body);
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  }

  static async listUsers(req, res, next) {
    try {
      const users = await UsersService.listUsers(req.query);
      return res.status(200).json({ success: true, data: users });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = UsersController;
