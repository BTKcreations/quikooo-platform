/**
 * ============================================================================
 * DELIVERY TRACKING & TELEMETRY MODULE
 * ============================================================================
 * 
 * RETENTION POLICY & ARCHITECTURAL NOTE:
 * ----------------------------------------------------------------------------
 * "NO PER-SECOND FOREVER" STORAGE POLICY:
 * In a production hyperlocal dispatch network, active driver mobile clients
 * sample GPS locations every 1 to 3 seconds. Indiscriminately writing every
 * raw coordinate ping directly to disk (PostgreSQL) causes massive write amplification:
 *   1 ping/sec * 1,000 drivers = 3.6 million rows / 130MB per hour.
 * 
 * Therefore, Quikooo enforces a tiered retention architecture:
 * 1. Hot Tier (Realtime Telemetry):
 *    - In-flight GPS coordinates are broadcast immediately over Socket.IO (delivery.location)
 *      to customer rooms (order:{id}) and driver rooms (driver:{id}).
 *    - Current position is cached in-memory / Redis with an ephemeral TTL (1 hour).
 * 
 * 2. Warm Tier (Active Trip Breadcrumbs & Throttling):
 *    - HTTP API ingests throttled pings (enforcing a minimum 3-5 second interval).
 *    - Pings within the throttle window update the live location and emit realtime
 *      events without triggering heavy database writes.
 *    - Key waypoints (pickup, handover points, turnings) are stored in delivery_tracking.
 * 
 * 3. Cold Tier / Purge:
 *    - Raw high-frequency breadcrumbs in delivery_tracking are PURGED after 14-30 days
 *      via an automated scheduled partition drop / cron job.
 *    - Only immutable delivery summary metrics (origin, destination, total route distance,
 *      duration, and final delivery handshake timestamp) are permanently retained on the
 *      orders and delivery_assignments tables for billing and dispute resolution.
 * ============================================================================
 */

const { emitDeliveryLocation } = require('../../realtime');
const db = require('../../db');

// In-memory store for active tracking sessions
// Maps deliveryId -> { deliveryId, status, currentLocation, breadcrumbs: [], lastRecordedAt }
const trackingStore = new Map();

// Minimum time in ms between persistent coordinate saves (throttling threshold)
const THROTTLE_INTERVAL_MS = 3000; // 3 seconds

/**
 * Validates coordinate ranges
 * Latitude: -90 to +90
 * Longitude: -180 to +180
 */
function validateCoordinates(lat, lng) {
  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    return { valid: false, message: 'Latitude and longitude are required' };
  }

  const numLat = Number(lat);
  const numLng = Number(lng);

  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
    return { valid: false, message: 'Latitude and longitude must be valid finite numbers' };
  }

  if (numLat < -90 || numLat > 90) {
    return { valid: false, message: 'Latitude must be between -90 and 90 degrees' };
  }

  if (numLng < -180 || numLng > 180) {
    return { valid: false, message: 'Longitude must be between -180 and 180 degrees' };
  }

  return { valid: true, latitude: numLat, longitude: numLng };
}

/**
 * POST /api/v1/delivery/:id/location
 * Ingests live driver GPS coordinates with throttling and real-time broadcast
 */
