/**
 * QUIKOOO Agent App API Client & Rural Logistics Engine
 * Source of Truth: docs/FULL-PLATFORM-PLAN.md (Sections 1.2, 4.3, 7.6)
 * backend/src/services/ZoneService.js & backend/src/services/FinancialLedgerService.js
 */

const API_BASE = '/api/v1';

export const AGENT_SHARE_PERCENT = 60.0;
export const QUIKOOO_SHARE_PERCENT = 40.0;
export const DELIVERY_FEE_RATE = 25.0;
export const RURAL_CUTOFF = '21:00';
export const RURAL_DELIVERY_WINDOW_START = '05:00';
export const RURAL_DELIVERY_WINDOW_END = '08:00';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Rounds a number strictly to 2 decimal places
 * @param {number} val
 * @returns {number}
 */
export function round2(val) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a number as Indian Rupee (INR)
 * @param {number} val
 * @returns {string}
 */
export function formatINR(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);
}

/**
 * Determines if a rural scheduled order is eligible based on the 21:00 Asia/Kolkata cutoff.
 * Strict inequality: At cutoff (21:00 = 1260 mins), ordering window is closed.
 * 
 * - 20:30 -> eligible: true
 * - 20:59 -> eligible: true
 * - 21:00 -> eligible: false (cutoff reached, closed for morning batch)
 * - 21:01 -> eligible: false
 * 
 * @param {Date|string} orderTime - Time string "HH:MM" or Date object or ISO string
 * @param {string} [cutoff='21:00']
 * @param {string} [timezone='Asia/Kolkata']
 * @returns {boolean}
 */
