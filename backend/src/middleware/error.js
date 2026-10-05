const config = require('../config');

/**
 * 404 Not Found Handler
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Central Error Handler
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] [${req.method}] ${req.originalUrl} - ${statusCode}: ${message}`);
  if (statusCode === 500 && err.stack) {
    console.error(err.stack);
  }

  const response = {
    success: false,
    message,
    ...(err.errors ? { errors: err.errors } : {}),
  };

  if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
