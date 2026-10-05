import { describe, it, expect } from 'vitest';
import {
  buildSearchUrl,
  buildReverseUrl,
  isPointWithinRadius,
  haversineDistance,
  NOMINATIM_SEARCH_BASE,
  NOMINATIM_REVERSE_BASE,
} from '../src/lib/geocode.js';

describe('Agent App Rural Geocoding & Zone Cluster Tests', () => {
  describe('Nominatim Geocode URL Builder', () => {
    it('builds forward search query URL for rural cluster hubs', () => {
      const url = buildSearchUrl('Mandya Rural Cluster');
      expect(url).toContain(NOMINATIM_SEARCH_BASE);
      expect(url).toContain('q=Mandya%20Rural%20Cluster');
      expect(url).toContain('countrycodes=in');
      expect(url).toContain('format=json');
    });

    it('builds reverse geocode URL with coordinates for rural hamlets', () => {
      // Mandya Hub coordinates: 12.5244, 76.8958
      const url = buildReverseUrl(12.5244, 76.8958);
      expect(url).toContain(NOMINATIM_REVERSE_BASE);
      expect(url).toContain('lat=12.5244');
      expect(url).toContain('lon=76.8958');
      expect(url).toContain('format=json');
    });
  });

  describe('Radius Contains & Cluster Proximity Check', () => {
    it('calculates 0 km distance for identical coordinates', () => {
      expect(haversineDistance(12.5244, 76.8958, 12.5244, 76.8958)).toBe(0);
    });

    it('correctly verifies hamlet Gejjalagere is within 15 km rural cluster zone', () => {
      // Mandya Hub (12.5244, 76.8958) to Gejjalagere (12.5802, 76.9930) is ~12.2 km
      const isWithin = isPointWithinRadius(12.5244, 76.8958, 12.5802, 76.9930, 15.0);
      expect(isWithin).toBe(true);
    });

    it('correctly flags location outside 15 km rural cluster boundary', () => {
      // Mandya Hub (12.5244, 76.8958) to Mysore (12.2958, 76.6394) is ~36 km
      const isWithin = isPointWithinRadius(12.5244, 76.8958, 12.2958, 76.6394, 15.0);
      expect(isWithin).toBe(false);
    });
  });
});
