#!/usr/bin/env node
/**
 * QUIKOOO Platform - Database Production Seed Script
 * Inserts system_config defaults, one demo zone (2km urban Asia/Kolkata),
 * and SUPER_ADMIN placeholder note.
 * NEVER seeds fake vendors or orders in production.
 * Source: docs/11-DATABASE-AND-PRODUCTION.md
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

async function createSeedPool() {
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

const SYSTEM_CONFIG_DEFAULTS = [
  {
    key: 'RESTAURANT_MENU_ADJUSTMENT_PERCENT',
    value: '5',
    desc: 'Restaurant item markup percent added to original price',
  },
  {
    key: 'RESTAURANT_PLATFORM_COMMISSION_PERCENT',
    value: '10',
    desc: 'Platform commission percent charged on original price only',
  },
  {
    key: 'CUSTOMER_PLATFORM_FEE',
    value: '5.00',
    desc: 'Fixed platform fee charged to customer per order in INR',
  },
  {
    key: 'CUSTOMER_DELIVERY_FEE',
    value: '25.00',
    desc: 'Fixed delivery fee charged to customer per order in INR',
  },
  {
    key: 'DELIVERY_PARTNER_PAYOUT',
    value: '25.00',
    desc: 'Delivery payout to delivery partner in INR',
  },
  {
    key: 'AGENT_SHARE_PERCENT',
    value: '60',
    desc: 'Local Zone Agent share percentage of net commission/revenue pool',
  },
  {
    key: 'QUIKOOO_SHARE_PERCENT',
    value: '40',
    desc: 'QUIKOOO Platform share percentage of net commission/revenue pool',
  },
  {
    key: 'DEFAULT_RADIUS_KM',
    value: '2',
    desc: 'Default hyper-local discovery radius in kilometers',
  },
  {
    key: 'RURAL_CUTOFF',
    value: '21:00',
    desc: 'Daily order cutoff time (Asia/Kolkata) for rural next-day batch',
  },
  {
    key: 'RURAL_DELIVERY_WINDOW_START',
    value: '05:00',
    desc: 'Rural batch morning delivery window start time',
  },
  {
    key: 'RURAL_DELIVERY_WINDOW_END',
    value: '08:00',
    desc: 'Rural batch morning delivery window end time',
  },
  {
    key: 'TAX_RATE',
    value: '0.18',
    desc: 'Applicable GST/Tax rate on platform gross revenue',
  },
  {
    key: 'TIMEZONE',
    value: 'Asia/Kolkata',
    desc: 'Default operational timezone for scheduling and cutoff locks',
  },
  {
    key: 'SUPER_ADMIN_SETUP_NOTE',
    value: 'Production Super Admin account must be provisioned via secure admin CLI or invitation token. No default passwords seeded.',
    desc: 'Security guideline: Never seed default passwords or fake vendor/order data in production.',
  },
];

async function seedDatabase(customPool = null) {
  const pool = customPool || (await createSeedPool());

  console.log('====================================================');
  console.log('🌱 QUIKOOO Production Database Seeder');
  console.log('====================================================');

  try {
    const client = await pool.connect();
    console.log('[Seed] Connected to PostgreSQL database.');

    // 1. Seed system_config table defaults
    console.log(`[Seed] Upserting ${SYSTEM_CONFIG_DEFAULTS.length} system_config parameters...`);
    for (const item of SYSTEM_CONFIG_DEFAULTS) {
      await client.query(
        `INSERT INTO system_config (config_key, config_value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (config_key) DO UPDATE
         SET config_value = EXCLUDED.config_value,
             description = EXCLUDED.description,
             updated_at = CURRENT_TIMESTAMP`,
        [item.key, item.value, item.desc]
      );
    }
    console.log('[Seed] ✅ System configuration parameters successfully seeded.');

    // 2. Seed one demo zone (2km urban Asia/Kolkata)
    console.log('[Seed] Upserting demo zone: Bengaluru Indiranagar (2km URBAN, Asia/Kolkata)...');
    await client.query(
      `INSERT INTO zones (
         name, code, zone_type, center_latitude, center_longitude,
         radius_km, rural_cutoff_time, is_active, metadata
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9
       )
       ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           radius_km = EXCLUDED.radius_km,
           zone_type = EXCLUDED.zone_type,
           metadata = EXCLUDED.metadata,
           updated_at = CURRENT_TIMESTAMP`,
      [
        'Bengaluru Indiranagar Urban Zone',
        'ZN-BLR-INDIRA-01',
        'URBAN',
        12.9784000,
        77.6408000,
        2.00,
        '21:00',
        true,
        JSON.stringify({
          timezone: 'Asia/Kolkata',
          mode: 'EXPRESS_15MIN',
          city: 'Bengaluru',
          state: 'Karnataka',
          description: 'Demo 2km urban operational zone in Asia/Kolkata',
        }),
      ]
    );
    console.log('[Seed] ✅ Demo operational zone seeded.');

    // 3. Security verification & notes
    console.log('----------------------------------------------------');
    console.log('[Seed] 🛡️  SECURITY AUDIT CHECK:');
    console.log('[Seed]    • Fake vendors seeded: 0 (Strictly disallowed)');
    console.log('[Seed]    • Fake orders seeded:  0 (Strictly disallowed)');
    console.log('[Seed]    • SUPER_ADMIN note:    Initial SUPER_ADMIN account must be created via secure bootstrap CLI or invitation token.');
    console.log('----------------------------------------------------');

    client.release();
    if (!customPool) {
      await pool.end();
    }
    console.log('====================================================');
    console.log('[Seed] Database seeding completed successfully.');
    console.log('====================================================');
    return { success: true };
  } catch (err) {
    console.error(`[Seed Fatal Error] Database seed failed: ${err.message}`);
    if (!customPool) {
      try {
        await pool.end();
      } catch {}
    }
    throw err;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedDatabase, SYSTEM_CONFIG_DEFAULTS };
