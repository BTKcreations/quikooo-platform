import { describe, it, expect, vi } from 'vitest';
import { debounce } from '../src/api.js';
import { fuzzyMatch } from '../src/components/PredictiveSearch.jsx';
import { buildReorderPayload } from '../src/components/BuyAgain.jsx';
import { formatCountdown } from '../src/components/CountdownTimer.jsx';
import { applyFilters } from '../src/components/FilterDrawer.jsx';

describe('Customer Web Perf & UX Utilities', () => {
  it('debounce utility delays execution and coalesces rapid invocations', async () => {
    let callCount = 0;
    const fn = (val) => {
      callCount += 1;
      return val * 2;
    };

    const debounced = debounce(fn, 50);

    debounced(1);
    debounced(2);
    const p3 = debounced(3);

    const result = await p3;
    expect(callCount).toBe(1);
    expect(result).toBe(6);
  });

  it('fuzzyMatch provides typo-tolerant matching for predictive search', () => {
    // Exact & substring
    expect(fuzzyMatch('biryani', 'Chicken Dum Biryani')).toBe(true);
    expect(fuzzyMatch('paneer', 'Special Paneer Butter Masala')).toBe(true);

    // Typo within edit distance of 1
    expect(fuzzyMatch('biriyani', 'Special Chicken Biryani')).toBe(true);
    expect(fuzzyMatch('panir', 'Paneer Butter Masala')).toBe(true);

    // Completely unrelated
    expect(fuzzyMatch('pizza', 'Chicken Biryani')).toBe(false);
  });

  // +1. Buy-Again Reorder Builder Test
  it('buildReorderPayload constructs cart-ready reorder structure with single-vendor consistency', () => {
    const sampleOrder = {
      id: 'ord-hist-99',
      vendorId: 'vendor-sample-1',
      vendorName: 'Curry & Spice Express',
      items: [
        { productId: 'prod-101', name: 'Paneer Butter Masala', quantity: 2, originalPrice: 100 },
        { productId: 'prod-103', name: 'Garlic Butter Naan', quantity: 3, originalPrice: 40, customerMenuPrice: 42 },
      ],
      totalAmount: 336.0,
    };

    const payload = buildReorderPayload(sampleOrder);

    expect(payload.vendorId).toBe('vendor-sample-1');
    expect(payload.vendorName).toBe('Curry & Spice Express');
    expect(payload.vendor).toEqual({ id: 'vendor-sample-1', name: 'Curry & Spice Express' });
    expect(payload.items).toHaveLength(2);
    expect(payload.itemCount).toBe(5);

    // Check 5% markup application if customerMenuPrice wasn't provided
    expect(payload.items[0].originalPrice).toBe(100);
    expect(payload.items[0].customerMenuPrice).toBe(105);
    expect(payload.items[0].quantity).toBe(2);

    // Check item with existing customerMenuPrice
    expect(payload.items[1].customerMenuPrice).toBe(42);
    expect(payload.items[1].quantity).toBe(3);

    // Null/undefined order defense
    const emptyPayload = buildReorderPayload(null);
    expect(emptyPayload.items).toEqual([]);
    expect(emptyPayload.itemCount).toBe(0);
  });

  // +2. Countdown Timer mm:ss Formatter Test
  it('formatCountdown correctly formats seconds into mm:ss strings', () => {
    // 12 minutes (720 seconds)
    expect(formatCountdown(720)).toBe('12:00');

    // 1 minute 5 seconds (65 seconds)
    expect(formatCountdown(65)).toBe('01:05');

    // Single-digit seconds (9 seconds)
    expect(formatCountdown(9)).toBe('00:09');

    // Zero seconds
    expect(formatCountdown(0)).toBe('00:00');

    // Negative seconds or null fallback
    expect(formatCountdown(-15)).toBe('00:00');
    expect(formatCountdown(null)).toBe('00:00');
  });

  // +3. Filter Apply Test (Category, Price, Rating, In-Stock)
  it('applyFilters filters items based on category, max price, rating, and availability', () => {
    const mockVendors = [
      {
        id: 'v1',
        name: 'Royal Biryani House',
        cuisine: 'Biryani & Rice',
        category: 'biryani',
        averagePrice: 180,
        rating: 4.8,
        inStock: true,
        etaMinutes: 12,
      },
      {
        id: 'v2',
        name: 'Curry Junction',
        cuisine: 'Curries & Dal',
        category: 'curry',
        averagePrice: 120,
        rating: 4.2,
        inStock: true,
        etaMinutes: 14,
      },
      {
        id: 'v3',
        name: 'Sweet Treatz',
        cuisine: 'Desserts & Sweets',
        category: 'desserts',
        averagePrice: 90,
        rating: 4.6,
        inStock: false,
        etaMinutes: 25,
      },
    ];

    // Filter by category
    const biryaniOnly = applyFilters(mockVendors, { categories: ['biryani'] });
    expect(biryaniOnly).toHaveLength(1);
    expect(biryaniOnly[0].id).toBe('v1');

    // Filter by max price
    const cheapOnly = applyFilters(mockVendors, { maxPrice: 130 });
    expect(cheapOnly).toHaveLength(2); // v2 (120) and v3 (90)

    // Filter by minimum rating (4.5+)
    const topRated = applyFilters(mockVendors, { minRating: 4.5 });
    expect(topRated).toHaveLength(2); // v1 (4.8) and v3 (4.6)

    // Filter by availability (inStockOnly)
    const inStockOnly = applyFilters(mockVendors, { inStockOnly: true });
    expect(inStockOnly).toHaveLength(2); // v1 and v2

    // Filter by fast delivery (eta <= 15m)
    const fastOnly = applyFilters(mockVendors, { fastDeliveryOnly: true });
    expect(fastOnly).toHaveLength(2); // v1 (12m) and v2 (14m)

    // Combined multi-filter
    const combined = applyFilters(mockVendors, {
      maxPrice: 200,
      minRating: 4.5,
      inStockOnly: true,
      fastDeliveryOnly: true,
    });
    expect(combined).toHaveLength(1);
    expect(combined[0].id).toBe('v1');
  });
});