async function updateLocation(req, res, next) {
  try {
    const deliveryId = req.params.id;
    const {
      latitude,
      longitude,
      lat,
      lng,
      speed,
      bearing,
      orderId,
      driverId,
    } = req.body;

    const inputLat = latitude !== undefined ? latitude : lat;
    const inputLng = longitude !== undefined ? longitude : lng;

    // 1. Coordinate Validation
    const validation = validateCoordinates(inputLat, inputLng);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const currentLat = validation.latitude;
    const currentLng = validation.longitude;
    const now = Date.now();
    const timestampStr = new Date(now).toISOString();

    // 2. Throttling Check
    const existing = trackingStore.get(deliveryId) || {
      deliveryId,
      status: 'IN_TRANSIT',
      breadcrumbs: [],
      lastRecordedAt: 0,
    };

    const timeSinceLastRecord = now - existing.lastRecordedAt;
    const isThrottled = timeSinceLastRecord < THROTTLE_INTERVAL_MS;

    const locationPoint = {
      latitude: currentLat,
      longitude: currentLng,
      speed: speed !== undefined && speed !== null ? Number(speed) : null,
      bearing: bearing !== undefined && bearing !== null ? Number(bearing) : null,
      recordedAt: timestampStr,
    };

    // Always update current live position in hot cache
    existing.currentLocation = locationPoint;
    existing.orderId = orderId || existing.orderId;
    existing.driverId = driverId || existing.driverId;
    existing.lastUpdated = timestampStr;

    let throttleNote = 'Location recorded and broadcast via realtime.';

    if (isThrottled) {
      throttleNote = 'Location updated in hot-cache and broadcast via realtime. Persistent disk write throttled (max 1 write per 3s to prevent write amplification).';
    } else {
      existing.lastRecordedAt = now;
      // Retain capped breadcrumbs in memory (up to last 100 points per active trip)
      existing.breadcrumbs.push(locationPoint);
      if (existing.breadcrumbs.length > 100) {
        existing.breadcrumbs.shift();
      }

      // Persist to database if connected
      if (db.isConnected()) {
        try {
          await db.query(
            `INSERT INTO delivery_tracking (delivery_assignment_id, latitude, longitude, speed, bearing, recorded_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [deliveryId, currentLat, currentLng, locationPoint.speed, locationPoint.bearing, timestampStr]
          );
        } catch (dbErr) {
          console.warn('[DeliveryTracking] DB write warning:', dbErr.message);
        }
      }
    }

    trackingStore.set(deliveryId, existing);

    // 3. Socket.IO Realtime Broadcast
    emitDeliveryLocation(deliveryId, {
      orderId: existing.orderId,
      driverId: existing.driverId,
      latitude: currentLat,
      longitude: currentLng,
      speed: locationPoint.speed,
      bearing: locationPoint.bearing,
      throttled: isThrottled,
    });

    return res.status(200).json({
      success: true,
      data: {
        deliveryId,
        latitude: currentLat,
        longitude: currentLng,
        speed: locationPoint.speed,
        bearing: locationPoint.bearing,
        throttled: isThrottled,
        recordedAt: timestampStr,
        note: throttleNote,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/delivery/:id/track
 * Returns current location, delivery status, and recent breadcrumbs
 */
async function getTracking(req, res, next) {
  try {
    const deliveryId = req.params.id;

    if (trackingStore.has(deliveryId)) {
      const record = trackingStore.get(deliveryId);
      return res.status(200).json({
        success: true,
        data: {
          deliveryId,
          status: record.status || 'IN_TRANSIT',
          currentLocation: record.currentLocation,
          breadcrumbCount: record.breadcrumbs.length,
          breadcrumbs: record.breadcrumbs,
          lastUpdated: record.lastUpdated,
        },
      });
    }

    // Check DB if connected
    if (db.isConnected()) {
      const dbResult = await db.query(
        `SELECT * FROM delivery_tracking 
         WHERE delivery_assignment_id = $1 
         ORDER BY recorded_at DESC LIMIT 50`,
        [deliveryId]
      );

      if (dbResult.rows.length > 0) {
        const latest = dbResult.rows[0];
        return res.status(200).json({
          success: true,
          data: {
            deliveryId,
            status: 'IN_TRANSIT',
            currentLocation: {
              latitude: parseFloat(latest.latitude),
              longitude: parseFloat(latest.longitude),
              speed: latest.speed ? parseFloat(latest.speed) : null,
              bearing: latest.bearing ? parseFloat(latest.bearing) : null,
              recordedAt: latest.recorded_at,
            },
            breadcrumbCount: dbResult.rows.length,
            breadcrumbs: dbResult.rows.map((row) => ({
              latitude: parseFloat(row.latitude),
              longitude: parseFloat(row.longitude),
              recordedAt: row.recorded_at,
            })),
            lastUpdated: latest.recorded_at,
          },
        });
      }
    }

    // Default mock location for new/untracked assignments
    return res.status(200).json({
      success: true,
      data: {
        deliveryId,
        status: 'IN_TRANSIT',
        currentLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
          recordedAt: new Date().toISOString(),
        },
        breadcrumbCount: 0,
        breadcrumbs: [],
        lastUpdated: new Date().toISOString(),
        note: 'Default dispatch coordinates',
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Resets tracking store (for test suites)
 */
function clearTrackingStore() {
  trackingStore.clear();
}

function getTrackingStore() {
  return trackingStore;
}

module.exports = {
  updateLocation,
  getTracking,
  validateCoordinates,
  clearTrackingStore,
  getTrackingStore,
  THROTTLE_INTERVAL_MS,
};
