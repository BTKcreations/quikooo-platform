const ZoneService = require('../src/services/ZoneService');

describe('ZoneService Tests', () => {
  describe('Zone Types and Defaults', () => {
    test('defines URBAN, SUB_URBAN, and RURAL zone types', () => {
      expect(ZoneService.ZONE_TYPES.URBAN).toBe('URBAN');
      expect(ZoneService.ZONE_TYPES.SUB_URBAN).toBe('SUB_URBAN');
      expect(ZoneService.ZONE_TYPES.RURAL).toBe('RURAL');
    });
  });

  describe('Haversine Distance & Proximity', () => {
    test('calculates 0 km for identical coordinates', () => {
      const dist = ZoneService.haversineDistance(12.9716, 77.5946, 12.9716, 77.5946);
      expect(dist).toBe(0);
    });

    test('calculates accurate distance between coordinates', () => {
      // Points approximately 1.1 km apart
      const lat1 = 12.9716;
      const lon1 = 77.5946;
      const lat2 = 12.9816;
      const lon2 = 77.5946;

      const dist = ZoneService.haversineDistance(lat1, lon1, lat2, lon2);
      expect(dist).toBeGreaterThan(1.0);
      expect(dist).toBeLessThan(1.3);
    });

    test('isWithinRadius respects DEFAULT_RADIUS_KM (2km)', () => {
      // 1.1 km away
      expect(ZoneService.isWithinRadius(12.9716, 77.5946, 12.9816, 77.5946, 2)).toBe(true);

      // ~11 km away
      expect(ZoneService.isWithinRadius(12.9716, 77.5946, 13.0716, 77.5946, 2)).toBe(false);
    });
  });

  describe('Rural Cutoff and Batching', () => {
    test('validates cutoff at 21:00 Asia/Kolkata', () => {
      expect(ZoneService.isRuralOrderEligible('20:30')).toBe(true);
      expect(ZoneService.isRuralOrderEligible('20:59')).toBe(true);
      expect(ZoneService.isRuralOrderEligible('21:00')).toBe(false);
      expect(ZoneService.isRuralOrderEligible('21:01')).toBe(false);
      expect(ZoneService.isRuralOrderEligible('23:00')).toBe(false);
      expect(ZoneService.isRuralOrderEligible('01:30')).toBe(true);
    });

    test('getDeliveryBatch returns correct 05:00 - 08:00 morning dispatch window', () => {
      const batch = ZoneService.getDeliveryBatch('2026-10-06');
      expect(batch.windowStart).toBe('05:00');
      expect(batch.windowEnd).toBe('08:00');
      expect(batch.batchId).toBe('BATCH_20261006_MORNING');
      expect(batch.timezone).toBe('Asia/Kolkata');
    });
  });

  describe('GeoJSON Boundaries & Spatial Helpers', () => {
    const { pointInRadius, buildDeliveryQuery } = require('../src/modules/zones/zones.geo');

    test('getGeoJsonBoundary returns valid GeoJSON polygon feature', () => {
      const boundary = ZoneService.getGeoJsonBoundary('zone-rural-1');
      expect(boundary.type).toBe('Feature');
      expect(boundary.geometry.type).toBe('Polygon');
      expect(Array.isArray(boundary.geometry.coordinates[0])).toBe(true);
      expect(boundary.geometry.coordinates[0].length).toBe(5); // closed ring
      expect(boundary.properties.zoneType).toBe('RURAL');
      expect(boundary.properties.radiusKm).toBe(15.0);
    });

    test('pointInRadius verifies points inside and outside radius', () => {
      // 1.1 km apart
      expect(pointInRadius(12.9716, 77.5946, 12.9816, 77.5946, 2.0)).toBe(true);
      // 11 km apart
      expect(pointInRadius(12.9716, 77.5946, 13.0716, 77.5946, 2.0)).toBe(false);
    });

    test('buildDeliveryQuery generates PostGIS parameterized SQL when usePostgis=true', () => {
      const query = buildDeliveryQuery({
        customerLat: 12.9716,
        customerLng: 77.5946,
        radiusKm: 2.0,
        usePostgis: true,
      });

      expect(query.isPostgis).toBe(true);
      expect(query.text).toContain('ST_DWithin');
      expect(query.text).toContain('ST_MakePoint');
      expect(query.values).toEqual([77.5946, 12.9716, 2000, true]);
    });

    test('buildDeliveryQuery generates Haversine SQL fallback when usePostgis=false', () => {
      const query = buildDeliveryQuery({
        customerLat: 12.9716,
        customerLng: 77.5946,
        radiusKm: 2.0,
        usePostgis: false,
      });

      expect(query.isPostgis).toBe(false);
      expect(query.text).toContain('acos');
      expect(query.text).toContain('radians');
      expect(query.values).toEqual([12.9716, 77.5946, 2.0, true]);
    });
  });
});
