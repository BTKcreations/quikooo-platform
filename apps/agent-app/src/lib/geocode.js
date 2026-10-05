/**
 * QUIKOOO OpenStreetMap Nominatim Geocoding Client
 * Source of Truth: docs/FULL-PLATFORM-PLAN.md
 */

export const NOMINATIM_SEARCH_BASE = 'https://nominatim.openstreetmap.org/search';
export const NOMINATIM_REVERSE_BASE = 'https://nominatim.openstreetmap.org/reverse';
export const NOMINATIM_USER_AGENT_NOTE = 'Quikooo-Hyperlocal-Platform/1.0 (contact@quikooo.com; OSM Nominatim Compliance)';

export function buildSearchUrl(query, options = {}) {
  const q = encodeURIComponent(String(query || '').trim());
  const format = options.format || 'json';
  const countrycodes = options.countrycodes || 'in';
  const limit = options.limit || 5;
  const addressdetails = options.addressdetails ?? 1;

  return `${NOMINATIM_SEARCH_BASE}?format=${format}&q=${q}&countrycodes=${countrycodes}&addressdetails=${addressdetails}&limit=${limit}`;
}

export function buildReverseUrl(lat, lon, options = {}) {
  const format = options.format || 'json';
  const addressdetails = options.addressdetails ?? 1;
  const nLat = Number(lat) || 0;
  const nLon = Number(lon) || 0;

  return `${NOMINATIM_REVERSE_BASE}?format=${format}&lat=${nLat}&lon=${nLon}&addressdetails=${addressdetails}`;
}

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

export function isPointWithinRadius(centerLat, centerLng, targetLat, targetLng, radiusKm = 2.0) {
  const dist = haversineDistance(centerLat, centerLng, targetLat, targetLng);
  return dist <= Number(radiusKm);
}

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
