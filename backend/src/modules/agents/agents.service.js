const config = require('../../config');

class AgentsService {
  static async listAgents() {
    // TODO: Connect to DB agents table
    return [
      {
        id: 'agent-1',
        agentCode: 'AG-ZN-01',
        zoneId: 'zone-urban-1',
        commissionSharePercent: config.pricing.agentSharePercent,
        isActive: true,
      },
    ];
  }

  static async getAgentById(id) {
    // TODO: Connect to DB agents table
    return {
      id,
      agentCode: 'AG-ZN-01',
      zoneId: 'zone-urban-1',
      commissionSharePercent: config.pricing.agentSharePercent,
      isActive: true,
    };
  }

  static async getAgentAnalytics(id) {
    return {
      agentId: id,
      agentCode: 'AG-ZN-RUR-01',
      zoneId: 'zone-rural-1',
      zoneName: 'Karnataka Rural Hub - South Sector',
      totalVendors: 14,
      activeVendors: 12,
      totalDrivers: 18,
      activeDrivers: 11,
      totalOrders: 342,
      ruralScheduledOrders: 28,
      zoneGmv: 46170.0,
      adjustedContributionPool: 4767.48, // 342 * 13.94 net revenue pool
      agentCommissionShare: 2860.49, // 60% of adjusted pool
      platformShare: 1906.99, // 40% of adjusted pool
      deliveryInflow: 8550.0, // 342 * 25.0 delivery inflow (passed 100% to drivers)
      period: 'THIS_MONTH',
    };
  }

  static async getAgentPayouts(id) {
    // TODO: Fetch payouts from settlements table
    return {
      agentId: id,
      agentCode: 'AG-ZN-RUR-01',
      commissionSharePercent: config.pricing.agentSharePercent,
      totalEarned: 8360.0,
      totalPaid: 6000.0,
      pendingPayout: 2360.0,
      currency: 'INR',
    };
  }
}

module.exports = AgentsService;
