import { describe, it, expect } from 'vitest';
import {
  isRuralOrderEligible,
  getDeliveryBatch,
  calculateRevenueSplit,
  calculateDeliveryInflow,
  calculateNetEconomics,
  dispatchRuralBatch,
  getRuralBatchOrders,
  AGENT_SHARE_PERCENT,
  QUIKOOO_SHARE_PERCENT,
  DELIVERY_FEE_RATE,
  RURAL_CUTOFF,
} from '../src/api.js';

describe('Agent App & Rural Batch Logistics Tests', () => {
  describe('Rural Cutoff Engine (20:30 Eligible / 21:00 Closed)', () => {
    it('order at 20:30 is eligible for next-day morning dispatch', () => {
      expect(isRuralOrderEligible('20:30')).toBe(true);
    });

    it('order at 20:59 is eligible prior to cutoff lock', () => {
      expect(isRuralOrderEligible('20:59')).toBe(true);
    });

    it('order at 21:00 is strictly closed (cutoff lock reached)', () => {
      expect(isRuralOrderEligible('21:00')).toBe(false);
    });

    it('order at 21:01 or later is closed for next-day morning dispatch', () => {
      expect(isRuralOrderEligible('21:01')).toBe(false);
      expect(isRuralOrderEligible('21:30')).toBe(false);
      expect(isRuralOrderEligible('23:59')).toBe(false);
    });

    it('evaluates Date objects converted to Asia/Kolkata timezone', () => {
      // 2026-10-05 14:30:00 UTC = 20:00:00 Asia/Kolkata (+5:30) -> eligible true
      const eligibleDate = new Date('2026-10-05T14:30:00.000Z');
      expect(isRuralOrderEligible(eligibleDate)).toBe(true);

      // 2026-10-05 15:30:00 UTC = 21:00:00 Asia/Kolkata (+5:30) -> cutoff reached (false)
      const cutoffDate = new Date('2026-10-05T15:30:00.000Z');
      expect(isRuralOrderEligible(cutoffDate)).toBe(false);

      // 2026-10-05 16:00:00 UTC = 21:30:00 Asia/Kolkata (+5:30) -> past cutoff (false)
      const lateDate = new Date('2026-10-05T16:00:00.000Z');
      expect(isRuralOrderEligible(lateDate)).toBe(false);
    });

    it('throws error when invalid date string is provided', () => {
      expect(() => isRuralOrderEligible('invalid-date-format')).toThrow(
        /Invalid date\/time provided/
      );
    });

    it('honors custom cutoff parameter if passed', () => {
      expect(isRuralOrderEligible('19:45', '20:00')).toBe(true);
      expect(isRuralOrderEligible('20:00', '20:00')).toBe(false);
    });
  });

  describe('Rural Batch Window & Manifest Metadata (05:00 - 08:00)', () => {
    it('returns official 05:00 - 08:00 morning dispatch window', () => {
      const batch = getDeliveryBatch('2026-10-06');
      expect(batch.windowStart).toBe('05:00');
      expect(batch.windowEnd).toBe('08:00');
      expect(batch.windowLabel).toContain('05:00 - 08:00');
    });

    it('enforces Asia/Kolkata operational timezone', () => {
      const batch = getDeliveryBatch('2026-10-06');
      expect(batch.timezone).toBe('Asia/Kolkata');
    });

    it('generates deterministic batchId BATCH_YYYYMMDD_MORNING', () => {
      const batch = getDeliveryBatch('2026-10-06');
      expect(batch.batchId).toBe('BATCH_20261006_MORNING');
      expect(batch.deliveryDate).toBe('2026-10-06');
    });

    it('defaults delivery date to tomorrow when omitted', () => {
      const batch = getDeliveryBatch();
      expect(batch.deliveryDate).toBeDefined();
      expect(batch.batchId).toContain('_MORNING');
      expect(batch.windowStart).toBe('05:00');
      expect(batch.windowEnd).toBe('08:00');
    });

    it('accepts Date instance for deliveryDate parameter', () => {
      const date = new Date('2026-11-15T00:00:00.000Z');
      const batch = getDeliveryBatch(date);
      expect(batch.deliveryDate).toBe('2026-11-15');
      expect(batch.batchId).toBe('BATCH_20261115_MORNING');
    });
  });

  describe('Official 60/40 Revenue Split Engine', () => {
    it('splits canonical 13.94 net revenue pool into 8.36 Agent (60%) and 5.58 Quikooo (40%)', () => {
      const split = calculateRevenueSplit(13.94);

      expect(split.adjustedAmount).toBe(13.94);
      expect(split.agentPercent).toBe(60);
      expect(split.quikoooPercent).toBe(40);
      expect(split.agentShare).toBe(8.36); // 13.94 * 0.60 = 8.364 -> 8.36
      expect(split.quikoooShare).toBe(5.58); // 13.94 - 8.36 = 5.58
      expect(split.agentShare + split.quikoooShare).toBe(13.94);
    });

    it('balances exactly without single-cent rounding leakage', () => {
      const split = calculateRevenueSplit(100.0);
      expect(split.agentShare).toBe(60.0);
      expect(split.quikoooShare).toBe(40.0);
      expect(split.agentShare + split.quikoooShare).toBe(100.0);

      const split2 = calculateRevenueSplit(4767.48);
      // 4767.48 * 0.60 = 2860.488 -> 2860.49
      // 4767.48 - 2860.49 = 1906.99
      expect(split2.agentShare).toBe(2860.49);
      expect(split2.quikoooShare).toBe(1906.99);
      expect(split2.agentShare + split2.quikoooShare).toBe(4767.48);
    });

    it('handles zero or negative inputs cleanly', () => {
      const zero = calculateRevenueSplit(0);
      expect(zero.agentShare).toBe(0);
      expect(zero.quikoooShare).toBe(0);
    });

    it('supports custom percentage configurations', () => {
      const custom = calculateRevenueSplit(100, 70, 30);
      expect(custom.agentShare).toBe(70);
      expect(custom.quikoooShare).toBe(30);
    });
  });

  describe('Delivery Fee Inflow (25 * n) Kept Strictly Separate', () => {
    it('calculates 25 * n delivery inflow correctly', () => {
      const inflow1 = calculateDeliveryInflow(1);
      expect(inflow1.deliveryInflow).toBe(25.0);
      expect(inflow1.driverPayout).toBe(25.0);
      expect(inflow1.netDeliveryRetention).toBe(0.0);

      const inflow4 = calculateDeliveryInflow(4);
      expect(inflow4.deliveryInflow).toBe(100.0);
      expect(inflow4.driverPayout).toBe(100.0);

      const inflow342 = calculateDeliveryInflow(342);
      expect(inflow342.deliveryInflow).toBe(8550.0); // 342 * 25 = 8550
      expect(inflow342.driverPayout).toBe(8550.0);
    });

    it('flags delivery inflow as 100% pass-through and separate from platform pool', () => {
      const inflow = calculateDeliveryInflow(10);
      expect(inflow.isSeparateFromPlatformPool).toBe(true);
      expect(inflow.netDeliveryRetention).toBe(0);
    });

    it('handles string count or negative counts gracefully', () => {
      expect(calculateDeliveryInflow('5').deliveryInflow).toBe(125.0);
      expect(calculateDeliveryInflow(-2).deliveryInflow).toBe(0);
      expect(calculateDeliveryInflow(null).deliveryInflow).toBe(0);
    });

    it('holistic net economics isolates delivery inflow from agent 60% earnings', () => {
      const econ = calculateNetEconomics({
        ordersCount: 342,
        adjustedContributionPerOrder: 13.94,
        gmv: 46170.0,
      });

      // Platform contribution pool = 342 * 13.94 = 4767.48
      expect(econ.adjustedPool).toBe(4767.48);
      // Agent 60% share = 2860.49
      expect(econ.agentShare).toBe(2860.49);
      // Quikooo 40% share = 1906.99
      expect(econ.quikoooShare).toBe(1906.99);

      // Delivery inflow = 342 * 25 = 8550.0 (SEPARATE from agent commission pool)
      expect(econ.deliveryInflow).toBe(8550.0);
      expect(econ.driverPayout).toBe(8550.0);
      expect(econ.deliveryPassThrough).toBe(true);

      // Agent earnings are purely based on the 60% platform split, never inflated by delivery fees
      expect(econ.totalAgentEarnings).toBe(2860.49);
    });
  });

  describe('Rural Batch State Transition (SCHEDULED_FOR_NEXT_DAY -> READY_FOR_MORNING_DISPATCH)', () => {
    it('dispatches batch orders and updates status to READY_FOR_MORNING_DISPATCH', async () => {
      const initialOrders = await getRuralBatchOrders('2026-10-06');
      expect(initialOrders.length).toBeGreaterThan(0);
      expect(initialOrders[0].status).toBe('SCHEDULED_FOR_NEXT_DAY');

      const dispatchResult = await dispatchRuralBatch('BATCH_20261006_MORNING');
      expect(dispatchResult.success).toBe(true);
      expect(dispatchResult.transition).toBe(
        'SCHEDULED_FOR_NEXT_DAY -> READY_FOR_MORNING_DISPATCH'
      );
      expect(dispatchResult.dispatchedWindow).toBe('05:00 - 08:00');
    });
  });

  describe('Cutoff Countdown & Debounce Utilities (2026 Perf/UX)', () => {
    it('calculates remaining cutoff countdown correctly before 21:00 IST', async () => {
      const { calculateCutoffCountdown } = await import('../src/api.js');
      // 20:00:00 IST (14:30:00 UTC) -> 1 hour left
      const date = new Date('2026-10-05T14:30:00.000Z');
      const countdown = calculateCutoffCountdown(date);
      expect(countdown.isPassed).toBe(false);
      expect(countdown.hours).toBe(1);
      expect(countdown.minutes).toBe(0);
      expect(countdown.seconds).toBe(0);
      expect(countdown.totalSeconds).toBe(3600);
      expect(countdown.formatted).toBe('01h : 00m : 00s');
    });

    it('reports locked countdown when past 21:00 IST', async () => {
      const { calculateCutoffCountdown } = await import('../src/api.js');
      // 21:15:00 IST (15:45:00 UTC) -> Locked
      const date = new Date('2026-10-05T15:45:00.000Z');
      const countdown = calculateCutoffCountdown(date);
      expect(countdown.isPassed).toBe(true);
      expect(countdown.totalSeconds).toBe(0);
      expect(countdown.formatted).toContain('Locked');
    });

    it('debounce utility coalesces rapid calls within delay window', async () => {
      const { debounce } = await import('../src/api.js');
      let callCount = 0;
      const fn = debounce(() => {
        callCount++;
        return 'done';
      }, 50);

      const p1 = fn();
      const p2 = fn();
      const p3 = fn();

      const res = await p3;
      expect(res).toBe('done');
      expect(callCount).toBe(1);
    });
  });
});
