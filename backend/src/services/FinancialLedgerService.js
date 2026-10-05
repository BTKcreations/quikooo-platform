const config = require('../config');
const TaxService = require('./TaxService');
const { round2 } = require('./TaxService');

class FinancialLedgerService {
  /**
   * Splits adjusted net pool between Local Zone Agent (60%) and QUIKOOO Platform (40%)
   * Example: 13.94 net revenue -> 8.36 Agent (60%), 5.58 Quikooo (40%)
   * 
   * @param {number} adjustedAmount - Net revenue after taxes
   * @param {number} [agentPercent] - Agent share percent (default 60%)
   * @param {number} [quikoooPercent] - Quikooo share percent (default 40%)
   * @returns {Object} Split distribution
   */
  static splitRevenue(
    adjustedAmount,
    agentPercent = config.pricing.agentSharePercent,
    quikoooPercent = config.pricing.quikoooSharePercent
  ) {
    const adjusted = round2(adjustedAmount);
    const agentShare = round2(adjusted * (agentPercent / 100));
    // Quikooo share balances the remaining pool to avoid 1-cent rounding drift
    const quikoooShare = round2(adjusted - agentShare);

    return {
      adjustedAmount: adjusted,
      agentPercent,
      quikoooPercent,
      agentShare,
      quikoooShare,
    };
  }

  /**
   * Builds double-entry ledger entries for an order
   * 
   * @param {Object} params
   * @returns {Object} Full ledger entry breakdown
   */
  static buildLedgerEntry(params) {
    const {
      orderId,
      orderNumber,
      zoneId,
      agentId,
      vendorId,
      deliveryPartnerId,
      grossRevenue,
      taxRate = config.tax.defaultRate,
      adjustedAmount: customAdjusted,
      vendorSettlement = 0,
      deliveryFee = config.pricing.customerDeliveryFee,
      deliveryPayout = config.pricing.deliveryPartnerPayout,
      customerPayable = 0,
    } = params;

    let taxInfo;
    let adjustedAmount;

    if (customAdjusted !== undefined) {
      adjustedAmount = round2(customAdjusted);
      taxInfo = {
        taxAmount: grossRevenue !== undefined ? round2(grossRevenue - adjustedAmount) : 0,
        rate: taxRate,
        netAmount: adjustedAmount,
      };
    } else {
      taxInfo = TaxService.calculateTax(grossRevenue || 0, taxRate);
      adjustedAmount = taxInfo.netAmount;
    }

    const revenueSplit = FinancialLedgerService.splitRevenue(adjustedAmount);

    const ledgerEntries = [
      {
        account: 'ESCROW_CUSTOMER_RECEIVABLE',
        type: 'DEBIT',
        amount: round2(customerPayable),
        entityType: 'ORDER',
        entityId: orderId,
        description: `Customer payment received for order ${orderNumber || orderId}`,
      },
      {
        account: 'VENDOR_PAYABLE',
        type: 'CREDIT',
        amount: round2(vendorSettlement),
        entityType: 'VENDOR',
        entityId: vendorId,
        description: `Vendor settlement credit (original price - 10% commission)`,
      },
      {
        account: 'DELIVERY_PARTNER_PAYABLE',
        type: 'CREDIT',
        amount: round2(deliveryPayout),
        entityType: 'DELIVERY_PARTNER',
        entityId: deliveryPartnerId || null,
        description: `Delivery payout credit for partner`,
      },
      {
        account: 'TAX_PAYABLE',
        type: 'CREDIT',
        amount: round2(taxInfo.taxAmount),
        entityType: 'GOVERNMENT_TAX',
        entityId: null,
        description: `Taxes/GST payable on platform revenue at ${taxInfo.rate * 100}%`,
      },
      {
        account: 'AGENT_COMMISSION_PAYABLE',
        type: 'CREDIT',
        amount: revenueSplit.agentShare,
        entityType: 'AGENT',
        entityId: agentId || null,
        description: `Agent revenue share (60% of net adjusted pool)`,
      },
      {
        account: 'QUIKOOO_PLATFORM_REVENUE',
        type: 'CREDIT',
        amount: revenueSplit.quikoooShare,
        entityType: 'PLATFORM',
        entityId: 'QUIKOOO_HQ',
        description: `QUIKOOO retained revenue (40% of net adjusted pool)`,
      },
    ];

    return {
      orderId,
      orderNumber,
      zoneId,
      agentId,
      vendorId,
      deliveryPartnerId,
      grossRevenue: round2(grossRevenue || 0),
      taxRate: taxInfo.rate,
      taxAmount: taxInfo.taxAmount,
      adjustedAmount,
      agentShare: revenueSplit.agentShare,
      quikoooShare: revenueSplit.quikoooShare,
      vendorSettlement: round2(vendorSettlement),
      deliveryPayout: round2(deliveryPayout),
      entries: ledgerEntries,
      createdAt: new Date().toISOString(),
    };
  }
}

module.exports = FinancialLedgerService;
