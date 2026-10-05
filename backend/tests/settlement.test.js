const SettlementService = require('../src/services/SettlementService');
const { logAuditEvent, getAuditLogs, AUDIT_ACTIONS } = require('../src/middleware/audit');
const { redactSecrets, createRateLimiter } = require('../src/security');

describe('Backend Hardening: SettlementService, Audit & Security Tests', () => {
  describe('SettlementService Calculations & Safeguards', () => {
    test('Vendor settlement: food - commission - adjust (canonical 100 - 10 = 90)', () => {
      const res = SettlementService.calculateVendorSettlement({
        foodTotal: 100,
        commissionPercent: 10,
        adjustments: 0,
      });

      expect(res.foodTotal).toBe(100.0);
      expect(res.commissionAmount).toBe(10.0);
      expect(res.netPayout).toBe(90.0);
    });

    test('Agent settlement: adjusted * 0.6 (canonical 13.94 -> 8.36)', () => {
      const res = SettlementService.calculateAgentSettlement({
        netAdjustedPool: 13.94,
        agentPercent: 60,
      });

      expect(res.netAdjustedPool).toBe(13.94);
      expect(res.netPayout).toBe(8.36);
    });

    test('Delivery settlement: 25 * n', () => {
      expect(SettlementService.calculateDeliverySettlement({ deliveryCount: 1 }).netPayout).toBe(25.0);
      expect(SettlementService.calculateDeliverySettlement({ deliveryCount: 4 }).netPayout).toBe(100.0);
      expect(SettlementService.calculateDeliverySettlement({ deliveryCount: 10 }).netPayout).toBe(250.0);
    });

    test('Idempotent key generation combines period + entity', () => {
      const key = SettlementService.generateIdempotentKey({
        settlementType: 'VENDOR',
        entityId: 'v-99',
        periodStart: '2026-10-01T00:00:00.000Z',
        periodEnd: '2026-10-07T23:59:59.000Z',
      });

      expect(key).toBe('SETTLE_VENDOR_v-99_2026-10-01_2026-10-07');
    });

    test('No edit-after-paid safeguard: assertSettlementMutable throws for paid settlement', () => {
      expect(() => {
        SettlementService.assertSettlementMutable({ id: 'stl-1', status: 'PAID' });
      }).toThrow(/Financial Safeguard Violation/);

      expect(() => {
        SettlementService.assertSettlementMutable({ id: 'stl-2', status: 'PROCESSED' });
      }).toThrow(/Financial Safeguard Violation/);

      expect(SettlementService.assertSettlementMutable({ id: 'stl-3', status: 'PENDING' })).toBe(true);
    });

    test('Creates compensating reversal adjustment instead of editing paid record', () => {
      const original = {
        id: 'stl-paid-001',
        idempotentKey: 'SETTLE_VENDOR_v-01_2026-10-01_2026-10-07',
        settlementType: 'VENDOR',
        recipientId: 'v-01',
        netPayout: 90.0,
        status: 'PAID',
      };

      const reversal = SettlementService.createReversalAdjustment({
        originalSettlement: original,
        reversalAmount: 90.0,
        reason: 'Order cancelled post-settlement batch',
        actor: 'FinanceAdmin',
      });

      expect(reversal.originalSettlementId).toBe('stl-paid-001');
      expect(reversal.isReversal).toBe(true);
      expect(reversal.netPayout).toBe(-90.0);
      expect(reversal.grossAmount).toBe(-90.0);
      expect(reversal.status).toBe('PENDING');
      expect(reversal.idempotentKey).toContain('REV_');
    });
  });

  describe('Audit Logging System', () => {
    test('Logs audit mutations with actor, entity, old, new, and timestamp', async () => {
      const log = await logAuditEvent({
        userId: 'usr-admin-1',
        actor: 'SuperAdmin',
        action: AUDIT_ACTIONS.COMMISSION_CHANGE,
        resourceType: 'COMMISSION',
        resourceId: 'RATE_RESTAURANT',
        oldState: 10,
        newState: 12,
      });

      expect(log.actor).toBe('SuperAdmin');
      expect(log.action).toBe(AUDIT_ACTIONS.COMMISSION_CHANGE);
      expect(log.resource_type).toBe('COMMISSION');
      expect(log.old).toBe(10);
      expect(log.new).toBe(12);
      expect(log.created_at).toBeDefined();

      const query = await getAuditLogs({ action: AUDIT_ACTIONS.COMMISSION_CHANGE });
      expect(query.logs.length).toBeGreaterThan(0);
      expect(query.logs[0].action).toBe(AUDIT_ACTIONS.COMMISSION_CHANGE);
    });
  });

  describe('Security Hardening Utilities', () => {
    test('redactSecrets masks passwords, JWT secrets, OTPs, and tokens', () => {
      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SuperSecretPassword123!',
        jwt_secret: 'my-jwt-key',
        otp: '4512',
        nested: {
          token: 'bearer-xyz',
          publicInfo: 'visible',
        },
      };

      const sanitized = redactSecrets(payload);
      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.password).toBe('[REDACTED_SECRET]');
      expect(sanitized.jwt_secret).toBe('[REDACTED_SECRET]');
      expect(sanitized.otp).toBe('[REDACTED_SECRET]');
      expect(sanitized.nested.token).toBe('[REDACTED_SECRET]');
      expect(sanitized.nested.publicInfo).toBe('visible');
    });

    test('rate limiter middleware throttles excessive requests', () => {
      const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 2 });
      let status = 200;
      let body = null;

      const mockReq = { ip: '192.168.1.100', headers: {} };
      const mockRes = {
        setHeader: () => {},
        status: (code) => {
          status = code;
          return { json: (b) => { body = b; } };
        },
      };

      // Request 1
      limiter(mockReq, mockRes, () => {});
      expect(status).toBe(200);

      // Request 2
      limiter(mockReq, mockRes, () => {});
      expect(status).toBe(200);

      // Request 3 -> Rate limit exceeded
      limiter(mockReq, mockRes, () => {});
      expect(status).toBe(429);
      expect(body.error).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
