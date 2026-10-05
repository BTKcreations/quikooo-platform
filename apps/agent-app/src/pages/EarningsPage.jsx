import React, { useState, useEffect } from 'react';
import {
  getAgentPayouts,
  getAgentAnalytics,
  calculateRevenueSplit,
  calculateDeliveryInflow,
  calculateNetEconomics,
  formatINR,
  AGENT_SHARE_PERCENT,
  QUIKOOO_SHARE_PERCENT,
} from '../api.js';

export default function EarningsPage() {
  const [payouts, setPayouts] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Interactive Canonical Simulator State
  const [orderCount, setOrderCount] = useState(342);
  const [contributionPerOrder, setContributionPerOrder] = useState(13.94);

  useEffect(() => {
    async function loadData() {
      try {
        const [payoutData, analyticsData] = await Promise.all([
          getAgentPayouts('agent-1'),
          getAgentAnalytics('agent-1'),
        ]);
        setPayouts(payoutData);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Failed to load earnings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRequestPayout = () => {
    setRequesting(true);
    setTimeout(() => {
      setRequesting(false);
      setToastMsg('🎉 Settlement withdrawal request submitted to QUIKOOO Finance Ops!');
      setTimeout(() => setToastMsg(''), 5000);
    }, 1000);
  };

  // Canonical Single-Order Split Example
  const singleOrderSplit = calculateRevenueSplit(13.94);
  const singleOrderDelivery = calculateDeliveryInflow(1);

  // Dynamic Net Economics based on interactive order count
  const netEcon = calculateNetEconomics({
    ordersCount: orderCount,
    adjustedContributionPerOrder: contributionPerOrder,
    gmv: orderCount * 135.0,
  });

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ color: '#4B5563', fontWeight: 600 }}>Loading Franchise Financial Ledger...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '4.5rem',
            right: '1.5rem',
            backgroundColor: '#065F46',
            color: '#FFFFFF',
            padding: '0.85rem 1.35rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 20px -3px rgba(0, 0, 0, 0.25)',
            zIndex: 99,
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Franchise Earnings & 60/40 Revenue Ledger</h1>
          <p className="page-subtitle">
            Local Zone Agent franchise profit-sharing: <strong>60% of Net Platform Margin</strong> (after GST). Delivery inflow is 100% isolated pass-through.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={handleRequestPayout}
          disabled={requesting || (payouts?.pendingPayout || 0) <= 0}
        >
          {requesting ? 'Processing Request...' : `Withdraw Pending ${formatINR(payouts?.pendingPayout || 2360.0)}`}
        </button>
      </div>

      {/* Primary Wallet Balances */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Commission Earned</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {formatINR(payouts?.totalEarned || 8360.0)}
          </div>
          <div className="stat-meta">Lifetime 60% franchise revenue share</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Settled / Paid to Bank</div>
          <div className="stat-value" style={{ color: '#4B5563' }}>
            {formatINR(payouts?.totalPaid || 6000.0)}
          </div>
          <div className="stat-meta">Transferred via NEFT to HDFC Bank</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Pending Payout Balance</div>
          <div className="stat-value" style={{ color: '#D97706' }}>
            {formatINR(payouts?.pendingPayout || 2360.0)}
          </div>
          <div className="stat-meta">Available for weekly bank withdrawal</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Franchise Contract Rate</div>
          <div className="stat-value" style={{ color: '#7C3AED' }}>
            {AGENT_SHARE_PERCENT}%
          </div>
          <div className="stat-meta">Quikooo Platform retained: {QUIKOOO_SHARE_PERCENT}%</div>
        </div>
      </div>

      {/* Canonical Math Benchmark Card (13.94 -> 8.36 / 5.58) */}
      <div
        className="table-card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
          border: '1px solid #A7F3D0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', color: '#065F46' }}>
              📐 Official Canonical Order Benchmark (Original Listed Price = ₹100.00)
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#374151' }}>
              Standard transaction anatomy per Section 1.2 of the Platform Plan:
            </p>
          </div>

          <span
            style={{
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
            }}
          >
            60% AGENT / 40% PLATFORM
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            backgroundColor: '#FFFFFF',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid #E5E7EB',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>1. LISTED & MARKUP</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Original: ₹100.00</div>
            <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>+5% Menu Markup: ₹5.00</div>
            <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>Customer Menu: ₹105.00</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>2. VENDOR SETTLEMENT</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Payout: ₹90.00</div>
            <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>Original ₹100 - 10% Comm</div>
            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>(Comm charged on ₹100)</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>3. NET REVENUE POOL</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', fontFamily: 'Outfit' }}>
              ₹13.94
            </div>
            <div style={{ fontSize: '0.75rem', color: '#4B5563' }}>
              Gross ₹15.00 (₹5 + ₹10) less 18% GST (₹3.06 on ₹17 base)
            </div>
          </div>

          <div style={{ backgroundColor: '#F0FDF4', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #BBF7D0' }}>
            <div style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 700 }}>4. AGENT 60% SHARE</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', fontFamily: 'Outfit' }}>
              ₹8.36
            </div>
            <div style={{ fontSize: '0.75rem', color: '#047857' }}>
              60% of ₹13.94 net revenue (Quikooo 40% = ₹5.58)
            </div>
          </div>
        </div>
      </div>

      {/* Critical Policy: Delivery Inflow (25 * n) Isolated Separate */}
      <div
        style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '0.875rem',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🛡️</span>
          <strong style={{ fontSize: '1.05rem', color: '#1E40AF', fontFamily: 'Outfit' }}>
            Logistics Policy: Customer Delivery Inflow (₹25.00 * n) Kept Strictly Separate
          </strong>
        </div>

        <p style={{ margin: 0, fontSize: '0.875rem', color: '#1E3A8A', lineHeight: 1.5 }}>
          The ₹25.00 delivery fee charged to the customer is a <strong>100% pass-through logistics settlement</strong> paid directly to the assigned delivery partner upon completed delivery.
          It does <em>not</em> form part of the platform margin pool, is <em>not</em> subject to the 60/40 revenue split, and cannot be used to inflate agent earnings or platform commissions.
        </p>

        <div
          style={{
            marginTop: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            backgroundColor: '#FFFFFF',
            padding: '1rem',
            borderRadius: '0.5rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>CUSTOMER INFLOW PER ORDER</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>+ ₹25.00</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>DRIVER PAYOUT PER ORDER</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#DC2626' }}>- ₹25.00</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>NET PLATFORM RETENTION</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#059669' }}>₹0.00 (Pass-Through)</div>
          </div>
        </div>
      </div>

      {/* Holistic Territory Net Economics Simulator */}
      <div className="table-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
              Territory Net Economics Breakdown
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
              Scale economics across monthly completed order volume:
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Orders Count:</label>
            <input
              type="number"
              min="1"
              max="10000"
              className="form-input"
              style={{ width: '100px', padding: '0.35rem 0.6rem' }}
              value={orderCount}
              onChange={(e) => setOrderCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
        </div>

        {/* 60/40 Split Bar Visualizer */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            <span style={{ color: '#059669' }}>Local Zone Agent: 60% ({formatINR(netEcon.agentShare)})</span>
            <span style={{ color: '#4B5563' }}>Quikooo Platform: 40% ({formatINR(netEcon.quikoooShare)})</span>
          </div>

          <div style={{ height: '14px', width: '100%', backgroundColor: '#E5E7EB', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '60%', backgroundColor: '#059669' }} />
            <div style={{ width: '40%', backgroundColor: '#4B5563' }} />
          </div>
        </div>

        {/* Breakdown Summary Grid */}
        <table className="data-table">
          <thead>
            <tr>
              <th>Economic Component</th>
              <th>Calculation Formula</th>
              <th>Pool Amount</th>
              <th>Franchise Agent Share (60%)</th>
              <th>Platform HQ Share (40%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Net Revenue Contribution Pool</strong>
              </td>
              <td>{orderCount} orders × ₹13.94 net margin</td>
              <td style={{ fontWeight: 700, fontFamily: 'Outfit' }}>{formatINR(netEcon.adjustedPool)}</td>
              <td style={{ fontWeight: 700, color: '#059669', fontFamily: 'Outfit' }}>{formatINR(netEcon.agentShare)}</td>
              <td style={{ fontWeight: 700, color: '#4B5563', fontFamily: 'Outfit' }}>{formatINR(netEcon.quikoooShare)}</td>
            </tr>
            <tr>
              <td>
                <strong>Delivery Fee Inflow (Logistics)</strong>
              </td>
              <td>{orderCount} orders × ₹25.00 inflow</td>
              <td style={{ fontWeight: 700, color: '#0284C7', fontFamily: 'Outfit' }}>{formatINR(netEcon.deliveryInflow)}</td>
              <td style={{ color: '#9CA3AF' }}>₹0.00 (Pass-Through)</td>
              <td style={{ color: '#9CA3AF' }}>₹0.00 (Pass-Through)</td>
            </tr>
            <tr>
              <td>
                <strong>Driver Partner Payout (Outflow)</strong>
              </td>
              <td>{orderCount} orders × ₹25.00 payout</td>
              <td style={{ fontWeight: 700, color: '#DC2626', fontFamily: 'Outfit' }}>- {formatINR(netEcon.driverPayout)}</td>
              <td style={{ color: '#9CA3AF' }}>Paid directly to riders</td>
              <td style={{ color: '#9CA3AF' }}>Paid directly to riders</td>
            </tr>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <td>
                <strong>NET AGENT EARNINGS</strong>
              </td>
              <td>60% of Net Platform Margin</td>
              <td style={{ fontWeight: 800, fontFamily: 'Outfit' }}>{formatINR(netEcon.adjustedPool)}</td>
              <td style={{ fontWeight: 800, color: '#059669', fontSize: '1.1rem', fontFamily: 'Outfit' }}>
                {formatINR(netEcon.totalAgentEarnings)}
              </td>
              <td style={{ fontWeight: 800, color: '#4B5563', fontSize: '1.1rem', fontFamily: 'Outfit' }}>
                {formatINR(netEcon.quikoooShare)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payout Settlements History */}
      <div className="table-card">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F0', backgroundColor: '#FAFAFA' }}>
          <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem' }}>
            Franchise Bank Transfer Settlement History
          </h3>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Settlement Reference</th>
              <th>Transfer Date</th>
              <th>Disbursed Amount</th>
              <th>Destination Bank Account</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(payouts?.payoutHistory || []).map((payout) => (
              <tr key={payout.id}>
                <td>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{payout.reference}</span>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>ID: {payout.id}</div>
                </td>
                <td>{payout.date}</td>
                <td>
                  <strong style={{ color: '#059669', fontFamily: 'Outfit', fontSize: '1rem' }}>
                    {formatINR(payout.amount)}
                  </strong>
                </td>
                <td>{payout.bankAccount}</td>
                <td>
                  <span className="status-pill status-active">● {payout.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
