import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  paginateData,
  calculateKpiSum,
} from '../src/api.js';
import { paginateData as paginateHelper } from '../src/components/DataTable.jsx';
import { calculateKpiSum as kpiSumHelper } from '../src/components/KpiCard.jsx';

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

  describe('Admin Console UI & UX Helpers', () => {
    it('table paginate helper correctly slices pages with 20 items per page and handles bounds', () => {
      // 45 items mock array
      const items = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: `Record ${i + 1}` }));

      // Page 1 (20 items)
      const page1 = paginateData(items, 1, 20);
      expect(page1).toHaveLength(20);
      expect(page1[0].id).toBe(1);
      expect(page1[19].id).toBe(20);

      // Verify DataTable.jsx export works identically
      const helperPage1 = paginateHelper(items, 1, 20);
      expect(helperPage1).toHaveLength(20);
      expect(helperPage1[0].id).toBe(1);

      // Page 2 (20 items)
      const page2 = paginateData(items, 2, 20);
      expect(page2).toHaveLength(20);
      expect(page2[0].id).toBe(21);
      expect(page2[19].id).toBe(40);

      // Page 3 (remaining 5 items)
      const page3 = paginateData(items, 3, 20);
      expect(page3).toHaveLength(5);
      expect(page3[0].id).toBe(41);
      expect(page3[4].id).toBe(45);

      // Page out of bounds
      const page4 = paginateData(items, 4, 20);
      expect(page4).toHaveLength(0);

      // Edge cases: empty array and invalid page index
      expect(paginateData([], 1, 20)).toEqual([]);
      expect(paginateData(items, 0, 20)).toHaveLength(20);
    });

    it('KPI sum helper accurately calculates totals without floating point drift', () => {
      // Canonical financial items
      const sampleOrders = [
        { id: 'ord-1', gmv: 135.00, grossMargin: 15.00, agentShare: 8.36, quikoooShare: 5.58 },
        { id: 'ord-2', gmv: 270.00, grossMargin: 30.00, agentShare: 16.72, quikoooShare: 11.16 },
        { id: 'ord-3', gmv: 67.50, grossMargin: 7.50, agentShare: 4.18, quikoooShare: 2.79 },
      ];

      // Sum GMV (135 + 270 + 67.50 = 472.50)
      const totalGmv = calculateKpiSum(sampleOrders, 'gmv');
      expect(totalGmv).toBe(472.50);

      // Verify KpiCard.jsx export works identically
      const helperGmv = kpiSumHelper(sampleOrders, 'gmv');
      expect(helperGmv).toBe(472.50);

      // Sum Gross Margin (15 + 30 + 7.50 = 52.50)
      const totalGross = calculateKpiSum(sampleOrders, 'grossMargin');
      expect(totalGross).toBe(52.50);

      // Sum Agent Share (8.36 + 16.72 + 4.18 = 29.26)
      const totalAgent = calculateKpiSum(sampleOrders, 'agentShare');
      expect(totalAgent).toBe(29.26);

      // Sum Quikooo Share (5.58 + 11.16 + 2.79 = 19.53)
      const totalQuikooo = calculateKpiSum(sampleOrders, 'quikoooShare');
      expect(totalQuikooo).toBe(19.53);

      // Sum Agent + Quikooo == Total Net (29.26 + 19.53 = 48.79)
      expect(Math.round((totalAgent + totalQuikooo) * 100) / 100).toBe(48.79);

      // Edge cases: empty array and array of raw numbers
      expect(calculateKpiSum([])).toBe(0);
      expect(calculateKpiSum([13.94, 27.88, 8.36])).toBe(50.18);
    });

    it('command palette action list is non-empty and includes essential admin routes', async () => {
      const { DEFAULT_COMMANDS } = await import('../src/components/CommandPalette.jsx');
      expect(Array.isArray(DEFAULT_COMMANDS)).toBe(true);
      expect(DEFAULT_COMMANDS.length).toBeGreaterThan(0);

      // Verify essential routes exist
      const paths = DEFAULT_COMMANDS.map((c) => c.path).filter(Boolean);
      expect(paths).toContain('/admin');
      expect(paths).toContain('/admin/overview');
      expect(paths).toContain('/admin/zones');
      expect(paths).toContain('/admin/finance');
      expect(paths).toContain('/admin/settlements');
      expect(paths).toContain('/admin/users');
      expect(paths).toContain('/admin/audit');

      // Verify each command has an id, label, and keywords
      DEFAULT_COMMANDS.forEach((cmd) => {
        expect(cmd.id).toBeDefined();
        expect(cmd.label).toBeDefined();
        expect(Array.isArray(cmd.keywords)).toBe(true);
        expect(cmd.keywords.length).toBeGreaterThan(0);
      });
    });

    it('URL query persistence sort parser correctly converts sort query strings', async () => {
      const { parseSortParam, formatSortParam } = await import('../src/components/DataTable.jsx');
      expect(parseSortParam('account:desc')).toEqual({ key: 'account', direction: 'desc' });
      expect(parseSortParam('account:asc')).toEqual({ key: 'account', direction: 'asc' });
      expect(parseSortParam('-account')).toEqual({ key: 'account', direction: 'desc' });
      expect(parseSortParam('account')).toEqual({ key: 'account', direction: 'asc' });
      expect(parseSortParam('')).toEqual({ key: null, direction: 'asc' });
      expect(parseSortParam(null)).toEqual({ key: null, direction: 'asc' });

      expect(formatSortParam({ key: 'debit', direction: 'desc' })).toBe('debit:desc');
      expect(formatSortParam({ key: 'debit', direction: 'asc' })).toBe('debit:asc');
      expect(formatSortParam(null)).toBe('');
      expect(formatSortParam({ key: null })).toBe('');
    });
  });

  describe('Authentication & Protected API Handling', () => {
    let mockStorage = {};
    const originalFetch = global.fetch;
    const originalWindow = global.window;
    const originalLocalStorage = global.localStorage;

    beforeEach(() => {
      mockStorage = {};
      global.localStorage = {
        getItem: vi.fn((key) => mockStorage[key] || null),
        setItem: vi.fn((key, val) => {
          mockStorage[key] = String(val);
        }),
        removeItem: vi.fn((key) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          mockStorage = {};
        }),
      };
      global.window = {
        localStorage: global.localStorage,
        location: {
          pathname: '/admin/overview',
          href: '/admin/overview',
        },
        dispatchEvent: vi.fn(),
      };
    });

    afterEach(() => {
      global.fetch = originalFetch;
      global.window = originalWindow;
      global.localStorage = originalLocalStorage;
    });

    it('auth header attached when token stored', async () => {
      const mockToken = 'jwt-token-admin-12345';
      global.localStorage.setItem(
        'quikooo_admin_auth',
        JSON.stringify({
          token: mockToken,
          user: { id: 'usr-1', email: 'admin@quikooo.com', role: 'SUPER_ADMIN' },
        })
      );

      let capturedOptions = null;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedOptions = options;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { logs: [] } }),
        });
      });

      await fetchAuditLogs();

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/admin/audit-logs', expect.anything());
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions.headers).toBeDefined();
      expect(capturedOptions.headers.Authorization).toBe(`Bearer ${mockToken}`);
    });

    it('401 clears auth and triggers redirect to /admin/login', async () => {
      global.localStorage.setItem(
        'quikooo_admin_auth',
        JSON.stringify({
          token: 'expired-token',
          user: { id: 'usr-1', role: 'SUPER_ADMIN' },
        })
      );

      let redirectedHref = null;
      global.window.location = {
        pathname: '/admin/audit',
        get href() {
          return redirectedHref || '/admin/audit';
        },
        set href(val) {
          redirectedHref = val;
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Authentication required' }),
      });

      await expect(fetchAuditLogs()).rejects.toThrow();

      // Auth must be cleared from storage
      expect(global.localStorage.getItem('quikooo_admin_auth')).toBeNull();
      // Redirect must be triggered to /admin/login
      expect(redirectedHref).toBe('/admin/login');
    });
  });
});

