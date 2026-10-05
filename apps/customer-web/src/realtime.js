/**
 * ============================================================================
 * QUIKOOO CUSTOMER WEB - REALTIME DISPATCH & TRACKING HOOK
 * ============================================================================
 * 
 * ARCHITECTURE & RESILIENCE DOCUMENTATION:
 * ----------------------------------------------------------------------------
 * 1. REALTIME WEBSOCKET LAYER (Socket.IO):
 *    - Connects directly to Quikooo backend via WebSocket.
 *    - Channels / Rooms:
 *      * `order:{id}`  -> Receives order status updates ('order.status') and live
 *                         delivery partner telemetry ('delivery.location').
 *      * `zone:{id}`   -> Receives regional alerts and cutoff batching updates ('batch.update').
 *    - Events:
 *      * `order.status`      -> Triggered when payments are confirmed by webhook,
 *                               merchant starts kitchen prep, or driver picks up.
 *      * `delivery.location` -> Real-time GPS stream (lat, lng, speed, bearing).
 * 
 * 2. OPTIONAL FALLBACK TO HTTP POLLING:
 *    - In low-bandwidth rural networks (2G/EDGE), environments with strict corporate
 *      proxies blocking WebSockets, or when the optional `socket.io-client` library
 *      is omitted from the initial bundle, this hook gracefully degrades to HTTP polling.
 *    - Queries `/api/v1/orders/:id` and `/api/v1/delivery/:id/track` at configurable
 *      intervals (default: 5000ms).
 *    - If WebSocket connection recovers or connects successfully, polling is paused
 *      automatically to conserve mobile battery and network quota.
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getOrderById } from './api.js';

const DEFAULT_POLL_INTERVAL_MS = 5000;
const API_BASE = '/api/v1';

/**
 * Safely resolves the Socket.IO client instance if available in the environment
 * @returns {Promise<any|null>}
 */
let cachedIo = null;
export async function getSocketIoClient() {
  if (cachedIo) return cachedIo;

  // 1. Check window global (e.g. if loaded via CDN script tag)
  if (typeof window !== 'undefined' && window.io) {
    cachedIo = window.io;
    return cachedIo;
  }

  // 2. Optional dynamic import of 'socket.io-client'
  try {
    const module = await import(/* @vite-ignore */ 'socket.io-client');
    cachedIo = module.io || module.default || module;
    return cachedIo;
  } catch (err) {
    // socket.io-client not installed or failed to import; fallback will activate
    return null;
  }
}

/**
 * Fetch delivery tracking info via HTTP REST
 * @param {string} deliveryId
 */
