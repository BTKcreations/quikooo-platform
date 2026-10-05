import React, { useState, useEffect } from 'react';
import {
  getAgentPayouts,
  getAgentAnalytics,
  calculateRevenueSplit,
  calculateDeliveryInflow,
  calculateNetEconomics,
  calculateEarningsSimulator,
  formatINR,
  AGENT_SHARE_PERCENT,
  QUIKOOO_SHARE_PERCENT,
} from '../api.js';
import Skeleton from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';

export default function EarningsPage() {
  const { showToast } = useToast();

  const [payouts, setPayouts] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  // Interactive Simulator State: orders/day × avg → agent 60%
  const [ordersPerDay, setOrdersPerDay] = useState(50);
  const [avgContribution, setAvgContribution] = useState(13.94);
  const [projectionDays, setProjectionDays] = useState(30);

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
        showToast('⚠️ Could not load financial ledger. Using offline cache.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [showToast]);

  const handleRequestPayout = () => {
    setRequesting(true);
    setTimeout(() => {
      setRequesting(false);
      showToast('🎉 Settlement withdrawal request submitted to QUIKOOO Finance Ops!', 'success');
    }, 800);
  };

  // Run simulator math: (orders/day × avg → agent 60%)
  const sim = calculateEarningsSimulator({
    ordersPerDay,
    avgContribution,
    days: projectionDays,
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Franchise Earnings & 60/40 Revenue Ledger</h1>
          <p className="page-subtitle">
            Local Zone Franchise Agent profit-sharing: <strong>60% of Net Platform Margin</strong> (after GST). Customer delivery fee is 100% isolated pass-through.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={handleRequestPayout}
          disabled={requesting || loading || (payouts?.pendingPayout || 0) <= 0}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
        >
          {requesting ? 'Processing Request...' : `Withdraw Pending ${formatINR(payouts?.pendingPayout || 2360.0)}`}
        </button>
      </div>

      {/* Primary Wallet Payout Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Commission Earned</div>
          {loading ? (
            <Skeleton width="70%" height="32px" />
          ) : (
            <div className="stat-value" style={{ color: '#059669' }}>
              {formatINR(payouts?.totalEarned || 8360.0)}
            </div>
          )}
          <div className="stat-meta">Lifetime 60% franchise revenue share</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Settled / Paid to Bank</div>
          {loading ? (
            <Skeleton width="70%" height="32px" />
          ) : (
            <div className="stat-value" style={{ color: '#4B5563' }}>
              {formatINR(payouts?.totalPaid || 6000.0)}
            </div>
          )}
          <div className="stat-meta">Transferred via NEFT to HDFC Bank</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Pending Payout Balance</div>
          {loading ? (
            <Skeleton width="70%" height="32px" />
          ) : (
            <div className="stat-value" style={{ color: '#D97706' }}>
              {formatINR(payouts?.pendingPayout || 2360.0)}
            </div>
          )}
          <div className="stat-meta">Ready for weekly disbursement</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Franchise Contract Rate</div>
          <div className="stat-value" style={{ color: '#7C3AED' }}>
            {AGENT_SHARE_PERCENT}%
          </div>
          <div className="stat-meta">Quikooo Platform retained: {QUIKOOO_SHARE_PERCENT}%</div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout for lg: screens */}
      <div className="agent-2col-layout">
        {/* Left Column: Earnings Simulator Slider (orders/day × avg → agent 60%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Earnings Simulator Card */}
          <div
            className="table-card"
            style={{
              padding: '1.5rem',
              border: '2px solid #10B981',
              borderRadius: '0.875rem',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', color: '#064E3B' }}>
                  📈 Earnings Simulator (orders/day × avg → agent 60%)
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#4B5563' }}>
                  Model your territory revenue based on daily order velocity and average margin.
                </p>
              </div>

              <span
                style={{
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  padding: '0.3rem 0.65rem',
                  borderRadius: '9999px',
                  border: '1px solid #A7F3D0',
                }}
              >
                60% AGENT COMMISSION
              </span>
            </div>

            {/* Slider 1: Orders / Day */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>
                  Orders per Day: <span style={{ color: '#059669', fontSize: '1.1rem' }}>{ordersPerDay}</span>
                </label>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {[25, 50, 100, 200].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOrdersPerDay(preset)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '0.375rem',
                        border: '1px solid #D1D5DB',
                        backgroundColor: ordersPerDay === preset ? '#059669' : '#FFFFFF',
                        color: ordersPerDay === preset ? '#FFFFFF' : '#374151',
                        cursor: 'pointer',
                        minHeight: '28px',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="range"
                min="5"
                max="500"
                step="5"
                value={ordersPerDay}
                onChange={(e) => setOrdersPerDay(Number(e.target.value))}
                style={{ width: '100%', height: '8px', cursor: 'pointer', accentColor: '#059669' }}
                aria-label="Orders per day simulator slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                <span>5 / day</span>
                <span>250 / day</span>
                <span>500 / day</span>
              </div>
            </div>

            {/* Parameter 2: Avg Contribution / Order */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
                  Avg Net Platform Margin / Order:
                </label>
                <span style={{ fontWeight: 800, color: '#111827' }}>{formatINR(avgContribution)}</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { label: '₹10.00 (Snacks)', val: 10.0 },
                  { label: '₹13.94 (Canonical)', val: 13.94 },
                  { label: '₹20.00 (Farm Bulk)', val: 20.0 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setAvgContribution(item.val)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      borderRadius: '0.5rem',
                      border: '1px solid #D1D5DB',
                      backgroundColor: avgContribution === item.val ? '#D1FAE5' : '#F9FAFB',
                      color: avgContribution === item.val ? '#065F46' : '#4B5563',
                      cursor: 'pointer',
                      minHeight: '32px',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Projection Formula Highlight */}
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#065F46', marginBottom: '0.25rem' }}>
                SIMULATOR FORMULA: (orders/day × avg net margin → agent 60%)
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#166534', fontWeight: 700 }}>
                {ordersPerDay} orders/day × {formatINR(avgContribution)} net margin = {formatINR(sim.dailyPool)} daily pool → Agent 60% = {formatINR(sim.dailyAgentEarnings)}/day
              </div>
            </div>

            {/* Results Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ backgroundColor: '#ECFDF5', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 700 }}>AGENT DAILY EARNINGS (60%)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', fontFamily: 'Outfit' }}>
                  {formatINR(sim.dailyAgentEarnings)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#047857' }}>From {formatINR(sim.dailyPool)} daily pool</div>
              </div>

              <div style={{ backgroundColor: '#F3F4F6', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#4B5563', fontWeight: 700 }}>QUIKOOO DAILY SHARE (40%)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#374151', fontFamily: 'Outfit' }}>
                  {formatINR(sim.dailyQuikoooShare)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Platform retained share</div>
              </div>

              <div style={{ backgroundColor: '#EFF6FF', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: 700 }}>30-DAY MONTHLY PROJECTED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563EB', fontFamily: 'Outfit' }}>
                  {formatINR(sim.monthlyAgentEarnings)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#1E40AF' }}>Based on {sim.monthlyOrders} monthly orders</div>
              </div>
            </div>

            {/* 60/40 Split Bar Visualizer */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <span style={{ color: '#059669' }}>Local Zone Agent: 60% ({formatINR(sim.monthlyAgentEarnings)})</span>
                <span style={{ color: '#4B5563' }}>Quikooo Platform: 40% ({formatINR(sim.monthlyQuikoooShare)})</span>
              </div>
              <div style={{ height: '12px', width: '100%', backgroundColor: '#E5E7EB', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: '60%', backgroundColor: '#059669' }} />
                <div style={{ width: '40%', backgroundColor: '#4B5563' }} />
              </div>
            </div>
          </div>

          {/* Territory Net Economics Breakdown Table */}
          <div className="table-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem' }}>
              Full Economic Ledger Composition
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.825rem', color: '#6B7280' }}>
              Comparing platform contribution margin against logistics pass-through flows.
            </p>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Formula</th>
                  <th>Pool Value</th>
                  <th>Agent (60%)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Platform Contribution Margin</strong></td>
                  <td>{ordersPerDay * 30} orders × {formatINR(avgContribution)}</td>
                  <td style={{ fontWeight: 700, fontFamily: 'Outfit' }}>{formatINR(sim.monthlyPool)}</td>
                  <td style={{ fontWeight: 700, color: '#059669', fontFamily: 'Outfit' }}>{formatINR(sim.monthlyAgentEarnings)}</td>
                </tr>
                <tr>
                  <td><strong>Delivery Fee Inflow (Pass-Through)</strong></td>
                  <td>{ordersPerDay * 30} orders × ₹25.00</td>
                  <td style={{ fontWeight: 700, color: '#0284C7', fontFamily: 'Outfit' }}>{formatINR(ordersPerDay * 30 * 25)}</td>
                  <td style={{ color: '#9CA3AF' }}>₹0.00 (Driver 100%)</td>
                </tr>
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <td><strong>TOTAL AGENT EARNINGS</strong></td>
                  <td>Pure 60% franchise split</td>
                  <td style={{ fontWeight: 800, fontFamily: 'Outfit' }}>{formatINR(sim.monthlyPool)}</td>
                  <td style={{ fontWeight: 800, color: '#059669', fontSize: '1.1rem', fontFamily: 'Outfit' }}>
                    {formatINR(sim.monthlyAgentEarnings)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Canonical Order Benchmark & Payout Settlement History Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Canonical Benchmark Card (Original Price = ₹100.00) */}
          <div
            className="table-card"
            style={{
              padding: '1.25rem',
              background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
              border: '1px solid #A7F3D0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem', color: '#065F46' }}>
                📐 Canonical Order Benchmark (₹100 Listed)
              </h3>
              <span
                style={{
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                }}
              >
                60/40 SPLIT
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: '#4B5563' }}>Original Listed Price</span>
                <span style={{ fontWeight: 700 }}>₹100.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: '#4B5563' }}>+5% Menu Markup</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>+ ₹5.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: '#4B5563' }}>Vendor Settlement (-10% Comm)</span>
                <span style={{ fontWeight: 700 }}>₹90.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: '#4B5563' }}>Platform Fee + Delivery Fee</span>
                <span style={{ fontWeight: 700 }}>₹5.00 + ₹25.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: '#4B5563' }}>Net Revenue Pool (after GST)</span>
                <span style={{ fontWeight: 800, color: '#111827', fontFamily: 'Outfit' }}>₹13.94</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#D1FAE5',
                  borderRadius: '0.5rem',
                  marginTop: '0.25rem',
                }}
              >
                <strong style={{ color: '#065F46' }}>Agent 60% Share</strong>
                <strong style={{ color: '#059669', fontSize: '1.1rem', fontFamily: 'Outfit' }}>₹8.36</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.75rem', color: '#6B7280', fontSize: '0.78rem' }}>
                <span>Quikooo 40% Share</span>
                <span>₹5.58</span>
              </div>
            </div>
          </div>

          {/* Delivery Inflow Isolation Policy Card */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '0.875rem',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <strong style={{ fontSize: '0.95rem', color: '#1E40AF', fontFamily: 'Outfit, sans-serif' }}>
                Logistics Isolation Policy: ₹25.00 Delivery Fee
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#1E3A8A', lineHeight: 1.4 }}>
              The ₹25.00 delivery fee is 100% passed through directly to assigned delivery partners upon trip completion. It does not enter the platform margin pool and is excluded from agent commission calculations.
            </p>
          </div>

          {/* Franchise Bank Transfer Settlement History Cards */}
          <div className="table-card">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F0', backgroundColor: '#FAFAFA' }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem' }}>
                Bank Settlement Transfer History
              </h3>
            </div>

            <div style={{ padding: '0.75rem' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <Skeleton height="60px" borderRadius="0.5rem" />
                  <Skeleton height="60px" borderRadius="0.5rem" />
                </div>
              ) : (payouts?.payoutHistory || []).length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                  No historical settlement records.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(payouts?.payoutHistory || []).map((payout) => (
                    <div
                      key={payout.id}
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.5rem',
                        padding: '0.85rem 1rem',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {payout.reference}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.15rem' }}>
                          {payout.date} • {payout.bankAccount}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.05rem', color: '#059669' }}>
                          {formatINR(payout.amount)}
                        </div>
                        <span className="status-pill status-active" style={{ fontSize: '0.65rem' }}>
                          ● {payout.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
