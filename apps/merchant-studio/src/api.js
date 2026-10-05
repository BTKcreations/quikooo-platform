/**
 * QUIKOOO Merchant Studio API Client & State Machine Helpers
 * Connects to Express backend /api/v1
 * Source of Truth: docs/FULL-PLATFORM-PLAN.md & backend/src/services/OrderService.js
 */

const API_BASE = '/api/v1';

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
    label: 'Start Preparing',
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
 * @param {string} currentStatus 
 * @param {string} nextStatus 
 * @param {string} [notes]
 * @returns {{ currentStatus: string, nextStatus: string, notes: string }}
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
 * Official Canonical Settlement Math (Single Source of Truth)
 * Example: Original Price = ₹100.00
 * Platform Commission (10%) = ₹10.00 (calculated strictly on original price)
 * Vendor Settlement = ₹90.00 (₹100.00 - ₹10.00)
 * 
 * @param {number|object} input - Original price or options object { originalPrice, commissionPercent }
 * @param {number} [commissionPercent=10]
 * @returns {{ originalPrice: number, commissionPercent: number, commissionAmount: number, vendorSettlement: number }}
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
 * Standard fetch helper with JSON parsing and error wrapping
 */
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

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
 * GET /api/v1/vendors
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

  // Default fallback merchant store
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
    },
  ];
}

/**
 * Execute Order State Transition
 * POST /api/v1/orders/:id/transition (Stub tolerant if 404)
 * 
 * @param {string} orderId 
 * @param {string} currentStatus 
 * @param {string} nextStatus 
 * @param {string} [notes]
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

  // Stub-tolerant fallback return
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
