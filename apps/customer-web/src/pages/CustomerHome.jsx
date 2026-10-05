import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getVendors } from '../api.js';

export default function CustomerHome() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
            {
              id: 'vendor-sample-3',
              name: 'The Green Bowl Co.',
              businessType: 'RESTAURANT',
              cuisine: 'Healthy Salads, Smoothies, Grain Bowls',
              distanceKm: 1.7,
              etaMinutes: 15,
              rating: 4.7,
              isAcceptingOrders: true,
            },
          ]);
        }
      } catch (err) {
        console.warn('Backend offline or error fetching vendors, loading local defaults:', err.message);
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

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.cuisine && v.cuisine.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="page-content">
      {/* Zone & Location Ribbon */}
      <div style={{
        background: '#ecfdf5',
        border: '1px solid #a7f3d0',
        borderRadius: '0.75rem',
        padding: '0.75rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚡ 10–15 Min Hyperlocal Zone
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#064e3b' }}>
            Deliver to: Indiranagar 100ft Road (2.0 km geofence)
          </div>
        </div>
        <span className="badge badge-success">URBAN CLUSTER</span>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="input"
          placeholder="Search restaurants, fresh meals or groceries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Quick Category Filters */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        marginBottom: '1rem',
      }}>
        {['All Stores', 'Fresh Food', 'Daily Groceries', 'Dairy & Eggs', '10-Min Rush'].map((cat, idx) => (
          <button
            key={cat}
            className={idx === 0 ? 'badge badge-success' : 'badge badge-muted'}
            style={{ padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Hero Announcement */}
      <div className="card card-emerald" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.25rem 0', color: '#064e3b' }}>
              Transparent Hyperlocal Pricing
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#047857', lineHeight: '1.3' }}>
              5% menu adjustment & flat ₹5 platform fee. Direct 10-15m dispatch to your doorstep.
            </p>
          </div>
          <span style={{ fontSize: '1.5rem' }}>🛵</span>
        </div>
      </div>

      {/* Vendor List Heading */}
      <div className="flex-row-between" style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
          Available Stores ({filteredVendors.length})
        </h3>
        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Within 2.0 km</span>
      </div>

      {/* Loading & Empty States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
          Loading nearby stores...
        </div>
      )}

      {error && (
        <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '0.75rem', borderRadius: '0.5rem' }}>
          {error}
        </div>
      )}

      {/* Vendor Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {filteredVendors.map((vendor) => (
          <Link
            key={vendor.id}
            to={`/store/${vendor.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #059669' }}>
              <div className="flex-row-between" style={{ marginBottom: '0.35rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  {vendor.businessType || 'RESTAURANT'}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                  ★ {vendor.rating || '4.8'} (200+)
                </span>
              </div>

              <h4 style={{ margin: '0.2rem 0', fontSize: '1.1rem', color: '#111827' }}>
                {vendor.name}
              </h4>

              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', color: '#4B5563' }}>
                {vendor.cuisine || 'Fast delivery, fresh ingredients'}
              </p>

              <div className="flex-row-between" style={{
                borderTop: '1px solid #F3F4F0',
                paddingTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#6B7280',
              }}>
                <span>📍 {vendor.distanceKm || '1.2'} km away</span>
                <span style={{ fontWeight: 600, color: '#059669' }}>⚡ {vendor.etaMinutes || '12'} mins</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>View Menu →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
