class ReportsService {
  static async getSalesReport(filters = {}) {
    // TODO: Connect to DB orders and financial_ledger
    return {
      period: filters.period || 'LAST_30_DAYS',
      totalOrders: 1250,
      totalGrossFoodSales: 125000.0,
      totalPlatformRevenue: 18750.0,
      totalAgentCommissions: 9225.0,
      currency: 'INR',
    };
  }

  static async getAgentCommissionsReport(filters = {}) {
    // TODO: Connect to DB settlements and agents
    return {
      period: filters.period || 'CURRENT_MONTH',
      agentsSummary: [
        {
          agentId: 'agent-1',
          zoneCode: 'ZN-URB-01',
          ordersCount: 320,
          earnedShare: 8360.0,
        },
      ],
    };
  }

  static async getRuralBatchesReport(filters = {}) {
    // TODO: Connect to DB orders with zone_type = 'RURAL'
    return {
      period: filters.period || 'CURRENT_WEEK',
      batches: [
        {
          date: '2026-10-06',
          dispatchWindow: '05:00 - 08:00',
          cutoffTime: '21:00',
          ordersCount: 45,
          status: 'SCHEDULED',
        },
      ],
    };
  }
}

module.exports = ReportsService;
