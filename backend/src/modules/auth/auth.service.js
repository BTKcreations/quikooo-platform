const bcrypt = require('bcrypt');
const db = require('../../db');
const { generateToken } = require('../../middleware/auth');
const config = require('../../config');

// In-memory user fallback store for tests or offline operation
const inMemoryUsers = new Map();

class AuthService {
  static async login(identifier, password) {
    if (!identifier) {
      throw new Error('Email or phone number is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }

    const trimmedId = String(identifier).trim();
    let user = null;

    // 1. Check PostgreSQL users table
    if (db && typeof db.query === 'function') {
      try {
        const res = await db.query(
          `SELECT id, phone, email, password_hash, full_name, role, is_active, is_verified
           FROM users
           WHERE phone = $1 OR (email IS NOT NULL AND LOWER(email) = LOWER($1))`,
          [trimmedId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          user = {
            id: row.id,
            phone: row.phone,
            email: row.email,
            password_hash: row.password_hash,
            fullName: row.full_name,
            role: row.role,
            isActive: row.is_active,
            isVerified: row.is_verified,
          };
        }
      } catch (err) {
        console.warn('[AuthService] DB query notice:', err.message);
      }
    }

    // 2. Fall back to in-memory store if user not found in DB
    if (!user) {
      for (const u of inMemoryUsers.values()) {
        if (u.phone === trimmedId || (u.email && u.email.toLowerCase() === trimmedId.toLowerCase())) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.isActive === false) {
      throw new Error('Account is inactive or disabled');
    }

    // 3. Verify password hash using bcrypt
    if (user.password_hash) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        throw new Error('Invalid credentials');
      }
    } else {
      throw new Error('Invalid credentials');
    }

    const safeUser = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
    };

    const token = generateToken({
      userId: safeUser.id,
      id: safeUser.id,
      phone: safeUser.phone,
      email: safeUser.email,
      role: safeUser.role,
      fullName: safeUser.fullName,
    });

    return { user: safeUser, token };
  }

  static async register(userData) {
    const phone = userData.phone || userData.mobile;
    const fullName = userData.fullName || userData.full_name || userData.name;
    const email = userData.email ? String(userData.email).toLowerCase().trim() : null;
    const role = userData.role || config.roles.CUSTOMER;
    const password = userData.password || 'default-password-123';

    if (!phone || !fullName) {
      throw new Error('Phone and full name are required');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    let createdUser = null;

    // 1. Attempt PostgreSQL persistence
    if (db && typeof db.query === 'function') {
      try {
        const checkRes = await db.query(
          `SELECT id FROM users WHERE phone = $1 OR (email IS NOT NULL AND LOWER(email) = LOWER($2))`,
          [phone, email]
        );
        if (checkRes.rows.length > 0) {
          throw new Error('User already exists with this phone or email');
        }

        const insertRes = await db.query(
          `INSERT INTO users (phone, email, password_hash, full_name, role, is_active, is_verified)
           VALUES ($1, $2, $3, $4, $5, true, true)
           RETURNING id, phone, email, full_name, role, is_active, is_verified, created_at`,
          [phone, email, passwordHash, fullName, role]
        );

        if (insertRes.rows.length > 0) {
          const row = insertRes.rows[0];
          createdUser = {
            id: row.id,
            phone: row.phone,
            email: row.email,
            password_hash: passwordHash,
            fullName: row.full_name,
            role: row.role,
            isActive: row.is_active,
            isVerified: row.is_verified,
            createdAt: row.created_at,
          };
        }
      } catch (err) {
        if (err.message.includes('User already exists')) {
          throw err;
        }
        console.warn('[AuthService] DB registration notice, using memory fallback:', err.message);
      }
    }

    // 2. In-memory fallback if not created in DB
    if (!createdUser) {
      for (const u of inMemoryUsers.values()) {
        if (u.phone === phone || (email && u.email && u.email.toLowerCase() === email.toLowerCase())) {
          throw new Error('User already exists with this phone or email');
        }
      }

      createdUser = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        phone,
        email,
        password_hash: passwordHash,
        fullName,
        role,
        isActive: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
    }

    inMemoryUsers.set(createdUser.id, createdUser);

    const safeUser = {
      id: createdUser.id,
      phone: createdUser.phone,
      email: createdUser.email,
      fullName: createdUser.fullName,
      role: createdUser.role,
      isActive: createdUser.isActive,
      isVerified: createdUser.isVerified,
    };

    const token = generateToken({
      userId: safeUser.id,
      id: safeUser.id,
      phone: safeUser.phone,
      email: safeUser.email,
      role: safeUser.role,
      fullName: safeUser.fullName,
    });

    return { user: safeUser, token };
  }

  static clearInMemoryStore() {
    inMemoryUsers.clear();
  }
}

module.exports = AuthService;
