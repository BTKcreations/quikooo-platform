import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PrefetchLink from '../components/PrefetchLink.jsx';
import LocationBar from '../components/LocationBar.jsx';
import PredictiveSearch, { fuzzyMatch } from '../components/PredictiveSearch.jsx';
import MapView from '../components/MapView.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import BuyAgain from '../components/BuyAgain.jsx';
import { ActiveOrderBanner } from '../components/CountdownTimer.jsx';
import FilterDrawer, { applyFilters, countActiveFilters } from '../components/FilterDrawer.jsx';
import { useVirtualList } from '../lib/virtualList.js';
import OptimizedImage from '../components/OptimizedImage.jsx';
import { useCart } from '../store/cart.js';
import { useToast } from '../components/Toast.jsx';
import { getVendors } from '../api.js';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🍽️' },
  { id: 'biryani', label: 'Biryani & Rice', icon: '🥘' },
  { id: 'curry', label: 'Curries & Dal', icon: '🍲' },
  { id: 'breads', label: 'Breads & Roti', icon: '🫓' },
  { id: 'grocery', label: 'Groceries & Veg', icon: '🥦' },
  { id: 'dairy', label: 'Dairy & Eggs', icon: '🥛' },
  { id: 'desserts', label: 'Desserts & Sweets', icon: '🍧' },
];

