/**
 * QUIKOOO Merchant Studio API Client & State Machine Helpers
 * Connects to Express backend /api/v1
 * Source of Truth: docs/FULL-PLATFORM-PLAN.md & backend/src/services/OrderService.js
 * 2026 Perf: 60s in-memory SWR cache for GET, debounce 300ms, never cache POST
 */

const API_BASE = '/api/v1';

/**
 * In-memory 60s SWR Cache for GET requests
 */
const apiCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

export function clearApiCache() {
  apiCache.clear();
}

/**
 * Standard debounce utility (300ms default)
 */
export function debounce(fn, delay = 300) {
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

/**
 * Valid kitchen state progression per OrderService state machine:
 * ORDER_PLACED -> VENDOR_ACCEPTED -> PREPARING -> READY_FOR_PICKUP
 */
export const MERCHANT_TRANSITIONS = {
  ORDER_PLACED: 'VENDOR_ACCEPTED',
  VENDOR_ACCEPTED: 'PREPARING',
  PREPARING: 'READY_FOR_PICKUP',
};

/**
 * Transition Action Button Labels
 */
export const TRANSITION_LABELS = {
  ORDER_PLACED: {
    next: 'VENDOR_ACCEPTED',
    label: 'Accept Order',
    btnClass: 'btn-primary',
  },
  VENDOR_ACCEPTED: {
    next: 'PREPARING',
    label: 'Start Cooking',
    btnClass: 'btn-primary',
  },
  PREPARING: {
    next: 'READY_FOR_PICKUP',
    label: 'Mark Ready for Pickup',
    btnClass: 'btn-primary',
  },
  READY_FOR_PICKUP: {
    next: null,
    label: 'Ready for Driver Pickup',
    btnClass: 'btn-secondary',
  },
};

/**
 * Validates and builds payload for order state transition
 */
export function buildTransitionPayload(currentStatus, nextStatus, notes = '') {
  if (!currentStatus || !nextStatus) {
    throw new Error('Both currentStatus and nextStatus are required');
  }

  // Verify transition is valid for merchant kitchen flow
  const expectedNext = MERCHANT_TRANSITIONS[currentStatus];
  if (expectedNext && expectedNext !== nextStatus && nextStatus !== 'CANCELLED') {
    throw new Error(`Invalid merchant transition: cannot transition from ${currentStatus} to ${nextStatus}`);
  }

  return {
    currentStatus,
    nextStatus,
    notes: notes || `Transitioned from ${currentStatus} to ${nextStatus} via Merchant Studio POS`,
  };
}

/**
 * Builds prep time selector payload for kitchen acceptance
 */
export function buildPrepTimePayload(orderId, prepMinutes = 15) {
  const mins = Number(prepMinutes) || 15;
  return {
    orderId,
    prepMinutes: mins,
    estimatedReadyAt: new Date(Date.now() + mins * 60 * 1000).toISOString(),
    notes: `Estimated preparation time: ${mins} minutes`,
  };
}

/**
 * Stock item toggle helper for merchant menu manager
 */
export const INITIAL_MENU_ITEMS = [
  { id: 'item-1', name: 'Special Chicken Biryani Feast', price: 100, customerPrice: 105, inStock: true, category: 'Main Course' },
  { id: 'item-2', name: 'Paneer Butter Masala', price: 100, customerPrice: 105, inStock: true, category: 'Main Course' },
  { id: 'item-3', name: 'Garlic Butter Naan', price: 40, customerPrice: 42, inStock: true, category: 'Breads' },
  { id: 'item-4', name: 'Dal Makhani', price: 80, customerPrice: 84, inStock: true, category: 'Main Course' },
  { id: 'item-5', name: 'Gulab Jamun (2 Pcs)', price: 60, customerPrice: 63, inStock: false, category: 'Desserts' },
];

export function toggleItemStock(items, itemId) {
  return items.map((it) => (it.id === itemId ? { ...it, inStock: !it.inStock } : it));
}

/**
 * Official Canonical Settlement Math (Single Source of Truth)
 * Example: Original Price = ₹100.00
 * Platform Commission (10%) = ₹10.00 (calculated strictly on original price)
 * Vendor Settlement = ₹90.00 (₹100.00 - ₹10.00)
 */
export function calculateSettlement(input, commissionPercent = 10) {
  let original = 0;
  let percent = commissionPercent;

  if (typeof input === 'object' && input !== null) {
    original = Number(input.originalPrice || 0);
    percent = input.commissionPercent !== undefined ? Number(input.commissionPercent) : 10;
  } else {
    original = Number(input || 0);
  }

  // Canonical rounding to 2 decimal places
  const commissionAmount = Math.round(original * (percent / 100) * 100) / 100;
  const vendorSettlement = Math.round((original - commissionAmount) * 100) / 100;

  return {
    originalPrice: original,
    commissionPercent: percent,
    commissionAmount,
    vendorSettlement,
  };
}

/**
 * Standard fetch helper with JSON parsing, error wrapping, and SWR caching for GET
 */
async function apiFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // SWR Caching for GET requests
  if (method === 'GET') {
    const cached = apiCache.get(endpoint);
    const now = Date.now();
    if (cached) {
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
      // Revalidate in background
      fetch(`${API_BASE}${endpoint}`, { ...options, headers })
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh) apiCache.set(endpoint, { data: fresh, timestamp: Date.now() });
        })
        .catch(() => {});
      return cached.data;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = json.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = json;
      throw err;
    }
    apiCache.set(endpoint, { data: json, timestamp: Date.now() });
    return json;
  }

  // Non-GET requests: NEVER CACHED
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = json.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json;
}

