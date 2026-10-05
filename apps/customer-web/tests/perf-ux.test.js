import { describe, it, expect, vi } from 'vitest';
import { debounce } from '../src/api.js';
import { fuzzyMatch } from '../src/components/PredictiveSearch.jsx';

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
});
