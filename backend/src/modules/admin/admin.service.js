const config = require('../../config');
const { getAuditLogs, logAuditEvent, AUDIT_ACTIONS } = require('../../middleware/audit');

class AdminService {
  static async getSystemConfig() {
    return {
      pricing: config.pricing,
      zones: config.zones,
      tax: config.tax,
    };
  }

  static async updateSystemConfig(updates, user = null) {
    const oldConfig = {
      pricing: { ...config.pricing },
      zones: { ...config.zones },
      tax: { ...config.tax },
    };

    // Apply updates in memory
    if (updates.pricing) Object.assign(config.pricing, updates.pricing);
    if (updates.zones) Object.assign(config.zones, updates.zones);
    if (updates.tax) Object.assign(config.tax, updates.tax);

    // Record audit event
    await logAuditEvent({
      userId: user?.id || null,
      actor: user?.fullName || user?.email || 'SuperAdmin',
      action: AUDIT_ACTIONS.CONFIG_UPDATE,
      resourceType: 'CONFIG',
      resourceId: 'SYSTEM_CONFIG',
      oldState: oldConfig,
      newState: updates,
    });

    return {
      updated: updates,
      updatedAt: new Date().toISOString(),
    };
  }

  static async getAuditLogs(filters = {}) {
    return await getAuditLogs(filters);
  }
}

module.exports = AdminService;
