import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getVendors, getOrders, formatINR } from '../api.js';

export default function MerchantHome() {
  const [vendor, setVendor] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [audioPlayed, setAudioPlayed] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const vendorsList = await getVendors();
        if (vendorsList && vendorsList.length > 0) {
          setVendor(vendorsList[0]);
        }
        const ordersList = await getOrders(vendorsList[0]?.id);
        setOrders(ordersList || []);
      } catch (err) {
        console.error('Failed to load merchant data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Audio Chime synthesizer using Web Audio API
  const playChimeSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;

      // First tone (880Hz - A5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Second harmonic tone (1320Hz - E6)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.frequency.setValueAtTime(1320, now + 0.15);
      gain2.gain.setValueAtTime(0.25, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.6);

      setAudioPlayed(true);
      setTimeout(() => setAudioPlayed(false), 2500);
    } catch (e) {
      console.warn('AudioContext not allowed or supported', e);
      setAudioPlayed(true);
      setTimeout(() => setAudioPlayed(false), 2000);
    }
  };

  // Metrics aggregation
  const todayOrdersCount = orders.length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'DELIVERED').length;
  const todayListedSales = orders.reduce((sum, o) => sum + (o.totalOriginalPrice || 100), 0);
  // Net settlement is exactly 90% of listed price
  const netSettlementEarned = orders.reduce((sum, o) => sum + (o.vendorSettlement || 90), 0);

  return (
    <div className="page-content">
      {/* Merchant Header Status Card */}
      <div className="card mb-4" style={{ borderLeft: '4px solid var(--color-brand-primary, #059669)' }}>
        <div className="flex-row-between mb-2">
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>
              {vendor?.name || 'Curry & Spice Express'}
            </h2>
            <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
              {vendor?.cluster || 'Indiranagar Urban Cluster • 2.0 km geofence'}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`badge ${isOpen ? 'badge-success' : 'badge-danger'}`}
            style={{ cursor: 'pointer', border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          >
            {isOpen ? '🟢 Kitchen Open' : '🔴 Accepting Paused'}
          </button>
        </div>

        <div className="flex-row-between text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-surface-subtle, #F3F4F0)' }}>
          <span>Commission Rate: <strong>10.0% on original</strong></span>
          <span>Settlement Rate: <strong>90.0% net payout</strong></span>
        </div>
      </div>

      {/* Audio Chime Notification Test Bar */}
      <div className="card mb-4" style={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }}>
        <div className="flex-row-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🔔</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#064E3B' }}>Kitchen Tablet Chime</div>
              <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                {audioPlayed ? '🎶 Playing order alert chime...' : 'Alert sounds on new incoming customer orders'}
              </div>
            </div>
          </div>
          <button onClick={playChimeSound} className="btn-secondary btn-sm" style={{ backgroundColor: '#FFFFFF' }}>
            Test Chime
          </button>
        </div>
      </div>

      {/* Business Metrics Grid */}
      <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Today's Live Statistics</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Today's Orders</div>
          <div className="stat-value">{todayOrdersCount}</div>
          <span className="badge badge-success" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
            {activeOrdersCount} in kitchen queue
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active In-Kitchen</div>
          <div className="stat-value" style={{ color: '#D97706' }}>
            {orders.filter((o) => o.status === 'PREPARING' || o.status === 'ORDER_PLACED').length}
          </div>
          <span className="badge badge-warning" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
            Needs attention
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-label">Gross Food Sales</div>
          <div className="stat-value">{formatINR(todayListedSales)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary, #4B5563)' }}>
            Original listed value
          </div>
        </div>

        <div className="stat-card" style={{ borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }}>
          <div className="stat-label" style={{ color: '#065F46' }}>Net Settlement (90%)</div>
          <div className="stat-value">{formatINR(netSettlementEarned)}</div>
          <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
            Credited to wallet
          </div>
        </div>
      </div>

      {/* Quick Navigation Action Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Link to="/merchant/orders" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              📋
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Orders Board (Kitchen POS)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #4B5563)' }}>
                Accept, prepare, and handover orders to riders
              </div>
            </div>
          </div>
          <span style={{ fontSize: '1.25rem', color: 'var(--color-brand-primary, #059669)' }}>→</span>
        </Link>

        <Link to="/merchant/payout" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              💰
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Payout & Settlement Ledger</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #4B5563)' }}>
                View 90% net settlement breakdown & request withdrawal
              </div>
            </div>
          </div>
          <span style={{ fontSize: '1.25rem', color: 'var(--color-brand-primary, #059669)' }}>→</span>
        </Link>
      </div>

      {/* Kitchen Guidelines Footer Note */}
      <div style={{ marginTop: '1.5rem', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '0.75rem', color: '#6B7280' }}>
        <strong>Kitchen Operational Protocol:</strong>
        <p style={{ margin: '0.25rem 0 0 0' }}>
          Orders transition: <code>ORDER_PLACED</code> → <code>VENDOR_ACCEPTED</code> → <code>PREPARING</code> → <code>READY_FOR_PICKUP</code>.
          Hand over food packages only upon validating rider pickup handshake.
        </p>
      </div>
    </div>
  );
}
