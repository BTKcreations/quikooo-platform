import { describe, it, expect } from 'vitest';
import {
  calculateOrderLedger,
  calculateRevenueSplit,
  reconcileLedger,
  calculateVendorSettlement,
  calculateAgentSettlement,
  calculateDeliverySettlement,
  generateSettlementIdempotentKey,
  validateAuditEntry,
  logAuditEventLocal,
  fetchAuditLogs,
  MOCK_AUDIT_LOGS,
  MOCK_SETTLEMENTS,
  processSettlement,
} from '../src/api.js';

describe('Admin Console Tests', () => {
  describe('Ledger Reconciliation Engine', () => {
    it('canonical order 100 produces exact economic breakdown: commission 10, gross 15, tax 3.06, net 13.94, agent 8.36, quikooo 5.58, delivery 25/25', () => {
      const ledger = calculateOrderLedger({
        originalPrice: 100,
        markupPercent: 5,
        commissionPercent: 10,
        platformFee: 5,
        deliveryFee: 25,
        deliveryPayout: 25,
        taxAmount: 3.06,
        netAmount: 13.94,
      });

      expect(ledger.originalPrice).toBe(100.0);
      expect(ledger.menuMarkup).toBe(5.0);
      expect(ledger.customerSubtotal).toBe(105.0);
      expect(ledger.commission).toBe(10.0);
      expect(ledger.platformFee).toBe(5.0);
      expect(ledger.deliveryFee).toBe(25.0);
      expect(ledger.deliveryPayout).toBe(25.0);
      expect(ledger.customerPayable).toBe(135.0); // 105 + 5 + 25
      expect(ledger.vendorSettlement).toBe(90.0); // 100 - 10
      expect(ledger.grossRevenue).toBe(15.0); // 5 + 10
      expect(ledger.taxAmount).toBe(3.06);
      expect(ledger.netAmount).toBe(13.94);
      expect(ledger.agentShare).toBe(8.36); // 13.94 * 0.60 = 8.364 -> 8.36
      expect(ledger.quikoooShare).toBe(5.58); // 13.94 - 8.36 = 5.58
    });

    it('ledger reconciliation: sum agent + quikooo == net (8.36 + 5.58 == 13.94)', () => {
      const ledger = calculateOrderLedger({ originalPrice: 100 });
      const recon = reconcileLedger(ledger);

      expect(recon.splitMatchesNet).toBe(true);
      expect(recon.agentPlusQuikooo).toBe(13.94);
      expect(recon.netAmount).toBe(13.94);
      expect(ledger.agentShare + ledger.quikoooShare).toBe(ledger.netAmount);
    });

    it('enforces exact split equality with zero rounding drift across multiple order amounts', () => {
      const amounts = [13.94, 27.88, 50.0, 100.0, 4767.48, 12500.35];

      amounts.forEach((amt) => {
        const split = calculateRevenueSplit(amt);
        const sum = Math.round((split.agentShare + split.quikoooShare) * 100) / 100;
        expect(sum).toBe(amt);
      });
    });

    it('verifies double-entry ledger balance: total debits == total credits', () => {
      const ledger = calculateOrderLedger({ originalPrice: 100 });
      const recon = reconcileLedger(ledger);

      expect(recon.isBalanced).toBe(true);
      expect(recon.totalDebits).toBe(recon.totalCredits);
      expect(recon.difference).toBe(0.0);
    });

    it('keeps delivery fee inflow (25) and payout (25) 100% separate from platform margin pool', () => {
      const ledger = calculateOrderLedger({ originalPrice: 100 });
      expect(ledger.deliveryFee).toBe(25.0);
      expect(ledger.deliveryPayout).toBe(25.0);
      // Net pool only consists of platform margin less tax
      expect(ledger.netAmount).toBe(13.94);
    });
  });

  describe('Settlement Calculations & Safeguards', () => {
    it('settlement vendor == 90 (canonical food 100 - 10% commission = 90.00)', () => {
      const settlement = calculateVendorSettlement({
        foodTotal: 100,
        commissionPercent: 10,
        adjustments: 0,
      });

      expect(settlement.foodTotal).toBe(100.0);
      expect(settlement.commissionAmount).toBe(10.0);
      expect(settlement.netPayout).toBe(90.0);
    });

    it('handles vendor deductions and adjustments accurately', () => {
      const settlement = calculateVendorSettlement({
        foodTotal: 250,
        commissionPercent: 10,
        adjustments: 15,
      });

      // 250 - 25 commission - 15 adjustment = 210
      expect(settlement.commissionAmount).toBe(25.0);
      expect(settlement.adjustments).toBe(15.0);
      expect(settlement.netPayout).toBe(210.0);
    });

    it('agent settlement is calculated as adjusted pool * 0.6 (13.94 -> 8.36)', () => {
      const agentSettle = calculateAgentSettlement({ netAdjustedPool: 13.94, agentPercent: 60 });
      expect(agentSettle.netPayout).toBe(8.36);
    });

    it('delivery partner settlement follows 25 * n formula', () => {
      expect(calculateDeliverySettlement({ deliveryCount: 1 }).netPayout).toBe(25.0);
      expect(calculateDeliverySettlement({ deliveryCount: 4 }).netPayout).toBe(100.0);
      expect(calculateDeliverySettlement({ deliveryCount: 10 }).netPayout).toBe(250.0);
    });

    it('generates deterministic idempotent key combining period + entity', () => {
      const key = generateSettlementIdempotentKey({
        type: 'VENDOR',
        recipientId: 'v-101',
        periodStart: '2026-10-01T00:00:00.000Z',
        periodEnd: '2026-10-07T23:59:59.000Z',
      });

      expect(key).toBe('SETTLE_VENDOR_v-101_2026-10-01_2026-10-07');
    });

    it('enforces no-edit-after-paid safeguard and prevents mutating paid settlements', async () => {
      // Find or get a paid settlement
      const paidSettlement = MOCK_SETTLEMENTS.find((s) => s.status === 'PAID');
      expect(paidSettlement).toBeDefined();

      await expect(processSettlement(paidSettlement.id)).rejects.toThrow(
        /Settlement already PAID\. Direct edit blocked; use a reversal adjustment\./
      );
    });
  });

  describe('Audit Trail Verification', () => {
    it('audit fields present: actor, entity, old, new, and time', () => {
      MOCK_AUDIT_LOGS.forEach((log) => {
        expect(log.actor).toBeDefined();
        expect(log.actor.length).toBeGreaterThan(0);

        expect(log.entity).toBeDefined();
        expect(log.entity.length).toBeGreaterThan(0);

        expect(log.old).toBeDefined();
        expect(log.new).toBeDefined();

        expect(log.time).toBeDefined();
        expect(new Date(log.time).toString()).not.toBe('Invalid Date');

        expect(validateAuditEntry(log)).toBe(true);
      });
    });

    it('validateAuditEntry returns false when any required field is missing', () => {
      expect(validateAuditEntry(null)).toBe(false);
      expect(validateAuditEntry({})).toBe(false);
      expect(validateAuditEntry({ actor: 'Admin', entity: 'ZONE', old: 'A' })).toBe(false); // missing new and time
      expect(validateAuditEntry({ entity: 'ZONE', old: 'A', new: 'B', time: '2026-10-05' })).toBe(false); // missing actor
      expect(validateAuditEntry({ actor: 'Admin', old: 'A', new: 'B', time: '2026-10-05' })).toBe(false); // missing entity
    });

    it('logAuditEventLocal creates valid audit entry with all required fields', () => {
      const entry = logAuditEventLocal({
        actor: 'AdminUser (admin@quikooo.com)',
        entity: 'CONFIG:RESTAURANT_MENU_ADJUSTMENT_PERCENT',
        old: '5%',
        new: '6%',
        action: 'MARKUP_CHANGE',
      });

      expect(entry.actor).toBe('AdminUser (admin@quikooo.com)');
      expect(entry.entity).toBe('CONFIG:RESTAURANT_MENU_ADJUSTMENT_PERCENT');
      expect(entry.old).toBe('5%');
      expect(entry.new).toBe('6%');
      expect(entry.time).toBeDefined();
      expect(validateAuditEntry(entry)).toBe(true);
    });
  });
});
