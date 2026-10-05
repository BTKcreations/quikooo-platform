/**
 * QUIKOOO OpenStreetMap Nominatim Geocoding Client
 * Source of Truth: docs/FULL-PLATFORM-PLAN.md
 * 
 * Complies with OSM Nominatim Usage Policy:
 * - 1s debounce to never exceed 1 request / second
 * - User-Agent header documentation note (browsers forbid unsafe User-Agent override in fetch)
 * - Error handling with toast notifications & offline fallback stubs
 */

export const NOMINATIM_SEARCH_BASE = 'https://nominatim.openstreetmap.org/search';
export const NOMINATIM_REVERSE_BASE = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Note on User-Agent Header:
 * Nominatim's Usage Policy requires identifying HTTP requests (e.g. "Quikooo-App/1.0 contact@quikooo.com").
 * However, the browser W3C fetch specification strictly classifies 'User-Agent' as a forbidden header name,
 * so setting it directly in client-side fetch() is ignored or throws a security error in browsers.
 * In server-side environments or backend proxies, the User-Agent header must be explicitly forwarded.
 */
export const NOMINATIM_USER_AGENT_NOTE = 'Quikooo-Hyperlocal-Platform/1.0 (contact@quikooo.com; OSM Nominatim Compliance)';

/**
 * Builds standard Nominatim forward search query URL
 * Pure function: Deterministic and unit-testable
 */
export function buildSearchUrl(query, options = {}) {
  const q = encodeURIComponent(String(query || '').trim());
  const format = options.format || 'json';
  const countrycodes = options.countrycodes || 'in';
  const limit = options.limit || 5;
  const addressdetails = options.addressdetails ?? 1;

  return `${NOMINATIM_SEARCH_BASE}?format=${format}&q=${q}&countrycodes=${countrycodes}&addressdetails=${addressdetails}&limit=${limit}`;
}

/**
 * Builds standard Nominatim reverse geocode URL
 * Pure function: Deterministic and unit-testable
 */
export function buildReverseUrl(lat, lon, options = {}) {
  const format = options.format || 'json';
  const addressdetails = options.addressdetails ?? 1;
  const nLat = Number(lat) || 0;
  const nLon = Number(lon) || 0;

  return `${NOMINATIM_REVERSE_BASE}?format=${format}&lat=${nLat}&lon=${nLon}&addressdetails=${addressdetails}`;
}

/**
 * Calculates Haversine distance in kilometers between two coordinates
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (angle) => (angle * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1000) / 1000;
}

/**
 * Checks if a target coordinate is within a given radius (km) of a center coordinate
 */
export function isPointWithinRadius(centerLat, centerLng, targetLat, targetLng, radiusKm = 2.0) {
  const dist = haversineDistance(centerLat, centerLng, targetLat, targetLng);
  return dist <= Number(radiusKm);
}

/**
 * 1-Second Debounce Utility
 * Ensures queries to Nominatim strictly comply with max 1 req/sec policy
 */
export function debounce(fn, delay = 1000) {
  let timer = null;
  const debounced = function (...args) {
    if (timer) clearTimeout(timer);
    return new Promise((resolve) => {
      timer = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          resolve(result);
        } catch {
          resolve(null);
        }
      }, delay);
    });
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
  };
  return debounced;
}

// In-memory cache for repeated geocoding queries
const geocodeCache = new Map();

