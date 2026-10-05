const config = require('../config');

/**
 * PostGIS ST_DWithin Reference Documentation:
 * 
 * In production PostgreSQL with PostGIS extension enabled:
 * 
 * ```sql
 * -- 1. Spatial column on zones and vendors:
 * -- ALTER TABLE zones ADD COLUMN boundary geometry(Polygon, 4326);
 * -- ALTER TABLE vendors ADD COLUMN coordinates geography(Point, 4326);
 * -- CREATE INDEX idx_vendors_coordinates ON vendors USING GIST(coordinates);
 * 
 * -- 2. Querying vendors within zone radius:
 * SELECT id, name, location_name,
 *   ST_Distance(
 *     coordinates,
 *     ST_SetSRID(ST_MakePoint($customer_longitude, $customer_latitude), 4326)::geography
 *   ) / 1000.0 AS distance_km
 * FROM vendors
 * WHERE ST_DWithin(
 *   coordinates,
 *   ST_SetSRID(ST_MakePoint($customer_longitude, $customer_latitude), 4326)::geography,
 *   $radius_meters -- e.g., 2000 meters for DEFAULT_RADIUS_KM (2km)
 * )
 * AND is_active = true
 * ORDER BY distance_km ASC;
 * ```
 */

const ZONE_TYPES = {
  URBAN: 'URBAN',
  SUB_URBAN: 'SUB_URBAN',
  RURAL: 'RURAL',
};

class ZoneService {
  static ZONE_TYPES = ZONE_TYPES;

  /**
   * Calculates great-circle distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude point 1
   * @param {number} lon1 - Longitude point 1
   * @param {number} lat2 - Latitude point 2
   * @param {number} lon2 - Longitude point 2
   * @returns {number} Distance in kilometers
   */
  static haversineDistance(lat1, lon1, lat2, lon2) {
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
   * Checks if coordinate is within specified radius
   */
  static isWithinRadius(lat1, lon1, lat2, lon2, radiusKm = config.zones.defaultRadiusKm) {
    const distance = ZoneService.haversineDistance(lat1, lon1, lat2, lon2);
    return distance <= radiusKm;
  }

  /**
   * Determines if a rural order is eligible based on the daily cutoff time (21:00 Asia/Kolkata).
   * 
   * Criteria:
   * - 20:30 -> eligible: true
   * - 21:00 -> eligible: false (cutoff reached, closed for next day morning batch)
   * - 21:01 -> eligible: false (past cutoff)
   * 
   * @param {Date|string} orderTime - Date object or "HH:MM" time string or ISO string
   * @param {string} [cutoff] - Cutoff time "HH:MM" (default 21:00)
   * @returns {boolean} Whether the order is eligible for rural next-day morning dispatch
   */
  static isRuralOrderEligible(orderTime = new Date(), cutoff = config.zones.ruralCutoff) {
    let hours;
    let minutes;

    if (typeof orderTime === 'string' && /^\d{1,2}:\d{2}/.test(orderTime.trim())) {
      const parts = orderTime.trim().split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    } else {
      const date = orderTime instanceof Date ? orderTime : new Date(orderTime);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date/time provided: ${orderTime}`);
      }

      // Convert to Asia/Kolkata time
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: config.zones.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const formatted = formatter.format(date);
      const [h, m] = formatted.split(':').map(Number);
      hours = h;
      minutes = m;
    }

    const [cutoffHours, cutoffMinutes] = cutoff.split(':').map(Number);
    const orderTotalMinutes = hours * 60 + minutes;
    const cutoffTotalMinutes = cutoffHours * 60 + cutoffMinutes;

    // Strict inequality: At cutoff (21:00 = 1260 mins), ordering window is closed
    return orderTotalMinutes < cutoffTotalMinutes;
  }

  /**
   * Gets rural morning batch window metadata
   * Rural delivery window is strictly 05:00 - 08:00 Asia/Kolkata
   * 
   * @param {Date|string} [deliveryDate]
   * @returns {Object} Delivery batch details
   */
  static getDeliveryBatch(deliveryDate) {
    let dateStr;
    if (deliveryDate) {
      if (deliveryDate instanceof Date) {
        dateStr = deliveryDate.toISOString().split('T')[0];
      } else {
        dateStr = String(deliveryDate).split('T')[0];
      }
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateStr = tomorrow.toISOString().split('T')[0];
    }

    return {
      deliveryDate: dateStr,
      windowStart: config.zones.ruralDeliveryWindowStart,
      windowEnd: config.zones.ruralDeliveryWindowEnd,
      windowLabel: `Rural Morning Dispatch (${config.zones.ruralDeliveryWindowStart} - ${config.zones.ruralDeliveryWindowEnd})`,
      batchId: `BATCH_${dateStr.replace(/-/g, '')}_MORNING`,
      timezone: config.zones.timezone,
    };
  }
}

module.exports = ZoneService;
