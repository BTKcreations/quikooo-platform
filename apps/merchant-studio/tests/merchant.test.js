import { describe, it, expect } from 'vitest';
import {
  buildTransitionPayload,
  calculateSettlement,
  MERCHANT_TRANSITIONS,
} from '../src/api.js';

describe('Merchant Studio Tests', () => {
  describe('Transition Payload Builder & Kitchen State Machine', () => {
    it('builds valid payload for ORDER_PLACED -> VENDOR_ACCEPTED', () => {
      const payload = buildTransitionPayload(
        'ORDER_PLACED',
        'VENDOR_ACCEPTED',
        'Kitchen accepted order'
      );

      expect(payload).toEqual({
        currentStatus: 'ORDER_PLACED',
        nextStatus: 'VENDOR_ACCEPTED',
        notes: 'Kitchen accepted order',
      });
    });

    it('builds valid payload for VENDOR_ACCEPTED -> PREPARING', () => {
      const payload = buildTransitionPayload('VENDOR_ACCEPTED', 'PREPARING');

      expect(payload.currentStatus).toBe('VENDOR_ACCEPTED');
      expect(payload.nextStatus).toBe('PREPARING');
      expect(payload.notes).toContain('Merchant Studio POS');
    });

    it('builds valid payload for PREPARING -> READY_FOR_PICKUP', () => {
      const payload = buildTransitionPayload('PREPARING', 'READY_FOR_PICKUP');

      expect(payload.currentStatus).toBe('PREPARING');
      expect(payload.nextStatus).toBe('READY_FOR_PICKUP');
    });

    it('enforces canonical kitchen progression ORDER_PLACED -> VENDOR_ACCEPTED -> PREPARING -> READY_FOR_PICKUP', () => {
      expect(MERCHANT_TRANSITIONS['ORDER_PLACED']).toBe('VENDOR_ACCEPTED');
      expect(MERCHANT_TRANSITIONS['VENDOR_ACCEPTED']).toBe('PREPARING');
      expect(MERCHANT_TRANSITIONS['PREPARING']).toBe('READY_FOR_PICKUP');
    });

    it('throws error when jumping states out of order (e.g. ORDER_PLACED to READY_FOR_PICKUP)', () => {
      expect(() => {
        buildTransitionPayload('ORDER_PLACED', 'READY_FOR_PICKUP');
      }).toThrow(/Invalid merchant transition/);
    });

    it('throws error when currentStatus or nextStatus is missing', () => {
      expect(() => buildTransitionPayload('', 'VENDOR_ACCEPTED')).toThrow();
      expect(() => buildTransitionPayload('ORDER_PLACED', '')).toThrow();
    });
  });

  describe('Official 100 -> 90 Vendor Settlement Calculation', () => {
    it('calculates canonical settlement 90 for 100 original price with 10% commission', () => {
      const result = calculateSettlement(100, 10);

      expect(result.originalPrice).toBe(100);
      expect(result.commissionPercent).toBe(10);
      expect(result.commissionAmount).toBe(10);
      expect(result.vendorSettlement).toBe(90); // 100 - 10 = 90
    });

    it('accepts options object { originalPrice: 100, commissionPercent: 10 } and produces 90', () => {
      const result = calculateSettlement({ originalPrice: 100, commissionPercent: 10 });

      expect(result.originalPrice).toBe(100);
      expect(result.commissionAmount).toBe(10);
      expect(result.vendorSettlement).toBe(90);
    });

    it('scales linearly for higher or multiple order amounts (200 -> 180, 50 -> 45)', () => {
      const doubleOrder = calculateSettlement(200, 10);
      expect(doubleOrder.commissionAmount).toBe(20);
      expect(doubleOrder.vendorSettlement).toBe(180);

      const smallOrder = calculateSettlement(50, 10);
      expect(smallOrder.commissionAmount).toBe(5);
      expect(smallOrder.vendorSettlement).toBe(45);
    });

    it('handles decimal values with strict 2-decimal rounding', () => {
      const item = calculateSettlement(155.50, 10);
      // 155.50 * 0.10 = 15.55 commission, 155.50 - 15.55 = 139.95 settlement
      expect(item.commissionAmount).toBe(15.55);
      expect(item.vendorSettlement).toBe(139.95);
    });

    it('handles zero or invalid input gracefully', () => {
      const zero = calculateSettlement(0);
      expect(zero.originalPrice).toBe(0);
      expect(zero.commissionAmount).toBe(0);
      expect(zero.vendorSettlement).toBe(0);
    });
  });
});
