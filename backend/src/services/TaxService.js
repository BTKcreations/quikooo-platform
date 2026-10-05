const config = require('../config');

/**
 * Utility to round numbers to 2 decimal places (NUMERIC(12,2))
 */
function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

class TaxService {
  /**
   * Calculates tax on gross revenue with a configurable tax rate.
   * Rate is never hardcoded.
   * 
   * Example:
   * calculateTax(17.00, 0.18)
   * Gross Revenue: 17.00
   * Tax (18% GST): 17.00 * 0.18 = 3.06
   * Net Adjusted Revenue: 17.00 - 3.06 = 13.94
   * 
   * @param {number} grossRevenue - Taxable amount
   * @param {number} [rate] - Tax rate (e.g., 0.18 for 18% GST)
   * @returns {Object} Tax calculation breakdown
   */
  static calculateTax(grossRevenue, rate = config.tax.defaultRate) {
    if (typeof grossRevenue !== 'number' || isNaN(grossRevenue)) {
      throw new Error(`Invalid gross revenue for tax calculation: ${grossRevenue}`);
    }

    const numericRate = typeof rate === 'number' && !isNaN(rate) ? rate : config.tax.defaultRate;
    const taxableAmount = round2(grossRevenue);
    const taxAmount = round2(taxableAmount * numericRate);
    const netAmount = round2(taxableAmount - taxAmount);

    return {
      taxableAmount,
      rate: numericRate,
      ratePercentage: round2(numericRate * 100),
      taxAmount,
      netAmount,
    };
  }
}

module.exports = TaxService;
module.exports.round2 = round2;
