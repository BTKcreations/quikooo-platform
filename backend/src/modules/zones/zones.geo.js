/**
 * QUIKOOO Spatial & Geofencing Helpers
 * Source of Truth: docs/FULL-PLATFORM-PLAN.md & backend/src/services/ZoneService.js
 * 
 * Provides:
 * - pointInRadius: Haversine-based in-memory geofence distance verification
 * - buildDeliveryQuery: Parameterized SQL for vendor proximity queries
 *   (ST_DWithin when PostGIS is enabled, Haversine formula SQL fallback when PostGIS is disabled)
 */

/**
 * Calculates great-circle distance between two coordinates using Haversine formula
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (angle) => (angle * Math.PI) / 180;
  const R = 6371; // Earth radius in kilometers

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
 * Checks if a target coordinate is within the specified radius of a center point
 * @param {number} centerLat - Latitude of center (e.g., customer or zone origin)
 * @param {number} centerLng - Longitude of center
 * @param {number} targetLat - Latitude of target (e.g., vendor)
 * @param {number} targetLng - Longitude of target
 * @param {number} [radiusKm=2.0] - Geofence radius in kilometers (default 2km)
 * @returns {boolean} Whether coordinate is within radius
 */
function pointInRadius(centerLat, centerLng, targetLat, targetLng, radiusKm = 2.0) {
  const distance = haversineDistance(centerLat, centerLng, targetLat, targetLng);
  return distance <= Number(radiusKm);
}

/**
 * Builds parameterized SQL query for delivery vendor discovery
 * 
 * Supports two query modes:
 * 1. PostGIS mode (usePostgis: true):
 *    Uses ST_DWithin on geography(Point, 4326) with GiST spatial indexing for microsecond performance.
 * 2. Haversine SQL fallback (usePostgis: false):
 *    Uses pure trigonometric SQL functions executable on standard PostgreSQL / SQLite without PostGIS extension.
 * 
 * @param {Object} options
 * @param {number} options.customerLat - Customer latitude
 * @param {number} options.customerLng - Customer longitude
 * @param {number} [options.radiusKm=2.0] - Delivery radius in km (default 2km)
 * @param {boolean} [options.usePostgis=false] - Whether PostGIS extension is available
 * @param {boolean} [options.activeOnly=true] - Filter only active vendors
 * @returns {{ text: string, values: Array, isPostgis: boolean }} Parameterized query object
 */
function buildDeliveryQuery({
  customerLat,
  customerLng,
  radiusKm = 2.0,
  usePostgis = false,
  activeOnly = true,
} = {}) {
  const cLat = Number(customerLat);
  const cLng = Number(customerLng);
  const rKm = Number(radiusKm) || 2.0;

  if (isNaN(cLat) || isNaN(cLng)) {
    throw new Error('Valid customerLat and customerLng must be provided to buildDeliveryQuery');
  }

  if (usePostgis) {
    // PostGIS ST_DWithin query using spatial index and geography point (SRID 4326)
    // Note: ST_MakePoint takes (longitude, latitude)
    const radiusMeters = rKm * 1000.0;
    const text = `
SELECT id, name, location_name, latitude, longitude,
  ST_Distance(
    coordinates,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
  ) / 1000.0 AS distance_km
FROM vendors
WHERE ST_DWithin(
  coordinates,
  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
  $3
)
AND ($4::boolean IS NULL OR is_active = $4)
ORDER BY distance_km ASC;
    `.trim();

    return {
      text,
      values: [cLng, cLat, radiusMeters, activeOnly],
      isPostgis: true,
    };
  }

  // Haversine SQL fallback (Pure SQL trigonometric calculation without PostGIS extension)
  const text = `
SELECT id, name, location_name, latitude, longitude,
  (6371 * acos(
    cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) +
    sin(radians($1)) * sin(radians(latitude))
  )) AS distance_km
FROM vendors
WHERE (6371 * acos(
    cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) +
    sin(radians($1)) * sin(radians(latitude))
  )) <= $3
AND ($4::boolean IS NULL OR is_active = $4)
ORDER BY distance_km ASC;
  `.trim();

  return {
    text,
    values: [cLat, cLng, rKm, activeOnly],
    isPostgis: false,
  };
}

module.exports = {
  haversineDistance,
  pointInRadius,
  buildDeliveryQuery,
};
