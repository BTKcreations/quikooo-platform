/**
 * QUIKOOO Customer Web API Client
 * Connects to Express backend /api/v1
 */

const API_BASE = '/api/v1';

/**
 * Standard fetch wrapper with JSON handling & error propagation
 */
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('quikooo_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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
 * Authoritative Server Money Calculation
 * POST /api/v1/orders/calculate
 * 
 * Response shape:
 * {
 *   originalPrice,
 *   menuAdjustmentAmount,
 *   customerMenuPrice,
 *   subtotal,
 *   commissionAmount,
 *   vendorSettlement,
 *   quikoooGrossRevenue,
 *   platformFee,
 *   deliveryFee,
 *   customerPayable,
 *   items
 * }
 */
export async function calculateOrder({ vendorId, items, addressId = 'mock-address-1', zoneType = 'URBAN' }) {
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

  return {
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
}

/**
 * Fetch vendors list
 * GET /api/v1/vendors
 */
export async function getVendors() {
  const res = await apiRequest('/vendors');
  return res.data || [];
}

/**
 * Fetch vendor by ID
 * GET /api/v1/vendors/:id
 */
export async function getVendorById(id) {
  const res = await apiRequest(`/vendors/${id}`);
  return res.data || null;
}

/**
 * Fetch products for a vendor
 * GET /api/v1/vendors/:id/products (fallback to /products)
 */
export async function getVendorProducts(vendorId) {
  try {
    const res = await apiRequest(`/vendors/${vendorId}/products`);
    if (res.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    // If not found, try fallback
  }

  try {
    const res = await apiRequest(`/products?vendorId=${vendorId}`);
    return res.data || [];
  } catch (err) {
    return [];
  }
}

/**
 * Create Order
 * POST /api/v1/orders
 */
export async function createOrder(orderData) {
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
 * POST /api/v1/auth/login
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
