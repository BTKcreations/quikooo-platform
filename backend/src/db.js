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

/**
 * Checks connection without throwing fatal exceptions, allowing graceful startup
 */
async function checkConnection() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    isConnected = true;
    console.log(`[DB] Connected to PostgreSQL at ${res.rows[0].now}`);
    return true;
  } catch (err) {
    isConnected = false;
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
  query,
  checkConnection,
  isConnected: () => isConnected,
};
