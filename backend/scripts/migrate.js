#!/usr/bin/env node
/**
 * QUIKOOO Platform - Database Migration Runner
 * Executes migrations/*.sql files in order against the PostgreSQL database
 * Source: docs/11-DATABASE-AND-PRODUCTION.md
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function createMigrationPool() {
  const connectionString = process.env.DATABASE_URL;
  const poolConfig = connectionString
    ? {
        connectionString,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME || 'quikooo_db',
        user: process.env.DB_USER || 'quikooo_user',
        password: process.env.DB_PASSWORD || 'quikooo_pass',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      };

  return new Pool(poolConfig);
}

async function runMigrations(customPool = null) {
  const pool = customPool || (await createMigrationPool());
  const migrationsDir = path.resolve(__dirname, '../migrations');

  console.log('====================================================');
  console.log('🚀 QUIKOOO Hyperlocal Commerce - Database Migrations');
  console.log('====================================================');

  try {
    const client = await pool.connect();
    console.log('[Migrate] Connected to PostgreSQL successfully.');

    // 1. Check and enable required extensions
    console.log('[Migrate] Verifying database extensions (uuid-ossp, pgcrypto, postgis)...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
      console.log('[Migrate] Extensions "uuid-ossp" and "pgcrypto" verified.');
    } catch (extErr) {
      console.warn('[Migrate Warning] Failed to enable cryptographic extensions:', extErr.message);
    }

    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "postgis";');
      console.log('[Migrate] Extension "postgis" verified and enabled.');
    } catch (postgisErr) {
      console.warn('[Migrate Warning] PostGIS extension not available on host:', postgisErr.message);
      console.warn('[Migrate Notice] Geometric calculations will fall back to Haversine trigonometry.');
    }

    // 2. Discover and sort migration files
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (files.length === 0) {
      console.log('[Migrate] No migration SQL files found.');
      client.release();
      if (!customPool) await pool.end();
      return { success: true, migrationsRun: 0 };
    }

    console.log(`[Migrate] Found ${files.length} migration file(s) to execute.`);

    // 3. Run each migration file in sequence
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`[Migrate] ⚙️  Applying: ${file}...`);
      const startTime = Date.now();
      await client.query(sql);
      const duration = Date.now() - startTime;
      console.log(`[Migrate] ✅ Successfully applied: ${file} (${duration}ms)`);
    }

    client.release();
    console.log('====================================================');
    console.log(`[Migrate] All ${files.length} migration(s) executed successfully!`);
    console.log('====================================================');

    if (!customPool) {
      await pool.end();
    }
    return { success: true, migrationsRun: files.length };
  } catch (err) {
    console.error('====================================================');
    console.error(`[Migrate Fatal Error] Migration execution failed: ${err.message}`);
    console.error('====================================================');
    if (!customPool) {
      try {
        await pool.end();
      } catch {}
    }
    throw err;
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations, createMigrationPool };