export async function fetchDeliveryTrack(deliveryId) {
  try {
    const res = await fetch(`${API_BASE}/delivery/${deliveryId}/track`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    return null;
  }
}

/**
 * React Hook: useRealtimeOrder
 * Subscribes to real-time status and delivery location for a specific order.
 * Automatically falls back to HTTP polling if WebSocket is unavailable.
 * 
 * @param {string} orderId - ID of order to track
 * @param {object} options
 * @param {number} options.pollInterval - Polling interval in ms (default: 5000)
 * @param {object} options.initialOrder - Initial order state
 * @returns {{
 *   order: object|null,
 *   deliveryLocation: object|null,
 *   isConnected: boolean,
 *   isPolling: boolean,
 *   error: Error|null,
 *   refresh: () => Promise<void>
 * }}
 */
export function useRealtimeOrder(orderId, options = {}) {
  const { pollInterval = DEFAULT_POLL_INTERVAL_MS, initialOrder = null } = options;

  const [order, setOrder] = useState(initialOrder);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Manual refresh trigger
  const refresh = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await getOrderById(orderId);
      if (isMountedRef.current && data) {
        setOrder((prev) => ({ ...(prev || {}), ...data }));
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err);
      }
    }
  }, [orderId]);

  // Polling fallback loop
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    setIsPolling(true);

    const poll = async () => {
      if (!isMountedRef.current || !orderId) return;
      try {
        const [ordData, trackData] = await Promise.all([
          getOrderById(orderId).catch(() => null),
          fetchDeliveryTrack(orderId).catch(() => null),
        ]);

        if (isMountedRef.current) {
          if (ordData) {
            setOrder((prev) => ({ ...(prev || {}), ...ordData }));
          }
          if (trackData && trackData.currentLocation) {
            setDeliveryLocation(trackData.currentLocation);
          }
        }
      } catch (err) {
        if (isMountedRef.current) setError(err);
      }
    };

    // Immediate initial poll
    poll();
    pollTimerRef.current = setInterval(poll, pollInterval);
  }, [orderId, pollInterval]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (!orderId) return;

    let socket = null;

    async function initSocketConnection() {
      const ioClient = await getSocketIoClient();

      if (!ioClient) {
        // Socket.IO client unavailable; seamlessly fall back to HTTP polling
        startPolling();
        return;
      }

      try {
        const socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
        socket = ioClient(socketUrl, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          if (!isMountedRef.current) return;
          setIsConnected(true);
          stopPolling(); // Stop HTTP polling when realtime socket is active

          // Join target order room
          socket.emit('join:order', orderId);
          socket.emit('join', `order:${orderId}`);
        });

        socket.on('order.status', (data) => {
          if (!isMountedRef.current) return;
          if (data && (data.orderId === orderId || !data.orderId)) {
            setOrder((prev) => ({
              ...(prev || {}),
              status: data.status || prev?.status,
              ...data,
            }));
          }
        });

        socket.on('delivery.location', (data) => {
          if (!isMountedRef.current) return;
          if (data && (data.orderId === orderId || data.deliveryId === orderId || !data.orderId)) {
            setDeliveryLocation({
              latitude: data.latitude,
              longitude: data.longitude,
              speed: data.speed,
              bearing: data.bearing,
              timestamp: data.timestamp,
            });
          }
        });

        socket.on('disconnect', () => {
          if (!isMountedRef.current) return;
          setIsConnected(false);
          // Socket disconnected: start polling as fallback until reconnected
          startPolling();
        });

        socket.on('connect_error', () => {
          if (!isMountedRef.current) return;
          setIsConnected(false);
          startPolling();
        });
      } catch (err) {
        setIsConnected(false);
        startPolling();
      }
    }

    initSocketConnection();

    return () => {
      isMountedRef.current = false;
      stopPolling();
      if (socket) {
        socket.emit('leave:order', orderId);
        socket.disconnect();
      }
    };
  }, [orderId, startPolling, stopPolling]);

  return {
    order,
    deliveryLocation,
    isConnected,
    isPolling,
    error,
    refresh,
  };
}

/**
 * React Hook: useRealtimeDelivery
 * Subscribes to live driver coordinates for an active delivery assignment
 * 
 * @param {string} deliveryId
 * @param {object} options
 */
export function useRealtimeDelivery(deliveryId, options = {}) {
  const { pollInterval = 4000 } = options;
  const [location, setLocation] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    let timer = null;
    let socket = null;
    let isMounted = true;

    async function init() {
      const ioClient = await getSocketIoClient();
      if (ioClient) {
        try {
          const socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
          socket = ioClient(socketUrl, { transports: ['websocket', 'polling'] });
          socket.on('connect', () => {
            if (isMounted) setIsConnected(true);
            socket.emit('join', `driver:${deliveryId}`);
          });
          socket.on('delivery.location', (data) => {
            if (isMounted && data) {
              setLocation(data);
            }
          });
          socket.on('disconnect', () => {
            if (isMounted) setIsConnected(false);
          });
          return;
        } catch (e) {
          // Fall back to polling
        }
      }

      // Polling fallback
      setIsPolling(true);
      const poll = async () => {
        const data = await fetchDeliveryTrack(deliveryId);
        if (isMounted && data && data.currentLocation) {
          setLocation(data.currentLocation);
        }
      };
      poll();
      timer = setInterval(poll, pollInterval);
    }

    init();

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
      if (socket) socket.disconnect();
    };
  }, [deliveryId, pollInterval]);

  return { location, isConnected, isPolling };
}
