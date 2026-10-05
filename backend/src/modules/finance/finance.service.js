const FinancialLedgerService = require('../../services/FinancialLedgerService');

class FinanceService {
  static async getLedgerEntries(filters = {}) {
    // TODO: Connect to DB financial_ledger table
    return {
      entries: [],
      total: 0,
      filters,
    };
  }

  static createLedgerEntry(data) {
    return FinancialLedgerService.buildLedgerEntry(data);
  }

  static async getFinancialSummary(zoneId) {
    // TODO: Aggregate financial summary from ledger
    return {
      zoneId: zoneId || 'ALL',
      totalGrossRevenue: 15000.0,
      totalTaxes: 2700.0,
      totalAgentPayouts: 7380.0, // 60% of net pool
      totalQuikoooRevenue: 4920.0, // 40% of net pool
      currency: 'INR',
    };
  }
}

module.exports = FinanceService;
