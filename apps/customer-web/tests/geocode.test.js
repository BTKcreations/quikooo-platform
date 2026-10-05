import { describe, it, expect } from 'vitest';
import {
  buildSearchUrl,
  buildReverseUrl,
  isPointWithinRadius,
  haversineDistance,
  NOMINATIM_SEARCH_BASE,
  NOMINATIM_REVERSE_BASE,
} from '../src/lib/geocode.js';

describe('Customer Web Geocoding & Geofence Tests', () => {
  describe('Nominatim Geocode URL Builder', () => {
    it('builds forward search query URL with India country code and limit', () => {
      const url = buildSearchUrl('Indiranagar 100ft Road');
      expect(url).toContain(NOMINATIM_SEARCH_BASE);
      expect(url).toContain('q=Indiranagar%20100ft%20Road');
      expect(url).toContain('format=json');
      expect(url).toContain('countrycodes=in');
      expect(url).toContain('limit=5');
    });

    it('builds reverse geocode URL with coordinates and address details', () => {
      const url = buildReverseUrl(12.9784, 77.6408);
      expect(url).toContain(NOMINATIM_REVERSE_BASE);
      expect(url).toContain('lat=12.9784');
      expect(url).toContain('lon=77.6408');
      expect(url).toContain('format=json');
      expect(url).toContain('addressdetails=1');
    });
  });

  describe('Radius Contains & Haversine Distance Check', () => {
    it('calculates 0 km distance for identical coordinates', () => {
      expect(haversineDistance(12.9784, 77.6408, 12.9784, 77.6408)).toBe(0);
    });

    it('correctly verifies point within 2.0 km geofence radius', () => {
      // Indiranagar 100ft Rd (12.9784, 77.6408) to Defence Colony (12.9720, 77.6440) is ~0.8 km
      const isInside = isPointWithinRadius(12.9784, 77.6408, 12.9720, 77.6440, 2.0);
      expect(isInside).toBe(true);
    });

    it('correctly rejects point outside 2.0 km geofence radius', () => {
      // Indiranagar (12.9784, 77.6408) to Whitefield (12.9698, 77.7499) is ~11 km
      const isInside = isPointWithinRadius(12.9784, 77.6408, 12.9698, 77.7499, 2.0);
      expect(isInside).toBe(false);
    });
  });
});
