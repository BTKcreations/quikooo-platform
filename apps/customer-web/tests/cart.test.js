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
});
