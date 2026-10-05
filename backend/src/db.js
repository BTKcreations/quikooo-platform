const { Pool } = require('pg');
const config = require('./config');

const poolConfig = config.db.connectionString
  ? {
      connectionString: config.db.connectionString,
      ssl: config.db.ssl,
      connectionTimeoutMillis: config.db.connectionTimeoutMillis,
    }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl,
      max: config.db.max,
      idleTimeoutMillis: config.db.idleTimeoutMillis,
      connectionTimeoutMillis: config.db.connectionTimeoutMillis,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.warn('[DB Warning] Unexpected client error:', err.message);
});

let isConnected = false;
let hasPostgis = false;

/**
 * Checks connection without throwing fatal exceptions, allowing graceful startup
 * When process.env.REQUIRE_DB === 'true', fails fast by exiting process with code 1
 */
async function checkConnection() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    isConnected = true;
    try {
      const postgisRes = await client.query("SELECT 1 FROM pg_extension WHERE extname = 'postgis'");
      hasPostgis = postgisRes.rowCount > 0;
    } catch {
      hasPostgis = false;
    }
    client.release();
    console.log(`[DB] Connected to PostgreSQL at ${res.rows[0].now} (PostGIS: ${hasPostgis ? 'enabled' : 'disabled'})`);
    return true;
  } catch (err) {
    isConnected = false;
    hasPostgis = false;
    if (process.env.REQUIRE_DB === 'true') {
      console.error(`[DB Fatal] REQUIRE_DB is set to true and database connection failed (${err.message}). Exiting process.`);
      process.exit(1);
    }
    console.warn(`[DB Warning] PostgreSQL not reachable (${err.message}). Starting server in offline/mock-ready mode.`);
    return false;
  }
}

/**
 * Safe query execution
 */
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  poolConfig,
  query,
  checkConnection,
  isConnected: () => isConnected,
  isDbLive: () => isConnected,
  hasPostgis: () => hasPostgis,
};