export function isRuralOrderEligible(orderTime = new Date(), cutoff = RURAL_CUTOFF, timezone = DEFAULT_TIMEZONE) {
  let hours;
  let minutes;

  if (typeof orderTime === 'string' && /^\d{1,2}:\d{2}$/.test(orderTime.trim())) {
    const parts = orderTime.trim().split(':');
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
  } else {
    const date = orderTime instanceof Date ? orderTime : new Date(orderTime);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date/time provided: ${orderTime}`);
    }

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
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

  return orderTotalMinutes < cutoffTotalMinutes;
}

/**
 * Gets rural morning batch window metadata (05:00 - 08:00 Asia/Kolkata)
 * 
 * @param {Date|string} [deliveryDate]
 * @returns {Object}
 */
export function getDeliveryBatch(deliveryDate) {
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
    windowStart: RURAL_DELIVERY_WINDOW_START,
    windowEnd: RURAL_DELIVERY_WINDOW_END,
    windowLabel: `Rural Morning Dispatch (${RURAL_DELIVERY_WINDOW_START} - ${RURAL_DELIVERY_WINDOW_END})`,
    batchId: `BATCH_${dateStr.replace(/-/g, '')}_MORNING`,
    timezone: DEFAULT_TIMEZONE,
  };
}

/**
 * Splits adjusted net pool between Local Zone Agent (60%) and QUIKOOO Platform (40%)
 * Canonical example: 13.94 net revenue -> 8.36 Agent (60%), 5.58 Quikooo (40%)
 * 
 * @param {number} adjustedAmount - Net platform revenue pool
 * @param {number} [agentPercent=60]
 * @param {number} [quikoooPercent=40]
 * @returns {Object}
 */
export function calculateRevenueSplit(
  adjustedAmount,
  agentPercent = AGENT_SHARE_PERCENT,
  quikoooPercent = QUIKOOO_SHARE_PERCENT
) {
  const adjusted = round2(adjustedAmount);
  const agentShare = round2(adjusted * (agentPercent / 100));
  const quikoooShare = round2(adjusted - agentShare);

  return {
    adjustedAmount: adjusted,
    agentPercent,
    quikoooPercent,
    agentShare,
    quikoooShare,
  };
}

/**
 * Calculates delivery fee inflow: 25 * n
 * Crucial Rule: Delivery inflow is a 100% pass-through payout to delivery drivers.
 * It is completely separate from the agent's 60% commission pool.
 * 
 * @param {number} deliveryCount
 * @param {number} [rate=25.0]
 * @returns {Object}
 */
export function calculateDeliveryInflow(deliveryCount, rate = DELIVERY_FEE_RATE) {
  const count = Math.max(0, parseInt(deliveryCount, 10) || 0);
  const ratePerDelivery = Number(rate) || DELIVERY_FEE_RATE;
  const deliveryInflow = round2(count * ratePerDelivery);
  const driverPayout = deliveryInflow;
  const netDeliveryRetention = 0.0;

  return {
    deliveryCount: count,
    ratePerDelivery,
    deliveryInflow,
    driverPayout,
    netDeliveryRetention,
    isSeparateFromPlatformPool: true,
  };
}

/**
 * Calculates holistic zone economics
 * 
 * @param {Object} params
 * @param {number} params.ordersCount
 * @param {number} [params.adjustedContributionPerOrder=13.94]
 * @param {number} [params.gmv=0]
 * @returns {Object}
 */
export function calculateNetEconomics({
  ordersCount = 0,
  adjustedContributionPerOrder = 13.94,
  gmv = 0,
} = {}) {
  const count = Math.max(0, parseInt(ordersCount, 10) || 0);
  const contributionPerOrder = Number(adjustedContributionPerOrder) || 13.94;
  const adjustedPool = round2(count * contributionPerOrder);
  const split = calculateRevenueSplit(adjustedPool, AGENT_SHARE_PERCENT, QUIKOOO_SHARE_PERCENT);
  const delivery = calculateDeliveryInflow(count, DELIVERY_FEE_RATE);

  return {
    ordersCount: count,
    gmv: Number(gmv) || 0,
    adjustedContributionPerOrder: contributionPerOrder,
    adjustedPool: split.adjustedAmount,
    agentShare: split.agentShare,
    quikoooShare: split.quikoooShare,
    deliveryInflow: delivery.deliveryInflow,
    driverPayout: delivery.driverPayout,
    deliveryPassThrough: true,
    totalAgentEarnings: split.agentShare,
  };
}

/**
 * In-Memory 60s SWR Cache for GET requests
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
 * Calculates remaining countdown time until 21:00 Asia/Kolkata cutoff
 * @param {Date} [currentTime]
 */
export function calculateCutoffCountdown(currentTime = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formatted = formatter.format(currentTime);
  const [h, m, s] = formatted.split(':').map(Number);
  const currentTotalSeconds = h * 3600 + m * 60 + s;
  const cutoffTotalSeconds = 21 * 3600; // 21:00:00 = 75,600 seconds

  if (currentTotalSeconds >= cutoffTotalSeconds) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isPassed: true,
      formatted: '00:00:00 (Locked)',
    };
  }

  const diff = cutoffTotalSeconds - currentTotalSeconds;
  const remH = Math.floor(diff / 3600);
  const remM = Math.floor((diff % 3600) / 60);
  const remS = diff % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return {
    hours: remH,
    minutes: remM,
    seconds: remS,
    totalSeconds: diff,
    isPassed: false,
    formatted: `${pad(remH)}h : ${pad(remM)}m : ${pad(remS)}s`,
  };
}

/**
 * Generic API Fetch Helper with SWR Caching for GET
 */
async function apiFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (method === 'GET') {
    const cached = apiCache.get(endpoint);
    const now = Date.now();
    if (cached) {
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
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
 * GET /api/v1/agents/:id/analytics
 * Fetches zone analytics for the specified agent
 * 
 * @param {string} [agentId='agent-1']
 * @returns {Promise<Object>}
 */
export async function getAgentAnalytics(agentId = 'agent-1') {
  try {
    const res = await apiFetch(`/agents/${agentId}/analytics`);
    if (res && res.data) return res.data;
  } catch (err) {
    console.warn('[Agent API] GET /agents/:id/analytics fallback to stub:', err.message);
  }

  // Authoritative fallback stub matching platform economics (342 orders)
  const ordersCount = 342;
  const netEcon = calculateNetEconomics({
    ordersCount,
    adjustedContributionPerOrder: 13.94,
    gmv: 46170.0,
  });

  return {
    agentId,
    agentCode: 'AG-ZN-RUR-01',
    zoneId: 'zone-rural-1',
    zoneName: 'Karnataka Rural Hub - South Sector',
    totalVendors: 14,
    activeVendors: 12,
    totalDrivers: 18,
    activeDrivers: 11,
    totalOrders: ordersCount,
    ruralScheduledOrders: 28,
    zoneGmv: 46170.0,
    adjustedContributionPool: netEcon.adjustedPool, // 4767.48
    agentCommissionShare: netEcon.agentShare, // 2860.49 (60%)
    platformShare: netEcon.quikoooShare, // 1906.99 (40%)
    deliveryInflow: netEcon.deliveryInflow, // 8550.00 (342 * 25)
    driverPayout: netEcon.driverPayout, // 8550.00
    period: 'THIS_MONTH',
  };
}

/**
 * GET /api/v1/agents/:id/payouts
 * Fetches payout settlements for the agent
 * 
 * @param {string} [agentId='agent-1']
 * @returns {Promise<Object>}
 */
export async function getAgentPayouts(agentId = 'agent-1') {
  try {
    const res = await apiFetch(`/agents/${agentId}/payouts`);
    if (res && res.data) return res.data;
  } catch (err) {
    console.warn('[Agent API] GET /agents/:id/payouts fallback to stub:', err.message);
  }

  return {
    agentId,
    agentCode: 'AG-ZN-RUR-01',
    zoneId: 'zone-rural-1',
    commissionSharePercent: AGENT_SHARE_PERCENT,
    totalEarned: 8360.0,
    totalPaid: 6000.0,
    pendingPayout: 2360.0,
    currency: 'INR',
    payoutHistory: [
      {
        id: 'PAY-20261001-01',
        date: '2026-10-01',
        amount: 3000.0,
        status: 'PAID',
        reference: 'NEFT-RBZ-889101',
        bankAccount: '•••• 4521 (HDFC Bank)',
      },
      {
        id: 'PAY-20260924-02',
        date: '2026-09-24',
        amount: 3000.0,
        status: 'PAID',
        reference: 'NEFT-RBZ-771890',
        bankAccount: '•••• 4521 (HDFC Bank)',
      },
    ],
  };
}

/**
 * GET /api/v1/zones
 * Fetches operational zones
 * 
 * @returns {Promise<Array>}
 */
export async function getZones() {
  try {
    const res = await apiFetch('/zones');
    if (res && res.data) return res.data;
  } catch (err) {
    console.warn('[Agent API] GET /zones fallback to stub:', err.message);
  }

  return [
    {
      id: 'zone-rural-1',
      code: 'ZN-RUR-SOUTH-01',
      name: 'Mandya & Maddur Rural Cluster',
      type: 'RURAL',
      radiusKm: 15.0,
      cutoffTime: '21:00',
      morningDispatchWindow: '05:00 - 08:00',
      activeVendorsCount: 12,
      activeDriversCount: 11,
      assignedAgentId: 'agent-1',
    },
    {
      id: 'zone-suburban-1',
      code: 'ZN-SUB-BLR-02',
      name: 'Kengeri Satellite Hub',
      type: 'SUB_URBAN',
      radiusKm: 2.0,
      activeVendorsCount: 18,
      activeDriversCount: 14,
      assignedAgentId: 'agent-2',
    },
    {
      id: 'zone-urban-1',
      code: 'ZN-URB-BLR-01',
      name: 'Indiranagar Urban Node',
      type: 'URBAN',
      radiusKm: 2.0,
      activeVendorsCount: 24,
      activeDriversCount: 16,
      assignedAgentId: 'agent-3',
    },
  ];
}

/**
 * In-memory stores for interactive prototyping
 */
let memoryVendors = [
  {
    id: 'ven-101',
    name: 'Kaveri Fresh Organics & Dairy',
    ownerName: 'Ramesh Gowda',
    phone: '+91 98451 22345',
    category: 'Farm Dairy & Veggies',
    zoneId: 'zone-rural-1',
    status: 'ACTIVE',
    commissionPercent: 10,
    markupPercent: 5,
    itemsCount: 42,
    address: 'Koppa Gate, Mandya Rural Road',
    joinedDate: '2026-08-15',
  },
  {
    id: 'ven-102',
    name: 'Sri Lakshmi Provision Stores',
    ownerName: 'Suresh Kumar',
    phone: '+91 94480 33211',
    category: 'Groceries & Staples',
    zoneId: 'zone-rural-1',
    status: 'ACTIVE',
    commissionPercent: 10,
    markupPercent: 5,
    itemsCount: 68,
    address: 'Old Bazaar, Maddur Main Rd',
    joinedDate: '2026-08-20',
  },
  {
    id: 'ven-103',
    name: 'Annapoorna Country Kitchen',
    ownerName: 'Devika Rani',
    phone: '+91 99001 55678',
    category: 'Fresh Prepared Meals',
    zoneId: 'zone-rural-1',
    status: 'ACTIVE',
    commissionPercent: 10,
    markupPercent: 5,
    itemsCount: 19,
    address: 'Near Village Panchayat Hall, Gejjalagere',
    joinedDate: '2026-09-01',
  },
  {
    id: 'ven-104',
    name: 'Green Field Poultry & Eggs',
    ownerName: 'Manoj Basavaraj',
    phone: '+91 98860 77123',
    category: 'Poultry & Meat',
    zoneId: 'zone-rural-1',
    status: 'PENDING_KYC',
    commissionPercent: 10,
    markupPercent: 5,
    itemsCount: 12,
    address: 'Plot 4, Mandya Farm Road',
    joinedDate: '2026-10-04',
  },
];

let memoryDrivers = [
  {
    id: 'drv-201',
    name: 'Basavaraj Shivappa',
    phone: '+91 97412 88901',
    vehicle: 'Hero Splendor (KA-11-E-4512)',
    status: 'ON_DUTY',
    zoneId: 'zone-rural-1',
    tripsCompleted: 84,
    rating: 4.88,
    joinedDate: '2026-08-18',
    payoutTally: 2100.0,
  },
  {
    id: 'drv-202',
    name: 'Chethan Prakash',
    phone: '+91 96200 44512',
    vehicle: 'Honda Activa (KA-11-S-8921)',
    status: 'ON_DUTY',
    zoneId: 'zone-rural-1',
    tripsCompleted: 62,
    rating: 4.92,
    joinedDate: '2026-08-28',
    payoutTally: 1550.0,
  },
  {
    id: 'drv-203',
    name: 'Raghu Ramanna',
    phone: '+91 98455 12099',
    vehicle: 'Mahindra Bolero Pickup (KA-11-TR-9002)',
    status: 'AVAILABLE',
    zoneId: 'zone-rural-1',
    tripsCompleted: 110,
    rating: 4.95,
    joinedDate: '2026-08-10',
    payoutTally: 2750.0,
  },
  {
    id: 'drv-204',
    name: 'Praveen Gowda',
    phone: '+91 99160 33490',
    vehicle: 'TVS Jupiter (KA-11-M-3321)',
    status: 'PENDING_APPROVAL',
    zoneId: 'zone-rural-1',
    tripsCompleted: 0,
    rating: 5.0,
    joinedDate: '2026-10-03',
    payoutTally: 0.0,
  },
];

let memoryBatchOrders = [
  {
    id: 'ord-rur-901',
    orderNumber: 'QK-RUR-20261005-01',
    customerName: 'Giridhariah M.',
    village: 'Gejjalagere Hamlet #2',
    items: [
      { name: 'Kaveri Farm Fresh Milk (1L)', qty: 2, vendor: 'Kaveri Fresh Organics' },
      { name: 'Local Farm Eggs (Pack of 12)', qty: 1, vendor: 'Green Field Poultry' },
    ],
    originalTotal: 160.0,
    customerPayable: 198.0,
    status: 'SCHEDULED_FOR_NEXT_DAY',
    placedAt: '2026-10-05T18:45:00.000Z',
    deliveryDate: '2026-10-06',
    window: '05:00 - 08:00',
  },
  {
    id: 'ord-rur-902',
    orderNumber: 'QK-RUR-20261005-02',
    customerName: 'Shanthamma Gowda',
    village: 'Koppa Grama Cross',
    items: [
      { name: 'Whole Wheat Atta (5kg)', qty: 1, vendor: 'Sri Lakshmi Provisions' },
      { name: 'Cold Pressed Sunflower Oil (1L)', qty: 1, vendor: 'Sri Lakshmi Provisions' },
    ],
    originalTotal: 340.0,
    customerPayable: 387.0,
    status: 'SCHEDULED_FOR_NEXT_DAY',
    placedAt: '2026-10-05T19:30:00.000Z',
    deliveryDate: '2026-10-06',
    window: '05:00 - 08:00',
  },
  {
    id: 'ord-rur-903',
    orderNumber: 'QK-RUR-20261005-03',
    customerName: 'Hemanth Kumar',
    village: 'Maddur Station Outskirts',
    items: [
      { name: 'Fresh Country Curd (500g)', qty: 2, vendor: 'Kaveri Fresh Organics' },
      { name: 'Morning Filter Coffee Powder (250g)', qty: 1, vendor: 'Annapoorna Country Kitchen' },
    ],
    originalTotal: 180.0,
    customerPayable: 219.0,
    status: 'SCHEDULED_FOR_NEXT_DAY',
    placedAt: '2026-10-05T20:15:00.000Z',
    deliveryDate: '2026-10-06',
    window: '05:00 - 08:00',
  },
  {
    id: 'ord-rur-904',
    orderNumber: 'QK-RUR-20261005-04',
    customerName: 'Mahadevappa B.',
    village: 'Shivalli Extension',
    items: [
      { name: 'Sona Masoori Rice (10kg)', qty: 1, vendor: 'Sri Lakshmi Provisions' },
    ],
    originalTotal: 650.0,
    customerPayable: 712.5,
    status: 'SCHEDULED_FOR_NEXT_DAY',
    placedAt: '2026-10-05T20:55:00.000Z',
    deliveryDate: '2026-10-06',
    window: '05:00 - 08:00',
  },
];

/**
 * POST vendor onboard stub
 * POST /api/v1/vendors (with resilient fallback stub)
 * 
 * @param {Object} vendorData
 * @returns {Promise<Object>}
 */
export async function onboardVendor(vendorData) {
  if (!vendorData || !vendorData.name) {
    throw new Error('Vendor name is required for onboarding');
  }

  try {
    const res = await apiFetch('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendorData),
    });
    if (res && res.data) {
      memoryVendors.unshift(res.data);
      return res.data;
    }
  } catch (err) {
    console.warn('[Agent API] POST /vendors fallback to memory stub');
  }

  const newVendor = {
    id: `ven-${Date.now().toString().slice(-4)}`,
    name: vendorData.name,
    ownerName: vendorData.ownerName || 'Store Proprietor',
    phone: vendorData.phone || '+91 90000 00000',
    category: vendorData.category || 'General Store',
    zoneId: vendorData.zoneId || 'zone-rural-1',
    status: 'ACTIVE',
    commissionPercent: 10,
    markupPercent: 5,
    itemsCount: parseInt(vendorData.itemsCount, 10) || 0,
    address: vendorData.address || 'Rural Zone Partner Hub',
    joinedDate: new Date().toISOString().split('T')[0],
    _stub: true,
  };

  memoryVendors.unshift(newVendor);
  return newVendor;
}

/**
 * Get vendors roster for zone
 * @param {string} [zoneId='zone-rural-1']
 */
export async function getVendors(zoneId = 'zone-rural-1') {
  return [...memoryVendors];
}

/**
 * Approve or toggle vendor status
 * @param {string} vendorId
 */
export async function toggleVendorStatus(vendorId) {
  const vendor = memoryVendors.find((v) => v.id === vendorId);
  if (vendor) {
    vendor.status = vendor.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    return { ...vendor };
  }
  return null;
}

/**
 * Get drivers roster for zone
 * @param {string} [zoneId='zone-rural-1']
 */
export async function getDrivers(zoneId = 'zone-rural-1') {
  return [...memoryDrivers];
}

/**
 * Onboard new driver partner
 * @param {Object} driverData
 */
export async function onboardDriver(driverData) {
  if (!driverData || !driverData.name) {
    throw new Error('Driver name is required');
  }

  const newDriver = {
    id: `drv-${Date.now().toString().slice(-4)}`,
    name: driverData.name,
    phone: driverData.phone || '+91 90000 00000',
    vehicle: driverData.vehicle || 'Motorcycle',
    status: 'ON_DUTY',
    zoneId: driverData.zoneId || 'zone-rural-1',
    tripsCompleted: 0,
    rating: 5.0,
    joinedDate: new Date().toISOString().split('T')[0],
    payoutTally: 0.0,
    _stub: true,
  };

  memoryDrivers.unshift(newDriver);
  return newDriver;
}

/**
 * Approve pending driver
 * @param {string} driverId
 */
export async function approveDriver(driverId) {
  const driver = memoryDrivers.find((d) => d.id === driverId);
  if (driver) {
    driver.status = 'ON_DUTY';
    return { ...driver };
  }
  return null;
}

/**
 * Get orders scheduled for next-day rural morning batch
 * 
 * @param {string} [deliveryDate]
 * @returns {Promise<Array>}
 */
export async function getRuralBatchOrders(deliveryDate) {
  const batchMeta = getDeliveryBatch(deliveryDate);
  return memoryBatchOrders.map((ord) => ({
    ...ord,
    batchId: batchMeta.batchId,
    window: `${batchMeta.windowStart} - ${batchMeta.windowEnd}`,
  }));
}

/**
 * Transition rural orders from SCHEDULED_FOR_NEXT_DAY to READY_FOR_MORNING_DISPATCH
 * 
 * @param {string} batchId
 * @param {Array<string>} [orderIds]
 * @returns {Promise<Object>}
 */
export async function dispatchRuralBatch(batchId, orderIds = []) {
  const idsToUpdate = orderIds.length > 0
    ? orderIds
    : memoryBatchOrders.map((o) => o.id);

  let updatedCount = 0;
  memoryBatchOrders = memoryBatchOrders.map((order) => {
    if (idsToUpdate.includes(order.id) && order.status === 'SCHEDULED_FOR_NEXT_DAY') {
      updatedCount += 1;
      return {
        ...order,
        status: 'READY_FOR_MORNING_DISPATCH',
        dispatchedBatchId: batchId,
        lockedAt: new Date().toISOString(),
      };
    }
    return order;
  });

  return {
    success: true,
    batchId,
    transition: 'SCHEDULED_FOR_NEXT_DAY -> READY_FOR_MORNING_DISPATCH',
    ordersUpdated: updatedCount,
    dispatchedWindow: '05:00 - 08:00',
    timestamp: new Date().toISOString(),
  };
}
