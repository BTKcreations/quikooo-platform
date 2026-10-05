import React, { useState } from 'react';

export const FILTER_CATEGORIES = [
  { id: 'biryani', label: 'Biryani & Rice' },
  { id: 'curry', label: 'Curries & Dal' },
  { id: 'breads', label: 'Breads & Roti' },
  { id: 'grocery', label: 'Groceries & Veg' },
  { id: 'dairy', label: 'Dairy & Eggs' },
  { id: 'desserts', label: 'Desserts & Sweets' },
];

/**
 * Pure filter application function.
 * Exported for testing and reuse across catalog views.
 */
export function applyFilters(items, filterCriteria = {}) {
  if (!Array.isArray(items)) return [];

  const {
    categories = [],
    maxPrice = null,
    minRating = 0,
    inStockOnly = false,
    fastDeliveryOnly = false,
  } = filterCriteria;

  return items.filter((item) => {
    // 1. Category check
    if (categories && categories.length > 0 && !categories.includes('all')) {
      const itemCategory = (
        item.category ||
        item.cuisine ||
        item.businessType ||
        ''
      ).toLowerCase();

      const matchesCat = categories.some((cat) => {
        const c = String(cat).toLowerCase();
        if (c === 'all') return true;
        return itemCategory.includes(c);
      });

      if (!matchesCat) return false;
    }

    // 2. Price filter
    if (maxPrice !== null && maxPrice !== undefined && maxPrice > 0) {
      const price = Number(
        item.customerMenuPrice ||
        item.price ||
        item.originalPrice ||
        item.averagePrice ||
        0
      );
      if (price > 0 && price > Number(maxPrice)) {
        return false;
      }
    }

    // 3. Rating filter
    if (minRating && Number(minRating) > 0) {
      const rating = Number(item.rating || 0);
      if (rating < Number(minRating)) {
        return false;
      }
    }

    // 4. In-Stock / Availability
    if (inStockOnly) {
      if (item.inStock === false || item.isAvailable === false || item.outOfStock === true) {
        return false;
      }
    }

    // 5. Fast delivery check (within 15 mins)
    if (fastDeliveryOnly) {
      const eta = Number(item.etaMinutes || item.eta || 15);
      if (eta > 15) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculates number of active non-default filter rules
 */
export function countActiveFilters(filters, defaultMaxPrice = 500) {
  let count = 0;
  if (filters.categories && filters.categories.length > 0) count += filters.categories.length;
  if (filters.maxPrice && filters.maxPrice < defaultMaxPrice) count += 1;
  if (filters.minRating && filters.minRating > 0) count += 1;
  if (filters.inStockOnly) count += 1;
  if (filters.fastDeliveryOnly) count += 1;
  return count;
}

export default function FilterDrawer({
  isOpen = false,
  onClose,
  initialFilters = {},
  onApply,
  isDesktopInline = false,
}) {
  const [categories, setCategories] = useState(initialFilters.categories || []);
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice || 500);
  const [minRating, setMinRating] = useState(initialFilters.minRating || 0);
  const [inStockOnly, setInStockOnly] = useState(Boolean(initialFilters.inStockOnly));
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(Boolean(initialFilters.fastDeliveryOnly));

  const handleToggleCategory = (catId) => {
    setCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const handleClear = () => {
    setCategories([]);
    setMaxPrice(500);
    setMinRating(0);
    setInStockOnly(false);
    setFastDeliveryOnly(false);
    onApply?.({
      categories: [],
      maxPrice: 500,
      minRating: 0,
      inStockOnly: false,
      fastDeliveryOnly: false,
    });
  };

  const handleApply = () => {
    onApply?.({
      categories,
      maxPrice,
      minRating,
      inStockOnly,
      fastDeliveryOnly,
    });
    onClose?.();
  };

  const activeCount = countActiveFilters({
    categories,
    maxPrice,
    minRating,
    inStockOnly,
    fastDeliveryOnly,
  });

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#FFFFFF',
        padding: '1.25rem',
      }}
    >
      {/* Header */}
      <div className="flex-row-between" style={{ paddingBottom: '1rem', borderBottom: '1px solid #F3F4F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🎛️</span>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Filters</h3>
          {activeCount > 0 && (
            <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
              {activeCount} active
            </span>
          )}
        </div>
        {!isDesktopInline && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: '#4B5563',
              cursor: 'pointer',
              minWidth: '44px',
              minHeight: '44px',
            }}
            aria-label="Close filter drawer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* 1. Categories */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Categories
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {FILTER_CATEGORIES.map((cat) => {
              const checked = categories.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: checked ? '#065F46' : '#374151',
                    cursor: 'pointer',
                    padding: '0.35rem 0',
                    fontWeight: checked ? 600 : 400,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleCategory(cat.id)}
                    style={{ accentColor: '#059669', width: '16px', height: '16px' }}
                  />
                  <span>{cat.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 2. Price Slider */}
        <div>
          <div className="flex-row-between" style={{ marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
              Max Price
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
              ₹{maxPrice}
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="1000"
            step="25"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
            aria-label="Filter by maximum price"
          />
          <div className="flex-row-between" style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
            <span>₹50</span>
            <span>₹500</span>
            <span>₹1000</span>
          </div>
        </div>

        {/* 3. Rating */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Minimum Rating
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { val: 0, label: 'All' },
              { val: 4.0, label: '4.0+ ★' },
              { val: 4.5, label: '4.5+ ★' },
            ].map((r) => {
              const isSelected = minRating === r.val;
              return (
                <button
                  key={r.val}
                  type="button"
                  onClick={() => setMinRating(r.val)}
                  className={isSelected ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
                  style={{
                    flex: 1,
                    minHeight: '38px',
                    fontSize: '0.78rem',
                    padding: '0.3rem 0.5rem',
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Availability & Fast Delivery Toggles */}
        <div style={{ borderTop: '1px solid #F3F4F0', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
            Availability
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.65rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <span>In Stock Only</span>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              style={{ accentColor: '#059669', width: '18px', height: '18px' }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <span>⚡ Express 10–15m Only</span>
            <input
              type="checkbox"
              checked={fastDeliveryOnly}
              onChange={(e) => setFastDeliveryOnly(e.target.checked)}
              style={{ accentColor: '#059669', width: '18px', height: '18px' }}
            />
          </label>
        </div>
      </div>

      {/* Footer Clear & Apply */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid #F3F4F0', display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={handleClear}
          className="btn-secondary"
          style={{ flex: 1, minHeight: '44px', fontSize: '0.875rem' }}
        >
          Clear All
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="btn-primary"
          style={{ flex: 1.5, minHeight: '44px', fontSize: '0.875rem', fontWeight: 700 }}
        >
          Apply Filters ({activeCount})
        </button>
      </div>
    </div>
  );

  if (isDesktopInline) {
    return (
      <aside
        className="card"
        style={{
          width: '280px',
          height: 'fit-content',
          padding: 0,
          position: 'sticky',
          top: '5rem',
        }}
        aria-label="Desktop filter panel"
      >
        {content}
      </aside>
    );
  }

  if (!isOpen) return null;

  return (
    <div
      className="filter-drawer-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Filter stores and menu items"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 95,
        display: 'flex',
        justifyContent: 'flex-start',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="filter-drawer-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '360px',
          height: '100%',
          backgroundColor: '#FFFFFF',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {content}
      </div>
    </div>
  );
}
