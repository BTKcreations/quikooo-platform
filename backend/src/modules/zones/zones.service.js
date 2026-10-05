const ZoneService = require('../../services/ZoneService');

class ZonesModuleService {
  static async listZones() {
    // TODO: Connect to DB zones table
    return [
      {
        id: 'zone-urban-1',
        name: 'Central Urban Zone',
        code: 'ZN-URB-01',
        zoneType: ZoneService.ZONE_TYPES.URBAN,
        radiusKm: 2.0,
      },
      {
        id: 'zone-rural-1',
        name: 'North Rural Cluster',
        code: 'ZN-RUR-01',
        zoneType: ZoneService.ZONE_TYPES.RURAL,
        ruralCutoffTime: '21:00',
      },
    ];
  }

  static async getZoneById(id) {
    // TODO: Connect to DB zones table
    return {
      id,
      name: 'Sample Zone',
      zoneType: 'URBAN',
      radiusKm: 2.0,
    };
  }

  static checkRuralEligibility(timeString) {
    const isEligible = ZoneService.isRuralOrderEligible(timeString);
    const batch = ZoneService.getDeliveryBatch();
    return {
      isEligible,
      cutoff: '21:00',
      timezone: 'Asia/Kolkata',
      batch,
    };
  }
}

module.exports = ZonesModuleService;
