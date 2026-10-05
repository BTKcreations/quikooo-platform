const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate a JWT token
 */
function generateToken(payload, expiresIn = config.jwt.expiresIn) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

/**
 * Middleware to authenticate requests via JWT Bearer token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Missing or malformed token.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      error: err.message,
    });
  }
}

/**
 * Role-Based Access Control (RBAC) middleware
 * Allowed roles: SUPER_ADMIN, ADMIN, AGENT, VENDOR, DELIVERY_PARTNER, CUSTOMER
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication is required.',
      });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' does not have permission to access this resource.`,
      });
    }

    return next();
  };
}

/**
 * Agent permission restriction middleware:
 * AGENT cannot edit platform commissions, cannot modify financial ledger,
 * and cannot access or modify zones assigned to other agents.
 */
function checkAgentRestrictions(req, res, next) {
  if (!req.user) {
    return next();
  }

  if (req.user.role === config.roles.AGENT) {
    const path = req.baseUrl + (req.path || '');
    const method = req.method.toUpperCase();

    // 1. Agent cannot modify financial ledger
    if (path.includes('/finance') || path.includes('/ledger')) {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Agents are not permitted to modify financial ledger entries.',
        });
      }
    }

    // 2. Agent cannot edit platform commission rates
    if (req.body && (req.body.commissionPercent !== undefined || req.body.restaurantPlatformCommissionPercent !== undefined)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Agents cannot edit platform commission rates.',
      });
    }

    // 3. Agent cannot edit or manage other agent zones
    const targetZoneId = req.params.zoneId || req.body.zoneId || req.query.zoneId;
    if (targetZoneId && req.user.assignedZoneId && targetZoneId !== req.user.assignedZoneId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Agents can only manage their assigned operational zone.',
      });
    }
  }

  return next();
}

module.exports = {
  generateToken,
  authenticate,
  authorize,
  checkAgentRestrictions,
  ROLES: config.roles,
};
