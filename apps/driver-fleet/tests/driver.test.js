import { describe, it, expect } from 'vitest';
import {
  calculateDriverPayout,
  validateDeliveryOtp,
  pickupDeliveryTask,
  completeDeliveryTask,
  DELIVERY_PARTNER_PAYOUT_RATE,
} from '../src/api.js';

describe('Driver Fleet Tests', () => {
  describe('Official 25 * n Delivery Partner Payout Formula', () => {
    it('calculates 0 payout for 0 deliveries', () => {
      expect(calculateDriverPayout(0)).toBe(0);
    });

    it('calculates 25 payout for 1 delivery', () => {
      expect(calculateDriverPayout(1)).toBe(25);
    });

    it('calculates 100 payout for 4 deliveries (4 * 25 = 100)', () => {
      expect(calculateDriverPayout(4)).toBe(100);
    });

    it('calculates 250 payout for 10 deliveries (10 * 25 = 250)', () => {
      expect(calculateDriverPayout(10)).toBe(250);
    });

    it('handles string count representation ("5" -> 125)', () => {
      expect(calculateDriverPayout('5')).toBe(125);
    });

    it('handles negative or invalid delivery counts gracefully', () => {
      expect(calculateDriverPayout(-3)).toBe(0);
      expect(calculateDriverPayout(null)).toBe(0);
      expect(calculateDriverPayout(undefined)).toBe(0);
    });

    it('supports custom payout rate per delivery when configured', () => {
      expect(calculateDriverPayout(4, 30)).toBe(120);
      expect(calculateDriverPayout(2, DELIVERY_PARTNER_PAYOUT_RATE)).toBe(50);
    });
  });

  describe('Two-Step Handshake OTP Required Logic', () => {
    it('accepts valid 4-digit numeric OTP strings', () => {
      expect(validateDeliveryOtp('4512')).toBe(true);
      expect(validateDeliveryOtp('0000')).toBe(true);
      expect(validateDeliveryOtp('9999')).toBe(true);
      expect(validateDeliveryOtp(1234)).toBe(true);
    });

    it('rejects empty, null, or undefined OTP', () => {
      expect(validateDeliveryOtp('')).toBe(false);
      expect(validateDeliveryOtp(null)).toBe(false);
      expect(validateDeliveryOtp(undefined)).toBe(false);
    });

    it('rejects OTP with length different than 4 digits', () => {
      expect(validateDeliveryOtp('1')).toBe(false);
      expect(validateDeliveryOtp('12')).toBe(false);
      expect(validateDeliveryOtp('123')).toBe(false);
      expect(validateDeliveryOtp('12345')).toBe(false);
    });

    it('rejects non-numeric characters', () => {
      expect(validateDeliveryOtp('abcd')).toBe(false);
      expect(validateDeliveryOtp('12a4')).toBe(false);
      expect(validateDeliveryOtp('4 12')).toBe(false);
      expect(validateDeliveryOtp('####')).toBe(false);
    });

    it('pickupDeliveryTask requires valid 4-digit OTP', async () => {
      await expect(pickupDeliveryTask('task-1', '')).rejects.toThrow(
        /Valid 4-digit vendor pickup OTP is required/
      );
      await expect(pickupDeliveryTask('task-1', '12')).rejects.toThrow(
        /Valid 4-digit vendor pickup OTP is required/
      );
      await expect(pickupDeliveryTask('task-1', 'abcd')).rejects.toThrow(
        /Valid 4-digit vendor pickup OTP is required/
      );

      const result = await pickupDeliveryTask('task-1', '4512');
      expect(result.status).toBe('PICKED_UP');
      expect(result.otpVerified).toBe(true);
    });

    it('completeDeliveryTask requires valid 4-digit OTP and credits 25 payout', async () => {
      await expect(completeDeliveryTask('task-1', '')).rejects.toThrow(
        /Valid 4-digit customer delivery OTP is required/
      );
      await expect(completeDeliveryTask('task-1', '99')).rejects.toThrow(
        /Valid 4-digit customer delivery OTP is required/
      );

      const result = await completeDeliveryTask('task-1', '8934');
      expect(result.status).toBe('DELIVERED');
      expect(result.otpVerified).toBe(true);
      expect(result.payoutEarned).toBe(25);
    });
  });

  describe('2026 Driver Cockpit Features (Earnings Progress Ring & Debounce)', () => {
    it('calculateEarningsProgress computes correct percentages and monetary figures for target ring', () => {
      const { calculateEarningsProgress } = require('../src/api.js');

      // 8 of 16 completed = 50%
      const half = calculateEarningsProgress(8, 16);
      expect(half.completed).toBe(8);
      expect(half.target).toBe(16);
      expect(half.earned).toBe(200); // 8 * 25
      expect(half.targetAmount).toBe(400); // 16 * 25
      expect(half.percent).toBe(50);

      // 16 of 16 completed = 100%
      const full = calculateEarningsProgress(16, 16);
      expect(full.percent).toBe(100);
      expect(full.earned).toBe(400);

      // Overachieved caps at 100%
      const over = calculateEarningsProgress(20, 16);
      expect(over.percent).toBe(100);
      expect(over.earned).toBe(500);
    });

    it('debounce utility coalesces driver status and search calls within window', async () => {
      const { debounce } = require('../src/api.js');
      let executions = 0;
      const debouncedAction = debounce((x) => {
        executions += 1;
        return x * 10;
      }, 50);

      debouncedAction(1);
      debouncedAction(2);
      const res = await debouncedAction(3);

      expect(executions).toBe(1);
      expect(res).toBe(30);
    });
  });
});

