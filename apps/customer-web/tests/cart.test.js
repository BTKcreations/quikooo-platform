import { describe, it, expect, beforeEach } from 'vitest';
import { CartStore, calculateBreakdown } from '../src/store/cart.js';

describe('Customer Cart Store & Pricing Engine Tests', () => {
  let cart;

  beforeEach(() => {
    cart = new CartStore();
  });

  describe('Single-Vendor Enforcement', () => {
    it('allows multiple items from the same vendor', () => {
      cart.addItem(
        { productId: 'p1', name: 'Paneer Butter Masala', originalPrice: 100 },
        { id: 'vendor-1', name: 'Spice Express' }
      );

      cart.addItem(
        { productId: 'p2', name: 'Garlic Naan', originalPrice: 40 },
        { id: 'vendor-1', name: 'Spice Express' }
      );

      const state = cart.getState();
      expect(state.items).toHaveLength(2);
      expect(state.vendorId).toBe('vendor-1');
    });

    it('rejects adding item from a different vendor with error "Single vendor cart only"', () => {
      cart.addItem(
        { productId: 'p1', name: 'Biryani', originalPrice: 100 },
        { id: 'vendor-1', name: 'Spice Express' }
      );

      expect(() => {
        cart.addItem(
          { productId: 'p2', name: 'Burger', originalPrice: 120 },
          { id: 'vendor-2', name: 'Burger King' }
        );
      }).toThrow('Single vendor cart only');

      // Cart still contains only vendor-1's items
      const state = cart.getState();
      expect(state.items).toHaveLength(1);
      expect(state.vendorId).toBe('vendor-1');
    });

    it('allows items from a new vendor after cart is cleared', () => {
      cart.addItem(
        { productId: 'p1', name: 'Biryani', originalPrice: 100 },
        { id: 'vendor-1', name: 'Spice Express' }
      );
      cart.clearCart();

      cart.addItem(
        { productId: 'p2', name: 'Burger', originalPrice: 120 },
        { id: 'vendor-2', name: 'Burger King' }
      );

      const state = cart.getState();
      expect(state.items).toHaveLength(1);
      expect(state.vendorId).toBe('vendor-2');
    });
  });

  describe('Official 100 -> 135 Pricing Breakdown', () => {
    it('correctly calculates breakdown for single item with originalPrice = 100', () => {
      cart.addItem(
        { productId: 'p1', name: 'Chicken Curry', originalPrice: 100, quantity: 1 },
        { id: 'vendor-1', name: 'Curry Express' }
      );

      const breakdown = cart.calculate();

      // 1. Original listed price: 100
      expect(breakdown.originalPrice).toBe(100);

      // 2. Menu markup (+5%): 5
      expect(breakdown.menuAdjustmentAmount).toBe(5);

      // 3. Customer menu price / subtotal: 105
      expect(breakdown.customerMenuPrice).toBe(105);
      expect(breakdown.subtotal).toBe(105);

      // 4. Commission (10% of original 100): 10
      expect(breakdown.commissionAmount).toBe(10);

      // 5. Vendor settlement (100 - 10): 90
      expect(breakdown.vendorSettlement).toBe(90);

      // 6. Quikooo gross revenue (5 + 10): 15
      expect(breakdown.quikoooGrossRevenue).toBe(15);

      // 7. Platform fee: 5
      expect(breakdown.platformFee).toBe(5);

      // 8. Delivery fee: 25
      expect(breakdown.deliveryFee).toBe(25);

      // 9. Customer total payable: 105 + 5 + 25 = 135
      expect(breakdown.customerPayable).toBe(135);
    });

    it('calculateBreakdown utility function produces exact 100 -> 135 figures', () => {
      const items = [{ originalPrice: 100, quantity: 1 }];
      const result = calculateBreakdown(items);

      expect(result).toEqual({
        originalPrice: 100,
        menuAdjustmentAmount: 5,
        customerMenuPrice: 105,
        subtotal: 105,
        commissionAmount: 10,
        vendorSettlement: 90,
        quikoooGrossRevenue: 15,
        platformFee: 5,
        deliveryFee: 25,
        customerPayable: 135,
      });
    });
  });

  describe('2026 Perf & Persistence Enhancements', () => {
    it('persists cart items to localStorage and rehydrates on new store instance', () => {
      const mockStorage = {};
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = String(v); },
        removeItem: (k) => { delete mockStorage[k]; },
        clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
      };

      try {
        const store1 = new CartStore({ items: [], vendorId: null, vendorName: null });
        store1.addItem(
          { productId: 'prod-persist-1', name: 'Dal Makhani', originalPrice: 120, quantity: 2 },
          { id: 'vendor-persist', name: 'Punjab Dhaba' }
        );

        expect(mockStorage['quikooo_customer_cart']).toBeDefined();
        const parsed = JSON.parse(mockStorage['quikooo_customer_cart']);
        expect(parsed.vendorId).toBe('vendor-persist');
        expect(parsed.items).toHaveLength(1);
        expect(parsed.items[0].name).toBe('Dal Makhani');

        // Instantiate second store without initial state to verify automatic rehydration
        const store2 = new CartStore();
        const state2 = store2.getState();
        expect(state2.vendorId).toBe('vendor-persist');
        expect(state2.items).toHaveLength(1);
        expect(state2.items[0].productId).toBe('prod-persist-1');
        expect(state2.items[0].quantity).toBe(2);
      } finally {
        globalThis.localStorage = origStorage;
      }
    });

    it('reorder helper clears prior cart and populates items with single vendor in 1-tap', () => {
      const store = new CartStore({ items: [], vendorId: null, vendorName: null });
      store.addItem(
        { productId: 'old-1', name: 'Old Item', originalPrice: 50 },
        { id: 'v-old', name: 'Old Vendor' }
      );
      expect(store.getState().items).toHaveLength(1);

      store.reorder(
        [
          { productId: 'p-new-1', name: 'Butter Chicken', originalPrice: 200, quantity: 1 },
          { productId: 'p-new-2', name: 'Roti', originalPrice: 30, quantity: 2 },
        ],
        { id: 'v-new', name: 'Royal Kitchen' }
      );

      const state = store.getState();
      expect(state.vendorId).toBe('v-new');
      expect(state.vendorName).toBe('Royal Kitchen');
      expect(state.items).toHaveLength(2);
      expect(state.itemCount).toBe(3); // 1 + 2
      expect(state.breakdown.originalPrice).toBe(260); // 200 + 30*2
    });
  });
});

