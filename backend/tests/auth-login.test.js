const request = require('supertest');
const { app } = require('../src/index');
const db = require('../src/db');

describe('Auth Service & Endpoints (Register -> Login -> Me Flow)', () => {
  const testEmail = `testadmin_${Date.now()}@quikooo.com`;
  const testPhone = `+9199999${Math.floor(10000 + Math.random() * 90000)}`;
  const testPassword = 'StrongAdminPassword!2026';
  let adminToken = '';
  let customerToken = '';

  afterAll(async () => {
    if (db && typeof db.isConnected === 'function' && db.isConnected()) {
      try {
        await db.query(
          `DELETE FROM users WHERE email LIKE 'test%' OR phone LIKE '+9199999%'`
        );
      } catch (err) {
        // non-blocking cleanup
      }
    }
  });

  describe('1. Registration (POST /api/v1/auth/register)', () => {
    test('successfully registers new user with hashed password and returns token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          phone: testPhone,
          email: testEmail,
          fullName: 'Test Super Admin',
          role: 'SUPER_ADMIN',
          password: testPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.phone).toBe(testPhone);
      expect(res.body.data.user.role).toBe('SUPER_ADMIN');
      // Verify passwords and hashes are never exposed
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    test('refuses duplicate registration with same phone or email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          phone: testPhone,
          email: testEmail,
          fullName: 'Duplicate Admin',
          role: 'SUPER_ADMIN',
          password: testPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    test('validates required fields: missing phone or fullName returns 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid@quikooo.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Login (POST /api/v1/auth/login)', () => {
    test('logs in successfully using email and returns valid JWT token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.role).toBe('SUPER_ADMIN');
      adminToken = res.body.data.token;
    });

    test('logs in successfully using mobile number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          mobile: testPhone,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    test('rejects login with incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'CompletelyWrongPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    test('rejects login for nonexistent user with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'ghost_user_9999@quikooo.com',
          password: 'SomePassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects login with missing identifier or password with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'OnlyPasswordProvided',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Profile Retrieval (GET /api/v1/auth/me)', () => {
    test('returns authenticated user details when valid Bearer token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.role).toBe('SUPER_ADMIN');
      expect(res.body.data.phone).toBe(testPhone);
    });

    test('rejects unauthenticated request with 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    test('rejects request with malformed or invalid token with 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-junk-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. RBAC Gate Verification on Protected Admin Endpoints', () => {
    test('SUPER_ADMIN token has access to protected admin audit-logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('CUSTOMER token receives 403 Forbidden on admin audit-logs', async () => {
      const custPhone = `+9199998${Math.floor(10000 + Math.random() * 90000)}`;
      const custEmail = `testcustomer_${Date.now()}@quikooo.com`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          phone: custPhone,
          email: custEmail,
          fullName: 'Test Customer',
          role: 'CUSTOMER',
          password: 'CustomerPassword123!',
        });

      customerToken = regRes.body.data.token;

      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    test('Unauthenticated request to admin audit-logs receives 401', async () => {
      const res = await request(app).get('/api/v1/admin/audit-logs');
      expect(res.status).toBe(401);
    });
  });
});
