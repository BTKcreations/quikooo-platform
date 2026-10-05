const PricingService = require('../src/services/PricingService');
const TaxService = require('../src/services/TaxService');
const FinancialLedgerService = require('../src/services/FinancialLedgerService');
const ZoneService = require('../src/services/ZoneService');

describe('Official Pricing & Business Model Tests (Phase 1)', () => {
  describe('Restaurant Pricing Engine', () => {
    test('originalPrice 100 -> adjust 5, price 105, commission 10, settlement 90, gross 15', () => {
      const result = PricingService.calculateRestaurantPricing(100);

      expect(result.originalPrice).toBe(100);
      expect(result.menuAdjustmentPercent).toBe(5);
      expect(result.menuAdjustmentAmount).toBe(5);
      expect(result.customerMenuPrice).toBe(105);
      expect(result.commissionPercent).toBe(10);
      expect(result.commissionAmount).toBe(10);
      expect(result.vendorSettlement).toBe(90);
      expect(result.quikoooGrossRevenue).toBe(15);
    });

    test('commission is calculated on ORIGINAL price (100) not on customerMenuPrice (105)', () => {
      const result = PricingService.calculateRestaurantPricing(100);

      // 10% of 100 is 10. 10% of 105 would be 10.5 which is strictly WRONG.
      expect(result.commissionAmount).toBe(10);
      expect(result.commissionAmount).not.toBe(10.5);
      expect(result.commissionAmount).toBe(100 * 0.10);
    });

    test('calculateOrderTotals returns subtotal=105, platformFee=5, deliveryFee=25, payable=135', () => {
      const totals = PricingService.calculateOrderTotals(100);

      expect(totals.subtotal).toBe(105);
      expect(totals.platformFee).toBe(5);
      expect(totals.deliveryFee).toBe(25);
      expect(totals.customerPayable).toBe(135); // 105 + 5 + 25 = 135
      expect(totals.vendorSettlement).toBe(90);
    });
  });

  describe('Tax & Financial Ledger Split', () => {
    test('tax calculation on gross revenue (17 * 0.18 = 3.06, net = 13.94)', () => {
      const tax = TaxService.calculateTax(17.0, 0.18);

      expect(tax.taxableAmount).toBe(17.0);
      expect(tax.rate).toBe(0.18);
      expect(tax.taxAmount).toBe(3.06);
      expect(tax.netAmount).toBe(13.94);
    });

    test('agent/quikooo split of 13.94 -> 8.36 / 5.58 approx (60% / 40%)', () => {
      const split = FinancialLedgerService.splitRevenue(13.94);

      // 13.94 * 0.60 = 8.364 -> 8.36
      // 13.94 * 0.40 = 5.576 -> 5.58
      expect(split.agentShare).toBeCloseTo(8.36, 2);
      expect(split.quikoooShare).toBeCloseTo(5.58, 2);
      expect(split.agentShare + split.quikoooShare).toBe(13.94);
    });

    test('double-entry ledger contains balanced debit and credits', () => {
      const ledger = FinancialLedgerService.buildLedgerEntry({
        orderId: 'test-order-1',
        customerPayable: 135,
        vendorSettlement: 90,
        deliveryPayout: 25,
        grossRevenue: 17,
        taxRate: 0.18,
      });

      expect(ledger.entries).toHaveLength(6);
      expect(ledger.taxAmount).toBe(3.06);
      expect(ledger.agentShare).toBe(8.36);
      expect(ledger.quikoooShare).toBe(5.58);
    });
  });

  describe('Rural Cutoff Rules', () => {
    test('rural cutoff: 20:30 eligible true, 21:00 false (closed), 21:01 false', () => {
      expect(ZoneService.isRuralOrderEligible('20:30')).toBe(true);
      expect(ZoneService.isRuralOrderEligible('21:00')).toBe(false);
      expect(ZoneService.isRuralOrderEligible('21:01')).toBe(false);
    });
  });
});