// Local fallback suggestions when Nominatim is offline / rate-limited
const LOCAL_FALLBACK_SUGGESTIONS = [
  {
    displayName: 'Indiranagar 100ft Road, Bengaluru, Karnataka, 560038, India',
    name: 'Indiranagar 100ft Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9784,
    lng: 77.6408,
    zone: 'URBAN',
    eta: '10–12m',
    accuracy: '±10m (High Accuracy GPS)',
  },
  {
    displayName: 'Koramangala 4th Block, Bengaluru, Karnataka, 560034, India',
    name: 'Koramangala 4th Block',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9345,
    lng: 77.6266,
    zone: 'URBAN',
    eta: '12–15m',
    accuracy: '±10m (High Accuracy GPS)',
  },
  {
    displayName: 'HSR Layout Sector 1, Bengaluru, Karnataka, 560102, India',
    name: 'HSR Layout Sector 1',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9116,
    lng: 77.6389,
    zone: 'URBAN',
    eta: '10–14m',
    accuracy: '±15m (Cell/GPS)',
  },
  {
    displayName: 'Mandya Rural Hub & Cluster, Mandya, Karnataka, 571401, India',
    name: 'Mandya Rural Cluster (ZN-RUR-01)',
    city: 'Mandya',
    state: 'Karnataka',
    lat: 12.5244,
    lng: 76.8958,
    zone: 'RURAL',
    eta: 'Next Morning (05:00-08:00)',
    accuracy: '±25m (Regional Hub)',
  },
];

/**
 * Searches OSM Nominatim for address suggestions with caching & offline fallback
 */
export async function searchAddress(query, options = {}) {
  const trimmed = (query || '').trim();
  if (!trimmed || trimmed.length < 2) return [];

  const cacheKey = `search:${trimmed.toLowerCase()}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const url = buildSearchUrl(trimmed, options);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Nominatim error HTTP ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const results = data.map((item) => {
        const addr = item.address || {};
        const name = addr.road || addr.suburb || addr.neighbourhood || item.name || trimmed;
        const city = addr.city || addr.town || addr.village || addr.county || 'Bengaluru';
        const state = addr.state || 'Karnataka';

        return {
          displayName: item.display_name,
          name,
          city,
          state,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          zone: city.toLowerCase().includes('mandya') || addr.village ? 'RURAL' : 'URBAN',
          eta: addr.village ? 'Next Morning' : '10–15m',
          accuracy: '±10m (OSM Verified)',
          raw: item,
        };
      });

      geocodeCache.set(cacheKey, results);
      return results;
    }
  } catch (err) {
    console.warn('[Geocode] Nominatim request failed, using local suggestions fallback:', err.message);
    if (typeof options.onError === 'function') {
      options.onError(err);
    }
  }

  // Filter local fallbacks matching query
  const fallbacks = LOCAL_FALLBACK_SUGGESTIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(trimmed.toLowerCase()) ||
      loc.city.toLowerCase().includes(trimmed.toLowerCase()) ||
      loc.displayName.toLowerCase().includes(trimmed.toLowerCase())
  );

  return fallbacks.length > 0 ? fallbacks : LOCAL_FALLBACK_SUGGESTIONS;
}

/**
 * Reverse geocodes coordinates to address details via Nominatim
 */
export async function reverseGeocode(lat, lon, options = {}) {
  const cacheKey = `rev:${lat},${lon}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const url = buildReverseUrl(lat, lon, options);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Nominatim error HTTP ${res.status}`);
    }

    const item = await res.json();
    if (item && item.address) {
      const addr = item.address;
      const result = {
        displayName: item.display_name,
        name: addr.road || addr.suburb || addr.neighbourhood || 'Selected Location',
        city: addr.city || addr.town || addr.village || addr.county || 'Bengaluru',
        state: addr.state || 'Karnataka',
        postalCode: addr.postcode || '',
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        zone: addr.village ? 'RURAL' : 'URBAN',
        eta: addr.village ? 'Next Morning' : '10–12m',
        accuracy: '±10m (OSM Reverse Geocoded)',
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('[Geocode] Reverse geocoding failed:', err.message);
    if (typeof options.onError === 'function') {
      options.onError(err);
    }
  }

  return {
    displayName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    name: 'Pinned Location',
    city: 'Bengaluru',
    lat: Number(lat),
    lng: Number(lon),
    zone: 'URBAN',
    eta: '10–12m',
    accuracy: '±15m (GPS)',
  };
}
