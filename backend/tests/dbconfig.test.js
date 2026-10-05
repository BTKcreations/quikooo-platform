/**
 * QUIKOOO Platform - Database Configuration & Production Readiness Tests
 * Tests REQUIRE_DB fail-fast logic, DATABASE_URL parsing, and migration integrity.
 */

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const config = require('../src/config');
const { SYSTEM_CONFIG_DEFAULTS } = require('../scripts/seed');
const { createMigrationPool } = require('../scripts/migrate');

describe('Database Configuration & Production-Ready Hardening', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  describe('REQUIRE_DB Flag Logic', () => {
    test('checkConnection returns false and does NOT exit when REQUIRE_DB is not true', async () => {
      process.env.REQUIRE_DB = 'false';
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock pool.connect to simulate unreachable DB
      jest.spyOn(db.pool, 'connect').mockRejectedValueOnce(new Error('Connection refused at 5432'));

      const result = await db.checkConnection();
      expect(result).toBe(false);
      expect(exitSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('PostgreSQL not reachable')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('mock-ready')
      );
    });

    test('checkConnection triggers fail-fast process.exit(1) when REQUIRE_DB is "true"', async () => {
      process.env.REQUIRE_DB = 'true';
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit called with ${code}`);
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      jest.spyOn(db.pool, 'connect').mockRejectedValueOnce(new Error('Fatal connection refused'));

      await expect(db.checkConnection()).rejects.toThrow('process.exit called with 1');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('REQUIRE_DB is set to true and database connection failed')
      );
    });

    test('isDbLive() and isConnected() export consistent boolean status', () => {
      expect(typeof db.isDbLive).toBe('function');
      expect(typeof db.isConnected).toBe('function');
      expect(typeof db.hasPostgis).toBe('function');

      const isLive = db.isDbLive();
      const isConnected = db.isConnected();
      expect(typeof isLive).toBe('boolean');
      expect(isLive).toBe(isConnected);
    });
  });

  describe('DATABASE_URL Parsing & Connection Resolution', () => {
    test('config provides database connection parameters or connectionString', () => {
      expect(config.db).toBeDefined();
      if (process.env.DATABASE_URL) {
        expect(config.db.connectionString).toBe(process.env.DATABASE_URL);
      } else {
        expect(config.db.host).toBeDefined();
        expect(config.db.port).toBe(5432);
        expect(config.db.database).toBe('quikooo_db');
      }
    });

    test('createMigrationPool configures pool from DATABASE_URL when present', async () => {
      process.env.DATABASE_URL = 'postgresql://custom_user:custom_pass@db.quikooo.internal:5432/quikooo_prod?sslmode=require';
      const pool = await createMigrationPool();
      expect(pool.options.connectionString).toBe(
        'postgresql://custom_user:custom_pass@db.quikooo.internal:5432/quikooo_prod?sslmode=require'
      );
      await pool.end();
    });

    test('createMigrationPool falls back to individual host parameters when DATABASE_URL is unset', async () => {
      delete process.env.DATABASE_URL;
      process.env.DB_HOST = '10.0.0.15';
      process.env.DB_PORT = '5433';
      process.env.DB_NAME = 'quikooo_staging';
      process.env.DB_USER = 'staging_user';
      process.env.DB_PASSWORD = 'staging_password';

      const pool = await createMigrationPool();
      expect(pool.options.host).toBe('10.0.0.15');
      expect(pool.options.port).toBe(5433);
      expect(pool.options.database).toBe('quikooo_staging');
      expect(pool.options.user).toBe('staging_user');
      expect(pool.options.password).toBe('staging_password');
      await pool.end();
    });
  });

  describe('Migration Script & Schema Verification', () => {
    const migrationPath = path.resolve(__dirname, '../migrations/001_init.sql');

    test('migration file 001_init.sql exists and is non-empty', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const content = fs.readFileSync(migrationPath, 'utf8');
      expect(content.length).toBeGreaterThan(1000);
    });

    test('migration SQL checks postgis, pgcrypto and creates core tables', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Extension checks
      expect(sql).toContain('postgis');
      expect(sql).toContain('pgcrypto');

      // Core tables
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS system_config');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS users');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS zones');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS agents');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS vendors');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS orders');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS financial_ledger');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS settlements');
    });

    test('system_config seed defaults include all pricing, zone, and tax parameters', () => {
      const keys = SYSTEM_CONFIG_DEFAULTS.map((item) => item.key);

      expect(keys).toContain('RESTAURANT_MENU_ADJUSTMENT_PERCENT');
      expect(keys).toContain('RESTAURANT_PLATFORM_COMMISSION_PERCENT');
      expect(keys).toContain('CUSTOMER_PLATFORM_FEE');
      expect(keys).toContain('CUSTOMER_DELIVERY_FEE');
      expect(keys).toContain('DELIVERY_PARTNER_PAYOUT');
      expect(keys).toContain('AGENT_SHARE_PERCENT');
      expect(keys).toContain('QUIKOOO_SHARE_PERCENT');
      expect(keys).toContain('DEFAULT_RADIUS_KM');
      expect(keys).toContain('RURAL_CUTOFF');
      expect(keys).toContain('RURAL_DELIVERY_WINDOW_START');
      expect(keys).toContain('RURAL_DELIVERY_WINDOW_END');
      expect(keys).toContain('TAX_RATE');
      expect(keys).toContain('TIMEZONE');
      expect(keys).toContain('SUPER_ADMIN_SETUP_NOTE');
    });

    test('seed configuration does not contain fake vendors or fake orders', () => {
      const keys = SYSTEM_CONFIG_DEFAULTS.map((item) => item.key);
      expect(keys.some((k) => k.includes('MOCK_VENDOR'))).toBe(false);
      expect(keys.some((k) => k.includes('MOCK_ORDER'))).toBe(false);

      const note = SYSTEM_CONFIG_DEFAULTS.find((k) => k.key === 'SUPER_ADMIN_SETUP_NOTE');
      expect(note.value).toContain('Super Admin');
      expect(note.value).toContain('No default passwords');
    });
  });
});
