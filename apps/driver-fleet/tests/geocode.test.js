import { describe, it, expect } from 'vitest';
import {
  buildSearchUrl,
  buildReverseUrl,
  isPointWithinRadius,
  haversineDistance,
  NOMINATIM_SEARCH_BASE,
  NOMINATIM_REVERSE_BASE,
} from '../src/lib/geocode.js';

describe('Driver Fleet Geocoding & Route Geofence Tests', () => {
  describe('Nominatim Geocode URL Builder', () => {
    it('builds forward search query URL with India country code', () => {
      const url = buildSearchUrl('HAL 2nd Stage, Indiranagar');
      expect(url).toContain(NOMINATIM_SEARCH_BASE);
      expect(url).toContain('q=HAL%202nd%20Stage%2C%20Indiranagar');
      expect(url).toContain('countrycodes=in');
      expect(url).toContain('format=json');
    });

    it('builds reverse geocode URL with coordinates for driver GPS location', () => {
      const url = buildReverseUrl(12.9760, 77.6440);
      expect(url).toContain(NOMINATIM_REVERSE_BASE);
      expect(url).toContain('lat=12.976');
      expect(url).toContain('lon=77.644');
      expect(url).toContain('format=json');
    });
  });

  describe('Radius Contains & Proximity Check', () => {
    it('calculates 0 km distance for identical coordinates', () => {
      expect(haversineDistance(12.9760, 77.6440, 12.9760, 77.6440)).toBe(0);
    });

    it('correctly verifies delivery drop is within 2.0 km of store pickup', () => {
      // Store (12.9795, 77.6425) to Customer (12.9720, 77.6480) is ~1.0 km
      const isWithin = isPointWithinRadius(12.9795, 77.6425, 12.9720, 77.6480, 2.0);
      expect(isWithin).toBe(true);
    });

    it('correctly identifies when drop point is outside 2.0 km radius', () => {
      // Store (12.9795, 77.6425) to Kengeri (12.9081, 77.4851) is ~19 km
      const isWithin = isPointWithinRadius(12.9795, 77.6425, 12.9081, 77.4851, 2.0);
      expect(isWithin).toBe(false);
    });
  });
});
