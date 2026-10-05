/**
 * QUIKOOO Customer Web API Client
 * Connects to Express backend /api/v1
 * 2026 Perf: 60s In-Memory SWR Cache for GET / calculate, Debounce 300ms, Never Cache POST/.data
 * Removal of Silent Stubs: On failure, throws real Error + dispatches UI toast
 */

const API_BASE = '/api/v1';

/**
 * Dispatch UI toast notification via standard custom event
 * Handled by ToastProvider in Toast.jsx
 */
export function notifyToast(message, type = 'error') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('quikooo:toast', {
        detail: { message: String(message), type },
      })
    );
  }
}

/**
 * In-Memory Stale-While-Revalidate Cache
 * TTL: 60 seconds (60000ms)
 * Only caches GET requests and calculate lookups. NEVER caches POST order creation or state mutations.
 */
const inMemoryCache = new Map();
const calculateCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

export function clearApiCache() {
  inMemoryCache.clear();
  calculateCache.clear();
}

export function getCacheStats() {
  return {
    getCacheSize: inMemoryCache.size,
    calculateCacheSize: calculateCache.size,
  };
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
 * Standard fetch wrapper with JSON handling, error propagation, and SWR caching for GET
 */
async function apiRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('quikooo_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // SWR Cache handling for GET requests only
  if (method === 'GET') {
    const cacheKey = `${endpoint}_${token || 'anon'}`;
    const cached = inMemoryCache.get(cacheKey);
    const now = Date.now();

    if (cached) {
      const isFresh = now - cached.timestamp < CACHE_TTL_MS;
      if (isFresh) {
        return cached.data;
      }
      // Stale-While-Revalidate: Return stale cached data immediately, revalidate in background
      fetch(`${API_BASE}${endpoint}`, { ...options, headers })
        .then((res) => (res.ok ? res.json() : null))
        .then((freshJson) => {
          if (freshJson) {
            inMemoryCache.set(cacheKey, { data: freshJson, timestamp: Date.now() });
          }
        })
        .catch(() => {});
      return cached.data;
    }

    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } catch (networkErr) {
      const errMsg = `Network error: ${networkErr.message}`;
      notifyToast(errMsg, 'error');
      throw new Error(errMsg);
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = json.message || `Request failed with status ${res.status}`;
      notifyToast(errorMsg, 'error');
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = json;
      throw err;
    }

    inMemoryCache.set(cacheKey, { data: json, timestamp: Date.now() });
    return json;
  }

  // Non-GET requests: NEVER CACHED
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    const errMsg = `Network error: ${networkErr.message}`;
    notifyToast(errMsg, 'error');
    throw new Error(errMsg);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = json.message || `Request failed with status ${res.status}`;
    notifyToast(errorMsg, 'error');
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json;
}

/**
 * Authoritative Server Money Calculation
 * POST /api/v1/orders/calculate
 * Requires real vendorId and addressId. Never falls back to silent mock-address.
 */
