import { useState, useEffect } from 'react';

/**
 * Standard Canonical 5% + 10% Pricing Calculator
 * Matches backend PricingService.js
 */
export function calculateBreakdown(items, overrides = {}) {
  const totalOriginalPrice = items.reduce(
    (sum, it) => sum + (Number(it.originalPrice || it.price || 0) * (it.quantity || 1)),
    0
  );

  const menuAdjustmentAmount = Math.round(totalOriginalPrice * 0.05 * 100) / 100;
  const customerMenuPrice = Math.round((totalOriginalPrice + menuAdjustmentAmount) * 100) / 100;
  const subtotal = customerMenuPrice;
  const commissionAmount = Math.round(totalOriginalPrice * 0.10 * 100) / 100;
  const vendorSettlement = Math.round((totalOriginalPrice - commissionAmount) * 100) / 100;
  const quikoooGrossRevenue = Math.round((menuAdjustmentAmount + commissionAmount) * 100) / 100;
  const platformFee = overrides.platformFee !== undefined ? Number(overrides.platformFee) : 5.0;
  const deliveryFee = overrides.deliveryFee !== undefined ? Number(overrides.deliveryFee) : 25.0;
  const customerPayable = Math.round((subtotal + platformFee + deliveryFee) * 100) / 100;

  return {
    originalPrice: totalOriginalPrice,
    menuAdjustmentAmount,
    customerMenuPrice,
    subtotal,
    commissionAmount,
    vendorSettlement,
    quikoooGrossRevenue,
    platformFee,
    deliveryFee,
    customerPayable,
  };
}

/**
 * Cart Store implementation with Single Vendor enforcement and LocalStorage persistence
 */
export class CartStore {
  constructor(initialState = {}) {
    let savedState = {};
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('quikooo_customer_cart');
        if (raw) {
          savedState = JSON.parse(raw);
        }
      } catch {
        // Storage access error ignored
      }
    }

    this.items = initialState.items !== undefined ? initialState.items : (savedState.items || []);
    this.vendorId = initialState.vendorId !== undefined ? initialState.vendorId : (savedState.vendorId || null);
    this.vendorName = initialState.vendorName !== undefined ? initialState.vendorName : (savedState.vendorName || null);
    this.listeners = new Set();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notify();
      });
    }
  }

  persist() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          'quikooo_customer_cart',
          JSON.stringify({
            items: this.items,
            vendorId: this.vendorId,
            vendorName: this.vendorName,
          })
        );
      } catch {
        // Storage write error ignored
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.persist();
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  getState() {
    return {
      items: [...this.items],
      vendorId: this.vendorId,
      vendorName: this.vendorName,
      itemCount: this.items.reduce((acc, i) => acc + (i.quantity || 1), 0),
      breakdown: calculateBreakdown(this.items),
    };
  }

  /**
   * Enforces single-vendor cart constraint
   * Rejects addition from different vendor with "Single vendor cart only"
   */
  addItem(item, vendor = null) {
    const itemVendorId = vendor?.id || item.vendorId || this.vendorId;
    const vendorName = vendor?.name || item.vendorName || this.vendorName;

    // Single-vendor constraint check
    if (this.items.length > 0 && this.vendorId && itemVendorId && this.vendorId !== itemVendorId) {
      throw new Error('Single vendor cart only');
    }

    if (!this.vendorId && itemVendorId) {
      this.vendorId = itemVendorId;
      this.vendorName = vendorName;
    }

    const existingIndex = this.items.findIndex(
      (i) => (i.productId || i.id) === (item.productId || item.id)
    );

    const originalPrice = Number(item.originalPrice || item.price || 100);
    const customerMenuPrice = Number(
      item.customerMenuPrice || Math.round(originalPrice * 1.05 * 100) / 100
    );

    if (existingIndex >= 0) {
      this.items[existingIndex].quantity += (item.quantity || 1);
    } else {
      this.items.push({
        productId: item.productId || item.id,
        name: item.name,
        originalPrice,
        customerMenuPrice,
        vendorId: itemVendorId,
        quantity: item.quantity || 1,
      });
    }

    this.notify();
    return this.getState();
  }

  removeItem(productId) {
    this.items = this.items.filter((i) => (i.productId || i.id) !== productId);
    if (this.items.length === 0) {
      this.vendorId = null;
      this.vendorName = null;
    }
    this.notify();
    return this.getState();
  }

  updateQuantity(productId, quantity) {
    const qty = parseInt(quantity, 10);
    if (qty <= 0) {
      return this.removeItem(productId);
    }

    const item = this.items.find((i) => (i.productId || i.id) === productId);
    if (item) {
      item.quantity = qty;
    }
    this.notify();
    return this.getState();
  }

  clearCart() {
    this.items = [];
    this.vendorId = null;
    this.vendorName = null;
    this.notify();
    return this.getState();
  }

  reorder(items, vendor) {
    this.clearCart();
    for (const item of items) {
      this.addItem(item, vendor);
    }
    return this.getState();
  }

  calculate() {
    return calculateBreakdown(this.items);
  }
}

