const AuthService = require('./auth.service');

class AuthController {
  static async login(req, res) {
    try {
      const identifier = req.body.phone || req.body.email || req.body.mobile || req.body.identifier;
      const { password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email or phone number and password are required',
        });
      }
      const result = await AuthService.login(identifier, password);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.message || 'Invalid credentials',
      });
    }
  }

  static async register(req, res) {
    try {
      const phone = req.body.phone || req.body.mobile;
      const fullName = req.body.fullName || req.body.full_name || req.body.name;
      const { email, role, password } = req.body;
      if (!phone || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Phone and full name are required',
        });
      }
      const result = await AuthService.register({ phone, fullName, email, role, password });
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Registration failed',
      });
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