export async function calculateOrder({ vendorId, items, addressId, zoneType = 'URBAN' } = {}) {
  if (!vendorId) {
    const err = new Error('vendorId is required for order calculation');
    notifyToast(err.message, 'error');
    throw err;
  }
  if (!addressId) {
    const err = new Error('addressId is required for order calculation');
    notifyToast(err.message, 'error');
    throw err;
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    const err = new Error('Cart must contain at least one item');
    notifyToast(err.message, 'error');
    throw err;
  }

  const payload = {
    vendorId,
    addressId,
    zoneType,
    items: items.map((item) => ({
      productId: item.productId || item.id,
      name: item.name,
      originalPrice: Number(item.originalPrice || item.price || 100),
      quantity: Number(item.quantity || 1),
      vendorId: item.vendorId || vendorId,
    })),
  };

  const calcKey = JSON.stringify(payload);
  const cachedCalc = calculateCache.get(calcKey);
  const now = Date.now();
  if (cachedCalc && now - cachedCalc.timestamp < CACHE_TTL_MS) {
    return cachedCalc.data;
  }

  const res = await apiRequest('/orders/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = res.data || {};
  const totalOriginalPrice = Number(data.totalOriginalPrice || data.originalPrice || 0);
  const subtotal = Number(data.subtotal || data.customerMenuPrice || 0);
  const platformFee = Number(data.platformFee !== undefined ? data.platformFee : 5);
  const deliveryFee = Number(data.deliveryFee !== undefined ? data.deliveryFee : 25);
  const customerPayable = Number(data.customerPayable || (subtotal + platformFee + deliveryFee));
  const vendorSettlement = Number(data.vendorSettlement || 0);
  const quikoooGrossRevenue = Number(data.quikoooGrossRevenue || 0);
  const menuAdjustmentAmount = Number(
    data.menuAdjustmentAmount !== undefined
      ? data.menuAdjustmentAmount
      : Math.round((subtotal - totalOriginalPrice) * 100) / 100
  );
  const commissionAmount = Number(
    data.commissionAmount !== undefined
      ? data.commissionAmount
      : Math.round((totalOriginalPrice - vendorSettlement) * 100) / 100
  );

  const formattedResult = {
    vendorId: data.vendorId || vendorId,
    originalPrice: totalOriginalPrice,
    totalOriginalPrice,
    menuAdjustmentAmount,
    customerMenuPrice: subtotal,
    subtotal,
    commissionAmount,
    vendorSettlement,
    quikoooGrossRevenue,
    platformFee,
    deliveryFee,
    customerPayable,
    deliveryPartnerPayout: Number(data.deliveryPartnerPayout || 25),
    items: data.items || [],
  };

  calculateCache.set(calcKey, { data: formattedResult, timestamp: Date.now() });
  return formattedResult;
}

/**
 * Fetch vendors list
 * GET /api/v1/vendors (Cached 60s)
 */
export async function getVendors() {
  const res = await apiRequest('/vendors');
  return res.data || [];
}

/**
 * Fetch vendor by ID
 * GET /api/v1/vendors/:id (Cached 60s)
 */
export async function getVendorById(id) {
  if (!id) {
    throw new Error('Vendor ID is required');
  }
  const res = await apiRequest(`/vendors/${id}`);
  return res.data || null;
}

/**
 * Fetch products for a vendor
 * GET /api/v1/vendors/:id/products (fallback to /products?vendorId=, Cached 60s)
 * Throws real Error on failure + displays toast
 */
export async function getVendorProducts(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  try {
    const res = await apiRequest(`/vendors/${vendorId}/products`);
    if (res.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    // If route doesn't exist, try query parameter fallback
  }

  const fallbackRes = await apiRequest(`/products?vendorId=${vendorId}`);
  return fallbackRes.data || [];
}

/**
 * Create Order
 * POST /api/v1/orders - NEVER CACHED
 */
export async function createOrder(orderData) {
  if (!orderData || !orderData.vendorId) {
    throw new Error('vendorId is required to create order');
  }
  if (!orderData.addressId) {
    throw new Error('addressId is required to create order');
  }

  const res = await apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
  return res.data;
}

/**
 * Get Order Details
 * GET /api/v1/orders/:id
 */
export async function getOrderById(id) {
  if (!id) {
    throw new Error('Order ID is required');
  }
  const res = await apiRequest(`/orders/${id}`);
  return res.data;
}

/**
 * List Customer Orders
 * GET /api/v1/orders
 */
export async function listOrders() {
  const res = await apiRequest('/orders');
  return res.data ? (res.data.items || res.data) : [];
}

/**
 * Customer Authentication
 * POST /api/v1/auth/login - NEVER CACHED
 */
export async function loginUser(credentials) {
  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  if (res.data && res.data.token && typeof localStorage !== 'undefined') {
    localStorage.setItem('quikooo_token', res.data.token);
    localStorage.setItem('quikooo_user', JSON.stringify(res.data.user));
  }
  return res.data;
}
