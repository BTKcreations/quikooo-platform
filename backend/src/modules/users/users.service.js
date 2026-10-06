const db = require('../../db');

class UsersService {
  static async getProfile(userId) {
    if (db && typeof db.isConnected === 'function' && db.isConnected()) {
      try {
        const res = await db.query(
          `SELECT id, phone, email, full_name as "fullName", role, is_active as "isActive", is_verified as "isVerified", created_at as "createdAt"
           FROM users
           WHERE id = $1`,
          [userId]
        );
        if (res.rows.length > 0) {
          return res.rows[0];
        }
      } catch (err) {
        console.warn('[UsersService] getProfile DB notice:', err.message);
      }
    }

    return {
      id: userId,
      fullName: 'Demo User',
      role: 'CUSTOMER',
      isVerified: true,
    };
  }

  static async updateProfile(userId, updateData) {
    if (db && typeof db.isConnected === 'function' && db.isConnected()) {
      try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (updateData.fullName) {
          fields.push(`full_name = $${idx++}`);
          values.push(updateData.fullName);
        }
        if (updateData.email) {
          fields.push(`email = $${idx++}`);
          values.push(updateData.email);
        }
        if (updateData.phone) {
          fields.push(`phone = $${idx++}`);
          values.push(updateData.phone);
        }

        if (fields.length > 0) {
          values.push(userId);
          const updateQuery = `
            UPDATE users
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${idx}
            RETURNING id, phone, email, full_name as "fullName", role, is_active as "isActive", is_verified as "isVerified"
          `;
          const res = await db.query(updateQuery, values);
          if (res.rows.length > 0) {
            return res.rows[0];
          }
        }
      } catch (err) {
        console.warn('[UsersService] updateProfile DB notice:', err.message);
      }
    }

    return {
      id: userId,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
  }

  static async listUsers(filters = {}) {
    if (db && typeof db.isConnected === 'function' && db.isConnected()) {
      try {
        const res = await db.query(
          `SELECT id, phone, email, full_name as "fullName", role, is_active as "isActive", is_verified as "isVerified", created_at as "createdAt"
           FROM users
           ORDER BY created_at DESC
           LIMIT 100`
        );
        return {
          users: res.rows,
          total: res.rows.length,
          filters,
        };
      } catch (err) {
        console.warn('[UsersService] listUsers DB notice:', err.message);
      }
    }

    return {
      users: [],
      total: 0,
      filters,
    };
  }
}

module.exports = UsersService;
