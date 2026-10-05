const db = require('../db');

/**
 * Audit Action Enumerations for platform mutations
 */
const AUDIT_ACTIONS = {
  CONFIG_UPDATE: 'CONFIG_UPDATE',
  COMMISSION_CHANGE: 'COMMISSION_CHANGE',
  ZONE_CREATE: 'ZONE_CREATE',
  ZONE_UPDATE: 'ZONE_UPDATE',
  SETTLEMENT_GENERATE: 'SETTLEMENT_GENERATE',
  SETTLEMENT_PROCESS: 'SETTLEMENT_PROCESS',
  SETTLEMENT_REVERSAL: 'SETTLEMENT_REVERSAL',
  REFUND_PROCESS: 'REFUND_PROCESS',
};

// In-memory circular buffer for fast local querying and fallback
const inMemoryAuditStore = [];
const MAX_IN_MEMORY_LOGS = 500;

/**
 * Programmatically log an administrative or financial state mutation.
 * Persists to PostgreSQL audit_logs table when DB is active, with seamless in-memory fallback.
 * 
 * @param {Object} entry
 * @returns {Promise<Object>} Created audit log record
 */
async function logAuditEvent({
  userId = null,
  actor = null,
  action,
  resourceType,
  resourceId = null,
  oldState = null,
  newState = null,
  changes = null,
  ipAddress = '127.0.0.1',
  userAgent = null,
}) {
  const normalizedChanges = changes || {
    old: oldState !== null ? oldState : undefined,
    new: newState !== null ? newState : undefined,
  };

  const auditRecord = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    actor: actor || userId || 'SYSTEM_ADMIN',
    action: action || 'ADMIN_MUTATION',
    resource_type: resourceType || 'SYSTEM',
    resource_id: resourceId ? String(resourceId) : null,
    changes: normalizedChanges,
    old: normalizedChanges.old !== undefined ? normalizedChanges.old : (oldState || 'N/A'),
    new: normalizedChanges.new !== undefined ? normalizedChanges.new : (newState || 'N/A'),
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date().toISOString(),
  };

  // Add to in-memory store
  inMemoryAuditStore.unshift(auditRecord);
  if (inMemoryAuditStore.length > MAX_IN_MEMORY_LOGS) {
    inMemoryAuditStore.pop();
  }

  // Attempt database persistence if connected
  try {
    if (db && typeof db.isConnected === 'function' && db.isConnected()) {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          auditRecord.action,
          auditRecord.resource_type,
          auditRecord.resource_id,
          JSON.stringify(normalizedChanges),
          ipAddress,
          userAgent,
          auditRecord.created_at,
        ]
      );
    }
  } catch (err) {
    // Non-blocking error logging for resilient execution
    console.warn('[Audit Logger] DB audit persistence notice:', err.message);
  }

  return auditRecord;
}

/**
 * Express middleware to automatically log administrative mutation routes
 * 
 * @param {string} action - AUDIT_ACTIONS enum string
 * @param {string} resourceType - Target entity type (CONFIG, ZONE, SETTLEMENT, REFUND)
 */
function auditMiddleware(action, resourceType) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Only log on successful mutation (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success !== false) {
        const actorName = req.user?.fullName || req.user?.email || req.user?.id || 'SUPER_ADMIN';
        const resourceId = req.params.id || req.body?.id || req.body?.code || req.body?.configKey || null;

        logAuditEvent({
          userId: req.user?.id || null,
          actor: actorName,
          action,
          resourceType,
          resourceId,
          oldState: req._oldState || null,
          newState: req.body,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
          userAgent: req.get('user-agent') || 'Express-Client',
        }).catch((err) => console.warn('[Audit Middleware] Log failed:', err.message));
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Retrieve audit logs with flexible filtering
 */
async function getAuditLogs(filters = {}) {
  let logs = [...inMemoryAuditStore];

  if (filters.action) {
    logs = logs.filter((l) => l.action === filters.action);
  }
  if (filters.resourceType) {
    logs = logs.filter((l) => l.resource_type === filters.resourceType);
  }
  if (filters.userId) {
    logs = logs.filter((l) => l.user_id === filters.userId);
  }
  if (filters.limit) {
    logs = logs.slice(0, parseInt(filters.limit, 10));
  }

  return {
    logs,
    total: logs.length,
    filters,
  };
}

module.exports = {
  AUDIT_ACTIONS,
  logAuditEvent,
  auditMiddleware,
  getAuditLogs,
  inMemoryAuditStore,
};
