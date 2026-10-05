class UsersService {
  static async getProfile(userId) {
    // TODO: Connect to DB users table
    return {
      id: userId,
      fullName: 'Demo User',
      role: 'CUSTOMER',
      isVerified: true,
    };
  }

  static async updateProfile(userId, updateData) {
    // TODO: Connect to DB users table
    return {
      id: userId,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
  }

  static async listUsers(filters = {}) {
    // TODO: Connect to DB users table
    return {
      users: [],
      total: 0,
      filters,
    };
  }
}

module.exports = UsersService;
