import React, { useState, useEffect } from 'react';
import {
  getDeliveryBatch,
  getRuralBatchOrders,
  dispatchRuralBatch,
  isRuralOrderEligible,
  formatINR,
} from '../api.js';

export default function BatchPage() {
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().split('T')[0];
  });

  const [batchMeta, setBatchMeta] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Cutoff simulation / state
  const [simulatedTime, setSimulatedTime] = useState('21:00');
  const [useSimulatedClock, setUseSimulatedClock] = useState(false);

  // Compute cutoff eligibility
  const isCutoffPassed = useSimulatedClock
    ? !isRuralOrderEligible(simulatedTime)
    : !isRuralOrderEligible(new Date());

  useEffect(() => {
    const meta = getDeliveryBatch(deliveryDate);
    setBatchMeta(meta);

    async function loadOrders() {
      try {
        const batchOrders = await getRuralBatchOrders(deliveryDate);
        setOrders(batchOrders);
      } catch (err) {
        console.error('Failed to load rural batch orders:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [deliveryDate]);

  const handleDispatchBatch = async () => {
    setDispatching(true);
    try {
      const res = await dispatchRuralBatch(batchMeta.batchId);
      // Refresh local state to READY_FOR_MORNING_DISPATCH
      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          status: 'READY_FOR_MORNING_DISPATCH',
        }))
      );
      showToast(`✅ Batch ${batchMeta.batchId} locked & released for morning 05:00-08:00 dispatch!`);
    } catch (err) {
      alert(`Dispatch error: ${err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 5000);
  };

  // Consolidated items manifest summary
  const manifestItems = orders.reduce((acc, order) => {
    (order.items || []).forEach((item) => {
      const key = `${item.vendor} - ${item.name}`;
      if (!acc[key]) {
        acc[key] = { vendor: item.vendor, name: item.name, totalQty: 0 };
      }
      acc[key].totalQty += item.qty;
    });
    return acc;
  }, {});

  const scheduledCount = orders.filter((o) => o.status === 'SCHEDULED_FOR_NEXT_DAY').length;
  const readyCount = orders.filter((o) => o.status === 'READY_FOR_MORNING_DISPATCH').length;

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
          <h1 className="page-title">Rural Aggregated Batch Operations</h1>
          <p className="page-subtitle">
            Daily consolidated dispatch pipeline. Strict <strong>21:00 Asia/Kolkata cutoff</strong> locks orders for next-morning <strong>05:00 - 08:00</strong> dispatch.
          </p>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Delivery Date:</label>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', padding: '0.45rem 0.75rem' }}
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
      </div>

      {/* Cutoff Status Card */}
      <div className={`alert-card ${isCutoffPassed ? 'locked' : 'success'}`}>
        <div style={{ fontSize: '2rem' }}>{isCutoffPassed ? '🔒' : '🟢'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <strong style={{ fontSize: '1.05rem', fontFamily: 'Outfit, sans-serif' }}>
              {isCutoffPassed
                ? '21:00 Asia/Kolkata Cutoff Reached — Rural Batch Locked'
                : 'Rural Batch Ordering Open (Cutoff: 21:00 Asia/Kolkata)'}
            </strong>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: isCutoffPassed ? '#DC2626' : '#059669',
                color: '#FFFFFF',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
              }}
            >
              {isCutoffPassed ? 'CUTOFF LOCKED' : 'WINDOW OPEN'}
            </span>
          </div>

          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
            {isCutoffPassed
              ? 'New rural orders are strictly closed for next-day morning dispatch and scheduled for subsequent day. Current batch is frozen for morning route aggregation.'
              : 'Accepting scheduled rural orders for early morning delivery. Ordering will automatically lock at exactly 21:00 IST.'}
          </p>

          {/* Interactive Clock Simulation Tool */}
          <div
            style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ fontWeight: 600 }}>Simulate Cutoff Clock:</span>
            <button
              className={useSimulatedClock && simulatedTime === '20:30' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              onClick={() => {
                setUseSimulatedClock(true);
                setSimulatedTime('20:30');
              }}
            >
              20:30 IST (Open / Eligible)
            </button>

            <button
              className={useSimulatedClock && simulatedTime === '21:00' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              onClick={() => {
                setUseSimulatedClock(true);
                setSimulatedTime('21:00');
              }}
            >
              21:00 IST (Cutoff Lock)
            </button>

            <button
              className={useSimulatedClock && simulatedTime === '21:15' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              onClick={() => {
                setUseSimulatedClock(true);
                setSimulatedTime('21:15');
              }}
            >
              21:15 IST (Past Cutoff)
            </button>

            {useSimulatedClock && (
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6B7280',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
                onClick={() => setUseSimulatedClock(false)}
              >
                Reset to Live Clock
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Batch Metadata Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="stat-card">
          <div className="stat-label">Batch ID</div>
          <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.25rem', color: '#111827' }}>
            {batchMeta?.batchId}
          </div>
          <div className="stat-meta">Mandya Hub Morning Aggregation</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Morning Delivery Window</div>
          <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.25rem', color: '#059669' }}>
            05:00 - 08:00 IST
          </div>
          <div className="stat-meta">{batchMeta?.timezone} timezone</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Scheduled Orders</div>
          <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.25rem', color: '#7C3AED' }}>
            {orders.length} orders
          </div>
          <div className="stat-meta">
            {scheduledCount} scheduled • {readyCount} ready for dispatch
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Batch Gross Value</div>
          <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.25rem', color: '#0284C7' }}>
            {formatINR(orders.reduce((sum, o) => sum + (o.customerPayable || 0), 0))}
          </div>
          <div className="stat-meta">Aggregated farm & grocery staples</div>
        </div>
      </div>

      {/* Action Banner: SCHEDULED_FOR_NEXT_DAY -> READY_FOR_MORNING_DISPATCH */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #059669',
          borderRadius: '0.875rem',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 12px rgba(5, 150, 105, 0.08)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <strong style={{ fontSize: '1.05rem', color: '#065F46', fontFamily: 'Outfit' }}>
              State Machine Transition Control
            </strong>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#4B5563' }}>
            Promote rural scheduled orders:{' '}
            <code style={{ background: '#FEF3C7', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
              SCHEDULED_FOR_NEXT_DAY
            </code>{' '}
            ➔{' '}
            <code style={{ background: '#D1FAE5', color: '#065F46', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
              READY_FOR_MORNING_DISPATCH
            </code>
          </p>
        </div>

        <button
          className="btn-primary"
          style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
          onClick={handleDispatchBatch}
          disabled={dispatching || scheduledCount === 0}
        >
          {dispatching
            ? 'Locking & Transitioning...'
            : scheduledCount === 0
            ? '✓ All Orders Ready for Dispatch'
            : `Lock & Release ${scheduledCount} Orders for Morning Dispatch`}
        </button>
      </div>

      {/* Batch Orders Table */}
      <div className="table-card" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F0', backgroundColor: '#FAFAFA' }}>
          <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem' }}>
            Rural Scheduled Orders Roster
          </h3>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Customer & Hamlet</th>
              <th>Consolidated Items</th>
              <th>Original Listed</th>
              <th>Customer Total</th>
              <th>Dispatch Window</th>
              <th>Lifecycle Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading batch orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                  No rural scheduled orders found for delivery date {deliveryDate}.
                </td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr key={ord.id}>
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{ord.orderNumber}</span>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      Placed: {new Date(ord.placedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ord.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>📍 {ord.village}</div>
                  </td>
                  <td>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#374151' }}>
                      {(ord.items || []).map((it, idx) => (
                        <li key={idx}>
                          <strong>{it.qty}x</strong> {it.name}{' '}
                          <span style={{ color: '#9CA3AF', fontSize: '0.7rem' }}>({it.vendor})</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>{formatINR(ord.originalTotal)}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{formatINR(ord.customerPayable)}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669' }}>
                      {ord.window || '05:00 - 08:00'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        ord.status === 'READY_FOR_MORNING_DISPATCH'
                          ? 'status-approved'
                          : 'status-pending'
                      }`}
                    >
                      {ord.status === 'READY_FOR_MORNING_DISPATCH' ? '🟢 READY' : '⏱️ SCHEDULED'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Morning Pickup Manifest */}
      <div className="table-card">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F0', backgroundColor: '#F9FAFB' }}>
          <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem' }}>
            Consolidated Hub Vendor Pickup Manifest (For Early Morning 04:30 Pickup)
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
            Rider collects aggregated bulk quantities from vendors before starting the 05:00 - 08:00 village delivery route.
          </p>
        </div>

        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {Object.values(manifestItems).map((manifestItem, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{manifestItem.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>{manifestItem.vendor}</div>
                </div>
                <div
                  style={{
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.5rem',
                    fontWeight: 700,
                    fontFamily: 'Outfit',
                    fontSize: '1.1rem',
                  }}
                >
                  {manifestItem.totalQty} Units
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
