const { generateToken } = require('../../middleware/auth');
const config = require('../../config');

class AuthService {
  static async login(phone, password) {
    // TODO: Verify credentials against PostgreSQL users table
    const mockUser = {
      id: 'mock-user-uuid',
      phone,
      role: config.roles.CUSTOMER,
      fullName: 'Customer Test',
    };

    const token = generateToken({
      userId: mockUser.id,
      phone: mockUser.phone,
      role: mockUser.role,
    });

    return { user: mockUser, token };
  }

  static async register(userData) {
    // TODO: Hash password with bcrypt and insert into PostgreSQL users table
    const mockUser = {
      id: 'mock-new-user-uuid',
      phone: userData.phone,
      fullName: userData.fullName,
      role: userData.role || config.roles.CUSTOMER,
    };

    const token = generateToken({
      userId: mockUser.id,
      phone: mockUser.phone,
      role: mockUser.role,
    });

    return { user: mockUser, token };
  }
}

module.exports = AuthService;