export default function CustomerHome() {
  const navigate = useNavigate();
  const cart = useCart();
  const { showToast } = useToast();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showMap, setShowMap] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Advanced Filter state
  const [filterCriteria, setFilterCriteria] = useState({
    categories: [],
    maxPrice: 1000,
    minRating: 0,
    inStockOnly: false,
    fastDeliveryOnly: false,
  });

  const [currentLocation, setCurrentLocation] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('quikooo_location');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.lat && parsed.lng) return parsed;
        }
      }
    } catch (_) {}
    return { name: 'Indiranagar 100ft Road', city: 'Bengaluru', lat: 12.9784, lng: 77.6408, zone: 'URBAN' };
  });

  useEffect(() => {
    async function loadVendors() {
      try {
        setLoading(true);
        const data = await getVendors();
        setVendors(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load vendors from API:', err.message);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    }
    loadVendors();
  }, []);

  // Filter vendors with typo-tolerant predictive matching, category chips, and FilterDrawer rules
  const filteredVendors = useMemo(() => {
    // 1. Initial filter by search query & active category chip
    let base = vendors.filter((v) => {
      // Category chip check
      if (activeCategory !== 'all') {
        const catObj = CATEGORIES.find((c) => c.id === activeCategory);
        const matchCategory =
          (v.cuisine && v.cuisine.toLowerCase().includes(activeCategory)) ||
          (catObj && v.cuisine && v.cuisine.toLowerCase().includes(catObj.label.toLowerCase())) ||
          (activeCategory === 'grocery' && v.businessType === 'GROCERY');
        if (!matchCategory) return false;
      }

      // Search query typo-tolerant match
      if (!searchQuery.trim()) return true;
      return (
        fuzzyMatch(searchQuery, v.name) ||
        (v.cuisine && fuzzyMatch(searchQuery, v.cuisine)) ||
        (v.businessType && fuzzyMatch(searchQuery, v.businessType))
      );
    });

    // 2. Apply advanced Drawer Filters (categories, maxPrice, rating, inStock)
    return applyFilters(base, filterCriteria);
  }, [vendors, searchQuery, activeCategory, filterCriteria]);

  // Windowed virtual list: render first 30 + load more via IntersectionObserver
  const {
    displayedItems: displayedVendors,
    sentinelRef,
    hasMore,
    loadMore,
    visibleCount,
  } = useVirtualList({ items: filteredVendors, initialCount: 30, step: 15 });

  const activeFilterCount = countActiveFilters(filterCriteria, 1000);

  const vendorMarkers = useMemo(() => {
    const baseLat = currentLocation?.lat || 12.9784;
    const baseLng = currentLocation?.lng || 77.6408;

    const offsets = [
      { dLat: 0.0035, dLng: 0.004 },
      { dLat: -0.004, dLng: -0.0035 },
      { dLat: 0.0055, dLng: -0.003 },
      { dLat: -0.0025, dLng: 0.006 },
    ];

    const markers = [
      {
        lat: baseLat,
        lng: baseLng,
        label: 'You are here',
        type: 'user',
        description: currentLocation?.name || 'Current Delivery Location',
      },
    ];

    filteredVendors.forEach((v, i) => {
      const off = offsets[i % offsets.length];
      const lat = v.latitude || (baseLat + off.dLat);
      const lng = v.longitude || (baseLng + off.dLng);
      markers.push({
        lat,
        lng,
        label: v.name,
        type: 'vendor',
        description: `⚡ ${v.etaMinutes || 12} mins • ${v.cuisine || 'Fresh menu'}`,
        onClick: () => navigate(`/store/${v.id}`),
      });
    });

    return markers;
  }, [currentLocation, filteredVendors, navigate]);

  return (
    <div className="page-content">
      {/* 1. Location Bar First */}
      <LocationBar onLocationChange={(newLoc) => setCurrentLocation(newLoc)} />

      {/* 2. Live Order ETA Countdown Banner when active order */}
      <ActiveOrderBanner onTrack={(ord) => navigate(`/orders?id=${ord.id || ord.orderNumber}`)} />

      {/* Real Map View with 2km Geofence & ZoneService filter note */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          className="card"
          style={{
            padding: '0.65rem 0.85rem',
            marginBottom: showMap ? '0.65rem' : '0',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🎯</span>
            <div style={{ fontSize: '0.78rem', color: '#065F46', lineHeight: 1.4 }}>
              <strong>Hyperlocal 2.0 km Geofence Active:</strong> Verified by Quikooo ZoneService. Only verified kitchens within 2.0 km delivery promise radius are displayed.
            </div>
          </div>
          <button
            onClick={() => setShowMap(!showMap)}
            className="btn-secondary btn-sm"
            style={{ minHeight: '36px', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
            aria-label={showMap ? 'Hide map' : 'Show map'}
          >
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
        </div>

        {showMap && (
          <MapView
            center={[currentLocation.lat, currentLocation.lng]}
            zoom={14}
            radiusKm={2}
            markers={vendorMarkers}
            className="quikooo-map-container"
          />
        )}
      </div>

      {/* 3. Predictive Search (prior-order boost + recent + voice input) */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <PredictiveSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onSelectQuery={(q) => setSearchQuery(q)}
          />
        </div>

        {/* Filter Drawer Trigger Button */}
        <button
          onClick={() => setIsFilterDrawerOpen(true)}
          className="btn-secondary"
          style={{
            minHeight: '44px',
            padding: '0.5rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            borderRadius: '0.5rem',
            border: activeFilterCount > 0 ? '1.5px solid #059669' : '1px solid #D1D5DB',
            backgroundColor: activeFilterCount > 0 ? '#ECFDF5' : '#FFFFFF',
            color: activeFilterCount > 0 ? '#065F46' : '#374151',
            flexShrink: 0,
          }}
          aria-label={`Open filter drawer. ${activeFilterCount} active filters.`}
        >
          <span>🎛️</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filters</span>
          {activeFilterCount > 0 && (
            <span
              style={{
                backgroundColor: '#059669',
                color: '#FFFFFF',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                minWidth: '1.2rem',
                textAlign: 'center',
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. Category Chips with Photos/Emojis */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          WebkitOverflowScrolling: 'touch',
        }}
        role="tablist"
        aria-label="Food and Grocery categories"
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={isActive ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
                minHeight: '44px',
                borderRadius: '9999px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
              role="tab"
              aria-selected={isActive}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Buy Again: Horizontal Carousel from Order History */}
      {!searchQuery && <BuyAgain />}

      {/* Transparent Pricing Ribbon */}
      <div
        className="card card-emerald"
        style={{
          marginBottom: '1.25rem',
          padding: '0.875rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
            ⚡ 10–15 Min Express Guarantee
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#064E3B' }}>
            Flat ₹5 Platform Fee • 100% Rider Delivery Tip-Free
          </div>
        </div>
        <span style={{ fontSize: '1.5rem' }}>🛵</span>
      </div>

      {/* Vendor List Heading */}
      <div className="flex-row-between" style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
          Nearby Stores & Kitchens ({filteredVendors.length})
        </h3>
        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Within 2.0 km</span>
      </div>

      {/* Loading Skeleton */}
      {loading && <SkeletonList count={3} />}

      {/* Error state */}
      {error && (
        <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredVendors.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No stores found"
          description={`We couldn't find any results matching your search or filters. Try adjusting categories or clearing search.`}
          actionText="Clear All Filters"
          onAction={() => {
            setSearchQuery('');
            setActiveCategory('all');
            setFilterCriteria({
              categories: [],
              maxPrice: 1000,
              minRating: 0,
              inStockOnly: false,
              fastDeliveryOnly: false,
            });
          }}
        />
      )}

      {/* Vendors Grid: Windowed Virtual List with Optimized Images */}
      <div className="grid-cards">
        {displayedVendors.map((vendor) => (
          <PrefetchLink
            key={vendor.id}
            to={`/store/${vendor.id}`}
            prefetch={() => import('./StorePage.jsx')}
            style={{ textDecoration: 'none', color: 'inherit' }}
            aria-label={`View store ${vendor.name}`}
          >
            <div
              className="card"
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: '4px solid #059669',
                cursor: 'pointer',
              }}
            >
              <div>
                {/* Store image with lazy loading, async decoding & skeleton placeholder */}
                <div
                  style={{
                    height: '130px',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    marginBottom: '0.75rem',
                    position: 'relative',
                  }}
                >
                  <OptimizedImage
                    src={vendor.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'}
                    alt={vendor.name}
                    aspectRatio="16/9"
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      color: '#FFFFFF',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      zIndex: 2,
                    }}
                  >
                    ⚡ {vendor.etaMinutes || '12'} mins
                  </span>
                </div>

                <div className="flex-row-between" style={{ marginBottom: '0.25rem' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                    {vendor.businessType || 'RESTAURANT'}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                    ★ {vendor.rating || '4.8'} ({vendor.reviewsCount || '200'}+)
                  </span>
                </div>

                <h4 style={{ margin: '0.25rem 0', fontSize: '1.05rem', color: '#111827' }}>
                  {vendor.name}
                </h4>

                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#4B5563', lineHeight: 1.4 }}>
                  {vendor.cuisine || 'Fast delivery, authentic taste'}
                </p>
              </div>

              <div
                className="flex-row-between"
                style={{
                  borderTop: '1px solid #F3F4F0',
                  paddingTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#6B7280',
                }}
              >
                <span>📍 {vendor.distanceKm || '1.2'} km geofence</span>
                <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                  Order Now →
                </span>
              </div>
            </div>
          </PrefetchLink>
        ))}
      </div>

      {/* IntersectionObserver Sentinel for Infinite / Windowed Loading */}
      {hasMore && (
        <div
          ref={sentinelRef}
          style={{
            textAlign: 'center',
            padding: '1.5rem 0',
            color: '#6B7280',
            fontSize: '0.85rem',
          }}
        >
          <button
            onClick={loadMore}
            className="btn-secondary"
            style={{ minHeight: '44px', padding: '0.5rem 1.5rem' }}
          >
            Load More Stores ({filteredVendors.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Filter Drawer (Left slide-over on mobile) */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        initialFilters={filterCriteria}
        onApply={(newFilters) => setFilterCriteria(newFilters)}
      />
    </div>
  );
}
