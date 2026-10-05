/**
 * ============================================================================
 * QUIKOOO REALTIME DISPATCH & EVENT PIPELINE (SOCKET.IO)
 * ============================================================================
 * 
 * Manages low-latency WebSocket connections, room multiplexing, and event broadcasting.
 * 
 * Rooms per entity:
 * - order:{id}   -> Broadcasts status updates and live delivery coordinates to customer & merchant
 * - zone:{id}    -> Broadcasts order batching and dispatch notifications to zone agents & local drivers
 * - driver:{id}  -> Direct driver dispatch offers, task reassignments, and turn-by-turn alerts
 * 
 * Events:
 * - order.status       -> Order lifecycle transitions (PAYMENT_CONFIRMED, PREPARING, OUT_FOR_DELIVERY, etc.)
 * - delivery.location  -> Real-time driver GPS coordinates (latitude, longitude, bearing, speed)
 * - batch.update       -> Rural 21:00 cutoff batching aggregation & morning 05:00-08:00 dispatch windows
 * ============================================================================
 */

let ioInstance = null;

/**
 * Normalizes room name into canonical format
 * @param {string} type - 'order' | 'zone' | 'driver'
 * @param {string|number} id
 * @returns {string} e.g. 'order:123'
 */
function getRoomName(type, id) {
  return `${type}:${id}`;
}

/**
 * Initializes Socket.IO server with room routing and telemetry handlers
 * @param {import('socket.io').Server} io
 * @returns {import('socket.io').Server}
 */
function initRealtime(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // 1. Order Room Handlers
    socket.on('join_order', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
    socket.on('join:order', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
    socket.on('leave_order', (orderId) => {
      if (orderId) socket.leave(`order:${orderId}`);
    });
    socket.on('leave:order', (orderId) => {
      if (orderId) socket.leave(`order:${orderId}`);
    });

    // 2. Zone Room Handlers
    socket.on('join_zone', (zoneId) => {
      if (zoneId) socket.join(`zone:${zoneId}`);
    });
    socket.on('join:zone', (zoneId) => {
      if (zoneId) socket.join(`zone:${zoneId}`);
    });
    socket.on('leave_zone', (zoneId) => {
      if (zoneId) socket.leave(`zone:${zoneId}`);
    });
    socket.on('leave:zone', (zoneId) => {
      if (zoneId) socket.leave(`zone:${zoneId}`);
    });

    // 3. Driver Room Handlers
    socket.on('join_driver', (driverId) => {
      if (driverId) socket.join(`driver:${driverId}`);
    });
    socket.on('join:driver', (driverId) => {
      if (driverId) socket.join(`driver:${driverId}`);
    });
    socket.on('leave_driver', (driverId) => {
      if (driverId) socket.leave(`driver:${driverId}`);
    });
    socket.on('leave:driver', (driverId) => {
      if (driverId) socket.leave(`driver:${driverId}`);
    });

    // 4. Generic Canonical Room Join/Leave (e.g. 'order:ord_123', 'zone:z_south', 'driver:drv_9')
    socket.on('join', (room) => {
      if (typeof room === 'string' && (room.startsWith('order:') || room.startsWith('zone:') || room.startsWith('driver:'))) {
        socket.join(room);
      }
    });

    socket.on('leave', (room) => {
      if (typeof room === 'string') {
        socket.leave(room);
      }
    });

    // 5. Driver Telemetry Ingestion via WebSocket
    socket.on('delivery.location', (data) => {
      if (data && data.deliveryId) {
        emitDeliveryLocation(data.deliveryId, data);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

/**
 * Returns active Socket.IO server instance
 * @returns {import('socket.io').Server|null}
 */
function getIO() {
  return ioInstance;
}

/**
 * Emits 'order.status' event to room order:{orderId} and optionally zone:{zoneId}
 * @param {string} orderId
 * @param {object} payload
 */
function emitOrderStatus(orderId, payload = {}) {
  if (!ioInstance) return;
  const eventPayload = {
    orderId,
    status: payload.status,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // Broadcast to target order room
  ioInstance.to(`order:${orderId}`).emit('order.status', eventPayload);

  // Optional zone broadcast for agent/dispatch visibility
  if (payload.zoneId) {
    ioInstance.to(`zone:${payload.zoneId}`).emit('order.status', eventPayload);
  }

  // Also emit to all for monitoring/testing if no clients in room
  ioInstance.emit('order.status', eventPayload);
}

/**
 * Emits 'delivery.location' event to order:{orderId}, driver:{driverId}, and broadcast
 * @param {string} deliveryId
 * @param {object} locationData
 */
function emitDeliveryLocation(deliveryId, locationData = {}) {
  if (!ioInstance) return;
  const eventPayload = {
    deliveryId,
    latitude: locationData.latitude ?? locationData.lat,
    longitude: locationData.longitude ?? locationData.lng,
    speed: locationData.speed ?? null,
    bearing: locationData.bearing ?? null,
    timestamp: new Date().toISOString(),
    ...locationData,
  };

  // Target specific order room if orderId known
  if (locationData.orderId) {
    ioInstance.to(`order:${locationData.orderId}`).emit('delivery.location', eventPayload);
  }

  // Target driver room
  if (locationData.driverId) {
    ioInstance.to(`driver:${locationData.driverId}`).emit('delivery.location', eventPayload);
  }

  // Global channel for live operations map
  ioInstance.emit('delivery.location', eventPayload);
}

/**
 * Emits 'batch.update' event to zone:{zoneId} and broadcast
 * @param {string} batchId
 * @param {object} batchData
 */
function emitBatchUpdate(batchId, batchData = {}) {
  if (!ioInstance) return;
  const eventPayload = {
    batchId,
    timestamp: new Date().toISOString(),
    ...batchData,
  };

  if (batchData.zoneId) {
    ioInstance.to(`zone:${batchData.zoneId}`).emit('batch.update', eventPayload);
  }

  ioInstance.emit('batch.update', eventPayload);
}

module.exports = {
  initRealtime,
  getIO,
  getRoomName,
  emitOrderStatus,
  emitDeliveryLocation,
  emitBatchUpdate,
};
