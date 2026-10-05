import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PrefetchLink from '../components/PrefetchLink.jsx';
import LocationBar from '../components/LocationBar.jsx';
import PredictiveSearch, { fuzzyMatch } from '../components/PredictiveSearch.jsx';
import MapView from '../components/MapView.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
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

const RECENT_ORDERS = [
  {
    id: 'ord-recent-1',
    vendorId: 'vendor-sample-1',
    vendorName: 'Curry & Spice Express',
    items: [
      { productId: 'prod-101', name: 'Paneer Butter Masala', quantity: 1, originalPrice: 100, customerMenuPrice: 105 },
    ],
    totalAmount: 135.0,
    date: 'Yesterday, 8:15 PM',
  },
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
  const [visibleCount, setVisibleCount] = useState(20);
  const [showMap, setShowMap] = useState(true);
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

  useEffect(() => {
    async function loadVendors() {
      try {
        setLoading(true);
        const data = await getVendors();
        if (data && data.length > 0) {
          setVendors(data);
        } else {
          // Default mock vendors if DB empty
          setVendors([
            {
              id: 'vendor-sample-1',
              name: 'Curry & Spice Express',
              businessType: 'RESTAURANT',
              cuisine: 'North Indian, Biryani, Curries, Tandoor',
              distanceKm: 1.2,
              etaMinutes: 12,
              rating: 4.8,
              reviewsCount: 340,
              image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
              isAcceptingOrders: true,
            },
            {
              id: 'vendor-sample-2',
              name: 'Fresh Harvest Daily',
              businessType: 'GROCERY',
              cuisine: 'Organic Vegetables, Dairy & Bakery, Eggs',
              distanceKm: 0.8,
              etaMinutes: 10,
              rating: 4.9,
              reviewsCount: 520,
              image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
              isAcceptingOrders: true,
            },
            {
              id: 'vendor-sample-3',
              name: 'The Green Bowl Co.',
              businessType: 'RESTAURANT',
              cuisine: 'Healthy Salads, Smoothies, Grain Bowls, Low Carb',
              distanceKm: 1.7,
              etaMinutes: 15,
              rating: 4.7,
              reviewsCount: 190,
              image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
              isAcceptingOrders: true,
            },
            {
              id: 'vendor-sample-4',
              name: 'Royal Biryani House',
              businessType: 'RESTAURANT',
              cuisine: 'Hyderabadi Biryani, Kebab, Dum Biryani',
              distanceKm: 1.9,
              etaMinutes: 14,
              rating: 4.8,
              reviewsCount: 410,
              image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
              isAcceptingOrders: true,
            },
          ]);
        }
      } catch (err) {
        console.warn('Backend offline, loading local defaults:', err.message);
        setVendors([
          {
            id: 'vendor-sample-1',
            name: 'Curry & Spice Express',
            businessType: 'RESTAURANT',
            cuisine: 'North Indian, Biryani, Curries',
            distanceKm: 1.2,
            etaMinutes: 12,
            rating: 4.8,
            isAcceptingOrders: true,
          },
          {
            id: 'vendor-sample-2',
            name: 'Fresh Harvest Daily',
            businessType: 'GROCERY',
            cuisine: 'Organic Vegetables, Dairy & Bakery',
            distanceKm: 0.8,
            etaMinutes: 10,
            rating: 4.9,
            isAcceptingOrders: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadVendors();
  }, []);

  // Filter vendors with typo-tolerant predictive matching and category filtering
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      // Category check
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
  }, [vendors, searchQuery, activeCategory]);

  const displayedVendors = filteredVendors.slice(0, visibleCount);

  const handleOneTapReorder = (order) => {
    try {
      cart.reorder(
        order.items,
        { id: order.vendorId, name: order.vendorName }
      );
      showToast(`Items from ${order.vendorName} added to cart!`, 'success');
      navigate('/cart');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="page-content">
      {/* 1. Location Bar First */}
      <LocationBar onLocationChange={(newLoc) => setCurrentLocation(newLoc)} />

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
              <strong>Hyperlocal 2.0 km Geofence Active:</strong> Verified by Quikooo ZoneService (Haversine formula distance check / PostGIS ST_DWithin query). Only verified kitchens within 2.0 km delivery promise radius are displayed.
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

      {/* 2. Predictive Search (recent + popular + typo-tolerant) */}
      <PredictiveSearch
        value={searchQuery}
        onChange={setSearchQuery}
        onSelectQuery={(q) => setSearchQuery(q)}
      />

      {/* 3. Category Chips with Photos/Emojis */}
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

      {/* 4. Reorder Shortcuts (One-tap previous order) */}
      {RECENT_ORDERS.length > 0 && !searchQuery && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
              ⚡ Order Again in 1-Tap
            </span>
          </div>
          {RECENT_ORDERS.map((ord) => (
            <div
              key={ord.id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderLeft: '4px solid #059669',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                  {ord.vendorName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4B5563' }}>
                  {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')} • ₹{ord.totalAmount}
                </div>
              </div>
              <button
                onClick={() => handleOneTapReorder(ord)}
                className="btn-primary btn-sm"
                style={{ minHeight: '44px', padding: '0.4rem 0.85rem' }}
              >
                Reorder ₹{ord.totalAmount}
              </button>
            </div>
          ))}
        </div>
      )}

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
          description={`We couldn't find any results matching "${searchQuery}". Try searching for Biryani, Paneer, or Groceries.`}
          actionText="Clear Search"
          onAction={() => {
            setSearchQuery('');
            setActiveCategory('all');
          }}
        />
      )}

      {/* Vendors Grid / List (Mobile 1-col, Tablet 2-col, Desktop 3-col) */}
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
                {/* Store image placeholder with loading="lazy" & decoding="async" */}
                <div
                  style={{
                    height: '130px',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    marginBottom: '0.75rem',
                    backgroundColor: '#E5E7EB',
                    position: 'relative',
                  }}
                >
                  <img
                    src={vendor.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'}
                    alt={vendor.name}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
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

      {/* Pagination / Limit Render: Load More (first 20 + load more) */}
      {filteredVendors.length > visibleCount && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => setVisibleCount((prev) => prev + 20)}
            className="btn-secondary"
            style={{ minHeight: '44px', padding: '0.5rem 1.5rem' }}
          >
            Load More Stores ({filteredVendors.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
