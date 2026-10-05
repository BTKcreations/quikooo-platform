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
 * Cart Store implementation with Single Vendor enforcement
 */
export class CartStore {
  constructor(initialState = {}) {
    this.items = initialState.items || [];
    this.vendorId = initialState.vendorId || null;
    this.vendorName = initialState.vendorName || null;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
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
    calculate: () => cart.calculate(),
  };
}

export default cart;