/**
 * Fetch vendors list (Stub tolerant)
 * GET /api/v1/vendors (Cached 60s)
 */
export async function getVendors() {
  try {
    const res = await apiFetch('/vendors');
    if (res && res.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('[Merchant API] GET /vendors fallback to stub:', err.message);
  }

  return [
    {
      id: 'vendor-sample-1',
      name: 'Curry & Spice Express',
      businessType: 'RESTAURANT',
      cluster: 'Indiranagar Urban Cluster (2.0 km)',
      commissionPercent: 10,
      menuAdjustmentPercent: 5,
      isAcceptingOrders: true,
      address: '12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru',
    },
  ];
}

/**
 * Fetch vendor orders (Stub tolerant)
 * GET /api/v1/orders?vendorId=...
 */
export async function getOrders(vendorId = 'vendor-sample-1') {
  try {
    const res = await apiFetch(`/orders?vendorId=${vendorId}`);
    if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
    if (res && res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
      return res.data.items;
    }
  } catch (err) {
    console.warn('[Merchant API] GET /orders fallback to stub:', err.message);
  }

  // Fallback initial active kitchen orders with exact 100 -> 90 canonical settlement
  return [
    {
      id: 'ord-101',
      orderNumber: 'QK-20261005-101',
      customerName: 'Aarav Sharma',
      customerPhone: '+91 98765 43210',
      items: [
        { productId: 'p1', name: 'Chicken Biryani Feast', quantity: 2, originalPrice: 100, customerPrice: 105 }
      ],
      totalOriginalPrice: 200,
      subtotal: 210,
      platformFee: 5,
      deliveryFee: 25,
      customerPayable: 240,
      vendorSettlement: 180,
      status: 'ORDER_PLACED',
      placedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      pickupOtp: '4512',
      prepMinutes: 15,
    },
    {
      id: 'ord-102',
      orderNumber: 'QK-20261005-102',
      customerName: 'Priya Patel',
      customerPhone: '+91 98450 11223',
      items: [
        { productId: 'p2', name: 'Paneer Butter Masala', quantity: 1, originalPrice: 100, customerPrice: 105 }
      ],
      totalOriginalPrice: 100,
      subtotal: 105,
      platformFee: 5,
      deliveryFee: 25,
      customerPayable: 135,
      vendorSettlement: 90,
      status: 'VENDOR_ACCEPTED',
      placedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      pickupOtp: '7823',
      prepMinutes: 12,
    },
    {
      id: 'ord-103',
      orderNumber: 'QK-20261005-103',
      customerName: 'Rahul Verma',
      customerPhone: '+91 97112 34567',
      items: [
        { productId: 'p3', name: 'Garlic Naan & Dal Makhani Combo', quantity: 1, originalPrice: 100, customerPrice: 105 }
      ],
      totalOriginalPrice: 100,
      subtotal: 105,
      platformFee: 5,
      deliveryFee: 25,
      customerPayable: 135,
      vendorSettlement: 90,
      status: 'PREPARING',
      placedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      pickupOtp: '9102',
      prepMinutes: 20,
    },
    {
      id: 'ord-104',
      orderNumber: 'QK-20261005-104',
      customerName: 'Ananya Roy',
      customerPhone: '+91 99001 88776',
      items: [
        { productId: 'p4', name: 'Mutton Kebab Platter', quantity: 1, originalPrice: 100, customerPrice: 105 }
      ],
      totalOriginalPrice: 100,
      subtotal: 105,
      platformFee: 5,
      deliveryFee: 25,
      customerPayable: 135,
      vendorSettlement: 90,
      status: 'READY_FOR_PICKUP',
      placedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      pickupOtp: '3341',
      prepMinutes: 15,
    },
  ];
}

/**
 * Execute Order State Transition
 * POST /api/v1/orders/:id/transition (Stub tolerant) - NEVER CACHED
 */
export async function transitionOrder(orderId, currentStatus, nextStatus, notes = '') {
  const payload = buildTransitionPayload(currentStatus, nextStatus, notes);

  try {
    const res = await apiFetch(`/orders/${orderId}/transition`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res && res.success) {
      return res.data;
    }
  } catch (err) {
    console.warn(`[Merchant API] POST /orders/${orderId}/transition failed (${err.message}). Using stub fallback.`);
  }

  return {
    orderId,
    previousStatus: currentStatus,
    currentStatus: nextStatus,
    notes: payload.notes,
    timestamp: new Date().toISOString(),
    _stub: true,
  };
}

/**
 * Formats a number as Indian Rupee (INR)
 */
export function formatINR(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);
}
