const config = require('../config');
const { round2 } = require('./TaxService');
const { logAuditEvent, AUDIT_ACTIONS } = require('../middleware/audit');

class SettlementService {
  /**
   * Generates a deterministic idempotency key for settlements based on period and entity
   * Format: SETTLE_{TYPE}_{ENTITY_ID}_{PERIOD_START}_{PERIOD_END}
   * 
   * @param {Object} params
   * @param {string} params.settlementType - VENDOR | AGENT | DELIVERY_PARTNER
   * @param {string} params.entityId - Unique ID of vendor, agent, or driver
   * @param {string|Date} params.periodStart - Start ISO date or string
   * @param {string|Date} params.periodEnd - End ISO date or string
   * @returns {string} Idempotency key
   */
  static generateIdempotentKey({ settlementType, entityId, periodStart, periodEnd }) {
    if (!settlementType || !entityId || !periodStart || !periodEnd) {
      throw new Error('All settlement dimensions (settlementType, entityId, periodStart, periodEnd) are required for idempotency');
    }
    const cleanStart = typeof periodStart === 'string' ? periodStart.split('T')[0] : new Date(periodStart).toISOString().split('T')[0];
    const cleanEnd = typeof periodEnd === 'string' ? periodEnd.split('T')[0] : new Date(periodEnd).toISOString().split('T')[0];
    return `SETTLE_${settlementType.toUpperCase()}_${entityId}_${cleanStart}_${cleanEnd}`;
  }

  /**
   * Vendor Settlement Formula: food - commission - adjustments
   * Canonical: 100 food - 10 commission (10% of original price) = 90.00 Net Payout
   * 
   * @param {Object} params
   * @param {number} params.foodTotal - Total original food sales
   * @param {number} [params.commissionPercent=10] - Platform commission percent (charged on original price)
   * @param {number} [params.adjustments=0] - Deductions or operational adjustments
   * @returns {Object} Settlement calculation breakdown
   */
  static calculateVendorSettlement({ foodTotal, commissionPercent = config.pricing.restaurantPlatformCommissionPercent, adjustments = 0 }) {
    const food = round2(Number(foodTotal) || 0);
    const commPercent = Number(commissionPercent) || 10;
    const commAmount = round2(food * (commPercent / 100));
    const adj = round2(Number(adjustments) || 0);
    const netPayout = round2(food - commAmount - adj);

    return {
      settlementType: 'VENDOR',
      foodTotal: food,
      commissionPercent: commPercent,
      commissionAmount: commAmount,
      adjustments: adj,
      netPayout,
    };
  }

  /**
   * Agent Franchise Settlement Formula: adjusted * 0.6
   * Canonical: 13.94 net revenue pool * 0.60 = 8.36 Net Payout
   * 
   * @param {Object} params
   * @param {number} params.netAdjustedPool - Net platform revenue pool after GST
   * @param {number} [params.agentPercent=60] - Agent revenue share percent
   * @returns {Object} Settlement calculation breakdown
   */
  static calculateAgentSettlement({ netAdjustedPool, agentPercent = config.pricing.agentSharePercent }) {
    const pool = round2(Number(netAdjustedPool) || 0);
    const pct = Number(agentPercent) || 60;
    const netPayout = round2(pool * (pct / 100));

    return {
      settlementType: 'AGENT',
      netAdjustedPool: pool,
      agentPercent: pct,
      netPayout,
    };
  }

  /**
   * Delivery Partner Settlement Formula: 25 * n
   * Canonical: 25 INR payout per completed delivery task (100% pass-through)
   * 
   * @param {Object} params
   * @param {number} params.deliveryCount - Number of completed orders
   * @param {number} [params.payoutPerDelivery=25] - Flat fee per drop
   * @returns {Object} Settlement calculation breakdown
   */
  static calculateDeliverySettlement({ deliveryCount, payoutPerDelivery = config.pricing.deliveryPartnerPayout }) {
    const count = Math.max(0, parseInt(deliveryCount, 10) || 0);
    const fee = round2(Number(payoutPerDelivery) || 25);
    const netPayout = round2(count * fee);

    return {
      settlementType: 'DELIVERY_PARTNER',
      deliveryCount: count,
      payoutPerDelivery: fee,
      netPayout,
      isPassThrough: true,
    };
  }

  /**
   * Safeguard Enforcement:
   * No edit-after-paid! Settlements marked 'PAID' or 'PROCESSED' are immutable.
   * If a modification is attempted on a paid record, this method rejects it.
   */
  static assertSettlementMutable(settlement) {
    if (!settlement) {
      throw new Error('Settlement record not found');
    }
    const status = (settlement.status || '').toUpperCase();
    if (status === 'PAID' || status === 'PROCESSED') {
      throw new Error(
        `Financial Safeguard Violation: Settlement ${settlement.id || settlement.idempotentKey} is already '${status}'. ` +
        `Direct edits on paid settlements are strictly prohibited. You must create an accounting REVERSAL settlement instead.`
      );
    }
    return true;
  }

  /**
   * Creates a formal REVERSAL settlement adjustment for an already paid record.
   * Rather than editing history, double-entry financial principles mandate a compensating entry.
   * 
   * @param {Object} params
   * @param {Object} params.originalSettlement - The paid settlement being reversed/adjusted
   * @param {number} params.reversalAmount - Positive amount to reverse (will be recorded as negative payout)
   * @param {string} params.reason - Business justification
   * @param {string} [params.actor] - Admin issuing reversal
   * @returns {Object} Newly created reversal adjustment record
   */
  static createReversalAdjustment({ originalSettlement, reversalAmount, reason, actor = 'SuperAdmin' }) {
    if (!originalSettlement) {
      throw new Error('Original settlement required to issue reversal');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason required to create a settlement reversal adjustment');
    }

    const amount = round2(Math.abs(Number(reversalAmount) || originalSettlement.netPayout));
    const reversalRecord = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      idempotentKey: `REV_${originalSettlement.idempotentKey || originalSettlement.id}_${Date.now()}`,
      settlementType: originalSettlement.settlementType,
      recipientId: originalSettlement.recipientId || originalSettlement.entityId,
      originalSettlementId: originalSettlement.id,
      isReversal: true,
      grossAmount: -amount,
      deductions: 0.0,
      netPayout: -amount, // Compensating negative disbursement
      status: 'PENDING',
      reason,
      notes: `Reversal of settlement ${originalSettlement.id}. Reason: ${reason}`,
      createdAt: new Date().toISOString(),
    };

    // Log tamper-evident audit trail for this financial adjustment
    logAuditEvent({
      actor,
      action: AUDIT_ACTIONS.SETTLEMENT_REVERSAL,
      resourceType: 'SETTLEMENT',
      resourceId: originalSettlement.id,
      oldState: { netPayout: originalSettlement.netPayout, status: originalSettlement.status },
      newState: { reversalId: reversalRecord.id, negativePayout: reversalRecord.netPayout, reason },
    }).catch((err) => console.warn('[Settlement Reversal] Audit log warning:', err.message));

    return reversalRecord;
  }
}

module.exports = SettlementService;
