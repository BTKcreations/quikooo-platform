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

    it('OTP paste/advance helper parses clipboard text and manages auto-advance focus navigation', () => {
      const { parseOtpPaste, getNextOtpIndex } = require('../src/api.js');

      // 4-digit valid paste
      const validPaste = parseOtpPaste('4512');
      expect(validPaste.value).toBe('4512');
      expect(validPaste.digits).toEqual(['4', '5', '1', '2']);
      expect(validPaste.isComplete).toBe(true);
      expect(validPaste.nextIndex).toBe(3);

      // Paste formatted text with non-numeric noise
      const noisyPaste = parseOtpPaste('OTP-89 34');
      expect(noisyPaste.value).toBe('8934');
      expect(noisyPaste.digits).toEqual(['8', '9', '3', '4']);
      expect(noisyPaste.isComplete).toBe(true);

      // Short / partial paste
      const partial = parseOtpPaste('12');
      expect(partial.value).toBe('12');
      expect(partial.digits).toEqual(['1', '2', '', '']);
      expect(partial.isComplete).toBe(false);
      expect(partial.nextIndex).toBe(2);

      // Long paste truncated to 4
      const longPaste = parseOtpPaste('123456');
      expect(longPaste.value).toBe('1234');
      expect(longPaste.digits).toEqual(['1', '2', '3', '4']);
      expect(longPaste.isComplete).toBe(true);

      // Empty or null paste
      expect(parseOtpPaste('')).toEqual({
        digits: ['', '', '', ''],
        value: '',
        nextIndex: 0,
        isComplete: false,
      });

      // Auto-advance navigation on forward digit input
      expect(getNextOtpIndex(0, 'input', '4', 4)).toBe(1);
      expect(getNextOtpIndex(1, 'input', '5', 4)).toBe(2);
      expect(getNextOtpIndex(2, 'input', '1', 4)).toBe(3);
      expect(getNextOtpIndex(3, 'input', '2', 4)).toBe(3); // Capped at 3

      // Backspace moves focus back only when current box is empty
      expect(getNextOtpIndex(3, 'backspace', '', 4)).toBe(2);
      expect(getNextOtpIndex(1, 'backspace', '', 4)).toBe(0);
      expect(getNextOtpIndex(0, 'backspace', '', 4)).toBe(0);
      expect(getNextOtpIndex(2, 'backspace', '9', 4)).toBe(2); // Non-empty maintains index
    });

    it('earnings ring pct calc computes percentages and SVG stroke dashoffsets for target ring', () => {
      const { calculateRingPercentage, calculateRingOffset } = require('../src/api.js');

      // Percentage calculation across milestones
      expect(calculateRingPercentage(0, 16)).toBe(0);
      expect(calculateRingPercentage(4, 16)).toBe(25);
      expect(calculateRingPercentage(8, 16)).toBe(50);
      expect(calculateRingPercentage(12, 16)).toBe(75);
      expect(calculateRingPercentage(16, 16)).toBe(100);

      // Overachieved target capped at 100%
      expect(calculateRingPercentage(20, 16)).toBe(100);
      expect(calculateRingPercentage(32, 16)).toBe(100);

      // Graceful handling of invalid / negative inputs
      expect(calculateRingPercentage(-5, 16)).toBe(0);
      expect(calculateRingPercentage(null, 16)).toBe(0);
      expect(calculateRingPercentage(undefined, 16)).toBe(0);

      // SVG Stroke dashoffset calculation
      const radius = 38;
      const circumference = 2 * Math.PI * radius;

      // At 0%: offset equals circumference (full track empty)
      expect(calculateRingOffset(0, radius)).toBeCloseTo(circumference, 3);

      // At 50%: offset is half circumference
      expect(calculateRingOffset(50, radius)).toBeCloseTo(circumference * 0.5, 3);

      // At 100%: offset is 0 (full track filled)
      expect(calculateRingOffset(100, radius)).toBeCloseTo(0, 3);

      // At >100%: clamped to 0
      expect(calculateRingOffset(125, radius)).toBeCloseTo(0, 3);
    });

    it('driver command palette action list is non-empty and includes rider routes', async () => {
      const { DEFAULT_COMMANDS } = await import('../src/components/CommandPalette.jsx');
      expect(Array.isArray(DEFAULT_COMMANDS)).toBe(true);
      expect(DEFAULT_COMMANDS.length).toBeGreaterThan(0);

      const paths = DEFAULT_COMMANDS.map((c) => c.path).filter(Boolean);
      expect(paths).toContain('/driver/tasks');
      expect(paths).toContain('/driver/duty');
      expect(paths).toContain('/driver/payout');

      DEFAULT_COMMANDS.forEach((cmd) => {
        expect(cmd.id).toBeDefined();
        expect(cmd.label).toBeDefined();
        expect(cmd.keywords.length).toBeGreaterThan(0);
      });
    });

    it('paginate helper correctly slices list collections with first 30 items per page', async () => {
      const { paginateHelper, paginateList } = await import('../src/lib/paginate.js');
      const testTasks = Array.from({ length: 65 }, (_, i) => ({ id: `task-${i + 1}`, orderNumber: `QK-${i + 1}` }));

      // Page 1: 30 items
      const page1 = paginateHelper(testTasks, 1, 30);
      expect(page1).toHaveLength(30);
      expect(page1[0].id).toBe('task-1');
      expect(page1[29].id).toBe('task-30');

      // Page 2: 30 items
      const page2 = paginateHelper(testTasks, 2, 30);
      expect(page2).toHaveLength(30);
      expect(page2[0].id).toBe('task-31');
      expect(page2[29].id).toBe('task-60');

      // Page 3: 5 remaining items
      const page3 = paginateHelper(testTasks, 3, 30);
      expect(page3).toHaveLength(5);
      expect(page3[0].id).toBe('task-61');
      expect(page3[4].id).toBe('task-65');

      // Page 4: empty
      expect(paginateHelper(testTasks, 4, 30)).toHaveLength(0);

      // Edge cases
      expect(paginateHelper([], 1, 30)).toEqual([]);
      expect(paginateHelper(testTasks, 0, 30)).toHaveLength(30);

      // paginateList returns first 30 items
      const first30 = paginateList(testTasks, 30);
      expect(first30).toHaveLength(30);
      expect(first30[0].id).toBe('task-1');
    });
  });
});



