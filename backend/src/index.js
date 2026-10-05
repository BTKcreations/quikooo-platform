const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const config = require('./config');
const db = require('./db');
const { notFoundHandler, errorHandler } = require('./middleware/error');

// Module route imports
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const zonesRoutes = require('./modules/zones/zones.routes');
const vendorsRoutes = require('./modules/vendors/vendors.routes');
const productsRoutes = require('./modules/products/products.routes');
const ordersRoutes = require('./modules/orders/orders.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const financeRoutes = require('./modules/finance/finance.routes');
const deliveryRoutes = require('./modules/delivery/delivery.routes');
const agentsRoutes = require('./modules/agents/agents.routes');
const settlementsRoutes = require('./modules/settlements/settlements.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const reportsRoutes = require('./modules/reports/reports.routes');

const { initRealtime } = require('./realtime');

const app = express();
const server = http.createServer(app);

// Socket.IO real-time event pipeline
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Initialize realtime rooms and event listeners
initRealtime(io);

// Security & Parsing Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Health Check Endpoints
const healthCheckHandler = (req, res) => {
  const isLive = db.isDbLive ? db.isDbLive() : db.isConnected();
  const hasPostgis = db.hasPostgis ? db.hasPostgis() : false;
  res.status(200).json({
    status: 'ok',
    service: 'QUIKOOO Hyperlocal Commerce API',
    version: '1.0.0',
    phase: 'Phase 1 Foundation',
    timestamp: new Date().toISOString(),
    db: isLive ? 'live' : 'mock',
    postgis: Boolean(hasPostgis),
    databaseConnected: isLive,
    timezone: config.zones.timezone,
  });
};

app.get('/health', healthCheckHandler);
app.get(`${config.apiPrefix}/health`, healthCheckHandler);

// Mount API Modules
app.use(`${config.apiPrefix}/auth`, authRoutes);
app.use(`${config.apiPrefix}/users`, usersRoutes);
app.use(`${config.apiPrefix}/zones`, zonesRoutes);
app.use(`${config.apiPrefix}/vendors`, vendorsRoutes);
app.use(`${config.apiPrefix}/products`, productsRoutes);
app.use(`${config.apiPrefix}/orders`, ordersRoutes);
app.use(`${config.apiPrefix}/payments`, paymentsRoutes);
app.use(`${config.apiPrefix}/finance`, financeRoutes);
app.use(`${config.apiPrefix}/delivery`, deliveryRoutes);
app.use(`${config.apiPrefix}/agents`, agentsRoutes);
app.use(`${config.apiPrefix}/settlements`, settlementsRoutes);
app.use(`${config.apiPrefix}/admin`, adminRoutes);
app.use(`${config.apiPrefix}/notifications`, notificationsRoutes);
app.use(`${config.apiPrefix}/reports`, reportsRoutes);

// Catch 404 & Central Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Listen helper with port collision fallback
function listenOnPort(targetPort, attemptsLeft = 3) {
  const onListening = () => {
    server.removeListener('error', onError);
    console.log(`🚀 QUIKOOO Platform API listening on port ${targetPort} (${config.nodeEnv})`);
    console.log(`📡 Health Check: http://localhost:${targetPort}/health`);
  };

  const onError = (err) => {
    server.removeListener('listening', onListening);
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const nextPort = targetPort + 1;
      console.warn(`[Server Warning] Port ${targetPort} in use. Attempting fallback port ${nextPort}...`);
      listenOnPort(nextPort, attemptsLeft - 1);
    } else {
      console.error('[Server Error] Fatal listen error:', err.message);
    }
  };

  server.once('listening', onListening);
  server.once('error', onError);
  server.listen(targetPort);
}

// Boot function with graceful database connection handling
async function startServer() {
  await db.checkConnection();

  if (process.env.NODE_ENV !== 'test') {
    listenOnPort(config.port);
  }
}

// Start if not loaded in test suite
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Fatal boot error:', err);
  });
}

module.exports = { app, server, io, startServer };