// Global singleton cart instance
export const cart = new CartStore();

/**
 * React Hook for using the cart in components
 */
export function useCart() {
  const [state, setState] = useState(cart.getState());

  useEffect(() => {
    const unsubscribe = cart.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  return {
    items: state.items,
    vendorId: state.vendorId,
    vendorName: state.vendorName,
    itemCount: state.itemCount,
    breakdown: state.breakdown,
    addItem: (item, vendor) => cart.addItem(item, vendor),
    removeItem: (productId) => cart.removeItem(productId),
    updateQuantity: (productId, qty) => cart.updateQuantity(productId, qty),
    clearCart: () => cart.clearCart(),
    reorder: (items, vendor) => cart.reorder(items, vendor),
    calculate: () => cart.calculate(),
  };
}

export default cart;

// ============================================================================
// OFFLINE-QUEUE: Customer Cart LocalStorage Outbox with Automatic Resync
// Explicitly buffers orders when offline and replays them upon network reconnect
// ============================================================================
export const OFFLINE_OUTBOX_STORAGE_KEY = 'quikooo_cart_offline_outbox';

export function getCartOfflineOutbox() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueCartOfflineOutbox(orderPayload) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const queue = getCartOfflineOutbox();
    const entry = {
      queueId: `OFFLINE-QUEUE-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: 'OFFLINE-QUEUE',
      payload: orderPayload,
      enqueuedAt: new Date().toISOString(),
      status: 'PENDING_RESYNC',
    };
    queue.push(entry);
    localStorage.setItem(OFFLINE_OUTBOX_STORAGE_KEY, JSON.stringify(queue));
    console.log('[OFFLINE-QUEUE] Order successfully buffered to offline outbox:', entry.queueId);
    return entry;
  } catch (err) {
    console.warn('[OFFLINE-QUEUE Warning] Could not persist to localStorage:', err.message);
    return null;
  }
}

export function clearCartOfflineOutbox() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(OFFLINE_OUTBOX_STORAGE_KEY);
  }
}

export async function resyncCartOfflineOutbox(submitFn) {
  if (typeof localStorage === 'undefined') return { synced: 0, failed: 0 };
  const queue = getCartOfflineOutbox();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  console.log(`[OFFLINE-QUEUE] Resyncing ${queue.length} buffered order(s)...`);
  const remaining = [];
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      if (typeof submitFn === 'function') {
        await submitFn(item.payload);
        synced += 1;
      }
    } catch {
      failed += 1;
      remaining.push(item);
    }
  }

  localStorage.setItem(OFFLINE_OUTBOX_STORAGE_KEY, JSON.stringify(remaining));
  return { synced, failed, remaining: remaining.length };
}
