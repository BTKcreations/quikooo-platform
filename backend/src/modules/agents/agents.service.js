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

  static async getAgentPayouts(id) {
    // TODO: Fetch payouts from settlements table
    return {
      agentId: id,
      totalEarned: 8360.0,
      totalPaid: 6000.0,
      pendingPayout: 2360.0,
      currency: 'INR',
    };
  }
}

module.exports = AgentsService;
