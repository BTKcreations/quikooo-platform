const AuthService = require('./auth.service');

class AuthController {
  static async login(req, res, next) {
    try {
      const { phone, password } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }
      const result = await AuthService.login(phone, password);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  static async register(req, res, next) {
    try {
      const { phone, fullName, role } = req.body;
      if (!phone || !fullName) {
        return res.status(400).json({ success: false, message: 'Phone and full name are required' });
      }
      const result = await AuthService.register({ phone, fullName, role });
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  static async me(req, res) {
    return res.status(200).json({
      success: true,
      data: req.user,
    });
  }
}

module.exports = AuthController;
