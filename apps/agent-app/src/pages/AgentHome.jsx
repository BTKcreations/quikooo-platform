import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getAgentAnalytics,
  getZones,
  isRuralOrderEligible,
  getDeliveryBatch,
  formatINR,
} from '../api.js';

export default function AgentHome() {
  const [analytics, setAnalytics] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchMeta, setBatchMeta] = useState(null);
  const [cutoffActive, setCutoffActive] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [anaData, zoneList] = await Promise.all([
          getAgentAnalytics('agent-1'),
          getZones(),
        ]);
        setAnalytics(anaData);
        setZones(zoneList);
        setBatchMeta(getDeliveryBatch());
        setCutoffActive(isRuralOrderEligible());
      } catch (err) {
        console.error('Error loading agent dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
        <p style={{ color: '#4B5563', fontWeight: 600 }}>Loading Zone Partner Console...</p>
      </div>
    );
  }

  const currentZone = zones.find((z) => z.id === analytics?.zoneId) || zones[0] || {};

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Territory Dashboard</h1>
          <p className="page-subtitle">
            Zone Franchise: <strong>{currentZone.name || 'Mandya & Maddur Cluster'}</strong> ({analytics?.agentCode || 'AG-ZN-RUR-01'})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/agent/vendors" className="btn-primary">
            <span>+</span>
            <span>Onboard Merchant</span>
          </Link>
          <Link to="/agent/batch" className="btn-secondary">
            <span>📦</span>
            <span>Batch Dispatch</span>
          </Link>
        </div>
      </div>

      {/* Rural Cutoff & Dispatch Status Card */}
      <div className={`alert-card ${cutoffActive ? 'success' : 'locked'}`}>
        <div style={{ fontSize: '1.75rem' }}>{cutoffActive ? '⏱️' : '🔒'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <strong style={{ fontSize: '1rem' }}>
              {cutoffActive
                ? 'Rural Batch Ordering Open (Cutoff 21:00 Asia/Kolkata)'
                : 'Rural Batch Cutoff Locked (Closed for Next-Day Dispatch)'}
            </strong>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: cutoffActive ? '#059669' : '#DC2626',
                color: '#FFFFFF',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
              }}
            >
              {cutoffActive ? 'ACCEPTING ORDERS' : 'CUTOFF LOCKED'}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.875rem' }}>
            Next Dispatch Batch: <strong>{batchMeta?.batchId}</strong> on <strong>{batchMeta?.deliveryDate}</strong> during strictly{' '}
            <strong>{batchMeta?.windowStart} - {batchMeta?.windowEnd} IST</strong>. Orders after 21:00 are queued for subsequent cycle.
          </p>
        </div>
      </div>

      {/* Zone Core Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Merchants</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {analytics?.activeVendors} <span style={{ fontSize: '1rem', color: '#9CA3AF' }}>/ {analytics?.totalVendors}</span>
          </div>
          <div className="stat-meta">🏪 2 KYC reviews pending in territory</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Drivers (Fleet)</div>
          <div className="stat-value" style={{ color: '#0284C7' }}>
            {analytics?.activeDrivers} <span style={{ fontSize: '1rem', color: '#9CA3AF' }}>/ {analytics?.totalDrivers}</span>
          </div>
          <div className="stat-meta">🛵 11 on duty for deliveries</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Zone Orders (Monthly)</div>
          <div className="stat-value" style={{ color: '#7C3AED' }}>
            {analytics?.totalOrders}
          </div>
          <div className="stat-meta">📦 {analytics?.ruralScheduledOrders} rural morning scheduled</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Franchise Share (60%)</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {formatINR(analytics?.agentCommissionShare)}
          </div>
          <div className="stat-meta">💰 60% of net margin pool ({formatINR(analytics?.adjustedContributionPool)})</div>
        </div>
      </div>

      {/* Zone Economics Snapshot */}
      <div className="table-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.15rem' }}>
          Franchise Net Economics Summary
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            backgroundColor: '#F9FAFB',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>ZONE GMV</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', fontFamily: 'Outfit' }}>
              {formatINR(analytics?.zoneGmv)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>NET REVENUE POOL (POST-GST)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', fontFamily: 'Outfit' }}>
              {formatINR(analytics?.adjustedContributionPool)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>AGENT COMMISSION (60%)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', fontFamily: 'Outfit' }}>
              {formatINR(analytics?.agentCommissionShare)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>DELIVERY INFLOW (₹25 * n)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0284C7', fontFamily: 'Outfit' }}>
              {formatINR(analytics?.deliveryInflow)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>100% passed to drivers (Separate)</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link to="/agent/earnings" className="btn-secondary" style={{ fontSize: '0.8rem' }}>
            <span>View Full Financial Ledger →</span>
          </Link>
        </div>
      </div>

      {/* Operational Modules Quick Links */}
      <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.15rem', marginBottom: '0.75rem' }}>
        Territory Operations Hub
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <Link
          to="/agent/vendors"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            backgroundColor: '#FFFFFF',
            border: '1px solid #F3F4F0',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '2rem', backgroundColor: '#ECFDF5', padding: '0.75rem', borderRadius: '0.5rem' }}>🏪</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Merchant Onboarding</div>
            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Manage local grocers, farms, restaurants & KYC approvals</div>
          </div>
        </Link>

        <Link
          to="/agent/drivers"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            backgroundColor: '#FFFFFF',
            border: '1px solid #F3F4F0',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '2rem', backgroundColor: '#F0F9FF', padding: '0.75rem', borderRadius: '0.5rem' }}>🛵</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Driver Partner Roster</div>
            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Monitor active riders, assign duty, track ₹25 delivery payouts</div>
          </div>
        </Link>

        <Link
          to="/agent/batch"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            backgroundColor: '#FFFFFF',
            border: '1px solid #F3F4F0',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '2rem', backgroundColor: '#FEF3C7', padding: '0.75rem', borderRadius: '0.5rem' }}>📦</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Rural Batch Operations</div>
            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>21:00 cutoff lock & morning 05:00-08:00 dispatch manifests</div>
          </div>
        </Link>

        <Link
          to="/agent/earnings"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            backgroundColor: '#FFFFFF',
            border: '1px solid #F3F4F0',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '2rem', backgroundColor: '#F3E8FF', padding: '0.75rem', borderRadius: '0.5rem' }}>💰</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Franchise Commission & Payouts</div>
            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>60/40 platform split audit and weekly bank settlement ledger</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
