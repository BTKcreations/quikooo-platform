const SettlementService = require('../../services/SettlementService');
const { logAuditEvent, AUDIT_ACTIONS } = require('../../middleware/audit');

class SettlementsService {
  static async listSettlements(filters = {}) {
    return {
      settlements: [],
      total: 0,
      filters,
    };
  }

  static async calculateSettlementBatch({ type, periodStart, periodEnd, records = [] }) {
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNetPayout = 0;

    const computedRecords = records.map((record) => {
      let calculation;
      if (type === 'VENDOR') {
        calculation = SettlementService.calculateVendorSettlement({
          foodTotal: record.foodTotal || 100,
          commissionPercent: record.commissionPercent || 10,
          adjustments: record.adjustments || 0,
        });
        totalGross += calculation.foodTotal;
        totalDeductions += calculation.commissionAmount + calculation.adjustments;
        totalNetPayout += calculation.netPayout;
      } else if (type === 'AGENT') {
        calculation = SettlementService.calculateAgentSettlement({
          netAdjustedPool: record.netAdjustedPool || 13.94,
          agentPercent: record.agentPercent || 60,
        });
        totalGross += calculation.netAdjustedPool;
        totalNetPayout += calculation.netPayout;
      } else if (type === 'DELIVERY_PARTNER') {
        calculation = SettlementService.calculateDeliverySettlement({
          deliveryCount: record.deliveryCount || 1,
          payoutPerDelivery: record.payoutPerDelivery || 25,
        });
        totalGross += calculation.netPayout;
        totalNetPayout += calculation.netPayout;
      }

      const idempotentKey = SettlementService.generateIdempotentKey({
        settlementType: type,
        entityId: record.entityId || 'ENTITY_DEFAULT',
        periodStart,
        periodEnd,
      });

      return {
        ...record,
        ...calculation,
        idempotentKey,
      };
    });

    return {
      type, // 'VENDOR', 'AGENT', 'DELIVERY_PARTNER'
      periodStart,
      periodEnd,
      totalGross,
      totalDeductions,
      totalNetPayout,
      recordsCount: computedRecords.length,
      records: computedRecords,
    };
  }

  static async processSettlement({ settlementId, transactionRef, actor = 'SuperAdmin' }) {
    await logAuditEvent({
      actor,
      action: AUDIT_ACTIONS.SETTLEMENT_PROCESS,
      resourceType: 'SETTLEMENT',
      resourceId: settlementId,
      oldState: { status: 'PENDING' },
      newState: { status: 'PROCESSED', transactionRef },
    });

    return {
      settlementId,
      transactionRef,
      status: 'PROCESSED',
      processedAt: new Date().toISOString(),
    };
  }
}

module.exports = SettlementsService;
