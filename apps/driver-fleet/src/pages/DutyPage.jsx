import React, { useState } from 'react';

export default function DutyPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  return (
    <div className="page-content">
      <div className="mb-3">
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Driver Duty & Shifts</h2>
        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
          Toggle your availability to receive delivery assignments within your cluster
        </p>
      </div>

      {/* Main Duty Toggle Card */}
      <div className={`duty-toggle-card ${isOnline ? 'online' : 'offline'}`}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{isOnline ? '🟢' : '⚪'}</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: isOnline ? '#065F46' : '#4B5563' }}>
              {isOnline ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: isOnline ? '#047857' : '#6B7280' }}>
            {isOnline
              ? 'Receiving orders within 2.0 km cluster radius'
              : 'You will not receive any delivery requests'}
          </p>
        </div>

        <button
          onClick={() => setIsOnline(!isOnline)}
          style={{
            backgroundColor: isOnline ? '#059669' : '#9CA3AF',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.6rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
          }}
        >
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* Cluster & Telemetry Status Card */}
      <div className="card mb-4" style={{ backgroundColor: '#FBFBF9' }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Live Telemetry & Cluster</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
          <div className="flex-row-between">
            <span className="text-secondary">Assigned Cluster:</span>
            <strong>Indiranagar Urban #1 (2.0 km)</strong>
          </div>
          <div className="flex-row-between">
            <span className="text-secondary">Delivery Radius:</span>
            <span>Strict 2.0 km geofence</span>
          </div>
          <div className="flex-row-between">
            <span className="text-secondary">GPS Broadcaster:</span>
            <span style={{ color: '#059669', fontWeight: 600 }}>● Active (12.9716, 77.5946)</span>
          </div>
          <div className="flex-row-between">
            <span className="text-secondary">Network Status:</span>
            <span style={{ color: '#059669', fontWeight: 600 }}>5G High Speed</span>
          </div>
        </div>
      </div>

      {/* Today's Shift Performance Metrics */}
      <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Today's Shift Performance</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Online Time</div>
          <div style={{ fontFamily: 'var(--font-family-display, Outfit)', fontSize: '1.35rem', fontWeight: 700, color: '#059669' }}>
            4h 15m
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Completed Trips</div>
          <div style={{ fontFamily: 'var(--font-family-display, Outfit)', fontSize: '1.35rem', fontWeight: 700, color: '#059669' }}>
            4 Deliveries
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Acceptance Rate</div>
          <div style={{ fontFamily: 'var(--font-family-display, Outfit)', fontSize: '1.35rem', fontWeight: 700, color: '#059669' }}>
            100%
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Partner Rating</div>
          <div style={{ fontFamily: 'var(--font-family-display, Outfit)', fontSize: '1.35rem', fontWeight: 700, color: '#D97706' }}>
            4.95 ★
          </div>
        </div>
      </div>

      {/* Driver Preferences */}
      <div className="card">
        <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Partner Preferences</h3>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.85rem' }}>
          <span>Auto-Accept within 1.0 km</span>
          <input
            type="checkbox"
            checked={autoAccept}
            onChange={(e) => setAutoAccept(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#059669' }}
          />
        </label>
      </div>
    </div>
  );
}
