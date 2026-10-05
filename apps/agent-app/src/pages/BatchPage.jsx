import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getDeliveryBatch,
  getRuralBatchOrders,
  dispatchRuralBatch,
  isRuralOrderEligible,
  formatINR,
} from '../api.js';
import MapView from '../components/MapView.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import ManifestList from '../components/ManifestList.jsx';
import Skeleton from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';

export default function BatchPage() {
  const { showToast } = useToast();

  const [deliveryDate, setDeliveryDate] = useState(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().split('T')[0];
  });

  const [batchMeta, setBatchMeta] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  // Simulation controls
  const [useSimulatedClock, setUseSimulatedClock] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState('20:30');

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch batch metadata and orders
  const loadBatchData = useCallback(async () => {
    setLoading(true);
    try {
      const meta = getDeliveryBatch(deliveryDate);
      setBatchMeta(meta);

      const batchOrders = await getRuralBatchOrders(deliveryDate);
      setOrders(batchOrders);
    } catch (err) {
      console.error('Failed to load rural batch orders:', err);
      showToast('⚠️ Failed to load batch data. Please check connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [deliveryDate, showToast]);

  useEffect(() => {
    loadBatchData();
  }, [loadBatchData]);

  // One-tap SCHEDULED -> READY_FOR_MORNING_DISPATCH
  const handleDispatchBatch = async () => {
    if (!batchMeta) return;
    setDispatching(true);
    try {
      const res = await dispatchRuralBatch(batchMeta.batchId);
      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          status: 'READY_FOR_MORNING_DISPATCH',
        }))
      );
      showToast(
        `✅ Transitioned ${res.ordersUpdated} orders to READY_FOR_MORNING_DISPATCH for 05:00-08:00 window!`,
        'success'
      );
    } catch (err) {
      showToast(`Dispatch failed: ${err.message}`, 'error');
    } finally {
      setDispatching(false);
    }
  };

  // Dispatch individual order
  const handleDispatchSingleOrder = async (orderId) => {
    if (!batchMeta) return;
    try {
      await dispatchRuralBatch(batchMeta.batchId, [orderId]);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: 'READY_FOR_MORNING_DISPATCH' } : o
        )
      );
      showToast(`Order marked READY for morning delivery`, 'success');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Bulk items vendor manifest
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
  const totalValue = orders.reduce((sum, o) => sum + (o.customerPayable || 0), 0);

  const clusterMarkers = useMemo(() => {
    const hubCenter = [12.5244, 76.8958];
    const hamletCoords = {
      'Gejjalagere Hamlet #2': { lat: 12.5802, lng: 76.9930 },
      'Koppa Grama Cross': { lat: 12.5930, lng: 77.0340 },
      'Maddur Station Outskirts': { lat: 12.5840, lng: 77.0450 },
      'Shivalli Extension': { lat: 12.5620, lng: 76.8820 },
      'Keragodu Cluster': { lat: 12.5990, lng: 76.9240 },
      'Besagarahalli Gate': { lat: 12.5510, lng: 77.0120 },
    };

    const groups = {};
    orders.forEach((o) => {
      const area = o.village || 'Mandya Rural Area';
      if (!groups[area]) groups[area] = [];
      groups[area].push(o);
    });

    const markers = [
      {
        lat: hubCenter[0],
        lng: hubCenter[1],
        type: 'hub',
        label: 'Mandya Hub (04:30 AM Aggregation)',
        description: 'Consolidated bulk pickup point before morning village departure.',
      },
    ];

    Object.entries(groups).forEach(([area, areaOrders], idx) => {
      const coords = hamletCoords[area] || {
        lat: 12.5244 + 0.035 * Math.sin(idx + 1),
        lng: 76.8958 + 0.045 * Math.cos(idx + 1),
      };

      const scheduledInArea = areaOrders.filter((o) => o.status === 'SCHEDULED_FOR_NEXT_DAY').length;
      const readyInArea = areaOrders.filter((o) => o.status === 'READY_FOR_MORNING_DISPATCH').length;

      markers.push({
        lat: coords.lat,
        lng: coords.lng,
        type: 'cluster',
        label: area,
        count: areaOrders.length,
        description: `${areaOrders.length} Orders (${scheduledInArea} scheduled, ${readyInArea} ready) • Route window: 05:00 - 08:00`,
      });
    });

    return markers;
  }, [orders]);

  return (
    <div className="page-container">
      {/* Offline Status Alert */}
      {!isOnline && (
        <div
          className="alert-card warning"
          style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <span style={{ fontSize: '1.5rem' }}>📡</span>
          <div>
            <strong>Offline Working Mode</strong>
            <p style={{ margin: 0, fontSize: '0.825rem' }}>
              Working from local cached manifest. Changes will synchronize with Quikooo Hub once reconnected.
            </p>
          </div>
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

        {/* Delivery Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Delivery Date:</label>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', padding: '0.45rem 0.75rem', minHeight: '40px' }}
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
      </div>

      {/* Cutoff Countdown Banner Component */}
      <CountdownTimer
        customTime={useSimulatedClock ? simulatedTime : null}
      />

      {/* Interactive Clock Simulation Tool */}
      <div
        style={{
          marginTop: '-0.75rem',
          marginBottom: '1.5rem',
          backgroundColor: '#FFFFFF',
          padding: '0.75rem 1rem',
          borderRadius: '0.75rem',
          border: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          fontSize: '0.8rem',
        }}
      >
        <span style={{ fontWeight: 700, color: '#4B5563' }}>🕒 Simulate Cutoff Clock:</span>
        <button
          className={useSimulatedClock && simulatedTime === '20:30' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', minHeight: '32px' }}
          onClick={() => {
            setUseSimulatedClock(true);
            setSimulatedTime('20:30');
          }}
        >
          20:30 IST (Open / Eligible)
        </button>

        <button
          className={useSimulatedClock && simulatedTime === '21:00' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', minHeight: '32px' }}
          onClick={() => {
            setUseSimulatedClock(true);
            setSimulatedTime('21:00');
          }}
        >
          21:00 IST (Cutoff Lock)
        </button>

        <button
          className={useSimulatedClock && simulatedTime === '21:15' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', minHeight: '32px' }}
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
              color: '#059669',
              fontWeight: 700,
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '0 0.25rem',
            }}
            onClick={() => setUseSimulatedClock(false)}
          >
            Reset to Live Clock
          </button>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="stat-card">
          <div className="stat-label">Batch ID</div>
          {loading ? (
            <Skeleton width="80%" height="24px" />
          ) : (
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: '#111827' }}>
              {batchMeta?.batchId}
            </div>
          )}
          <div className="stat-meta">Mandya Hub Morning Aggregation</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Delivery Window</div>
          <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: '#059669' }}>
            05:00 - 08:00 IST
          </div>
          <div className="stat-meta">Next-morning route dispatch</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Scheduled / Ready</div>
          {loading ? (
            <Skeleton width="60%" height="24px" />
          ) : (
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: '#7C3AED' }}>
              {scheduledCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#6B7280' }}>scheduled</span> • {readyCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#059669' }}>ready</span>
            </div>
          )}
          <div className="stat-meta">{orders.length} total orders in batch</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Batch Gross Value</div>
          {loading ? (
            <Skeleton width="70%" height="24px" />
          ) : (
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: '#0284C7' }}>
              {formatINR(totalValue)}
            </div>
          )}
          <div className="stat-meta">Aggregated farm & pantry staples</div>
        </div>
      </div>

      {/* Rural Cluster Map View with Clustered Area Markers & Zone Boundary */}
      <div className="card mb-4" style={{ padding: '1rem', borderTop: '4px solid #059669', marginBottom: '1.5rem' }}>
        <div className="flex-row-between mb-2">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🗺️</span>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', color: '#111827' }}>
                Rural Aggregation Map & Cluster Boundaries
              </h3>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                15 km Zone Circle
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#6B7280' }}>
              Consolidated order markers clustered across 6 village hamlets with central Mandya Hub dispatch point.
            </p>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
            {orders.length} Batch Orders Clustered
          </div>
        </div>

        <MapView
          center={[12.5244, 76.8958]}
          zoom={11}
          radiusKm={15}
          markers={clusterMarkers}
          className="quikooo-map-container"
          style={{ height: '280px' }}
        />

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.6rem', fontSize: '0.72rem', color: '#4B5563' }}>
          <span>🏛️ <strong>Mandya Hub:</strong> Primary bulk aggregation (04:30 AM)</span>
          <span>🏘️ <strong>Clusters:</strong> Gejjalagere, Koppa, Maddur, Shivalli, Keragodu, Besagarahalli</span>
          <span style={{ color: '#059669', fontWeight: 700 }}>⚡ 05:00 - 08:00 Delivery Window</span>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout for lg: screens */}
      <div className="agent-2col-layout">
        {/* Left Column: Grouped Batch Manifest List */}
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', color: '#111827' }}>
                Batch Manifest Grouped by Area
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
                Grouped by village hamlets for consolidated early morning delivery routes.
              </p>
            </div>
          </div>

          <ManifestList
            orders={orders}
            loading={loading}
            pageSize={50}
            onDispatchOrder={handleDispatchSingleOrder}
            onDispatchAll={handleDispatchBatch}
            dispatching={dispatching}
          />
        </div>

        {/* Right Column: State Machine Action Card & Hub Pickup Manifest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* One-Tap Transition Control Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #059669',
              borderRadius: '0.875rem',
              padding: '1.25rem',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
              <strong style={{ fontSize: '1.05rem', color: '#065F46', fontFamily: 'Outfit, sans-serif' }}>
                One-Tap Dispatch Transition
              </strong>
            </div>

            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.4 }}>
              Promote all scheduled orders from{' '}
              <code style={{ background: '#FEF3C7', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                SCHEDULED_FOR_NEXT_DAY
              </code>{' '}
              to{' '}
              <code style={{ background: '#D1FAE5', color: '#065F46', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                READY_FOR_MORNING_DISPATCH
              </code>
              .
            </p>

            <button
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 700,
              }}
              onClick={handleDispatchBatch}
              disabled={dispatching || scheduledCount === 0}
            >
              {dispatching
                ? 'Processing Transition...'
                : scheduledCount === 0
                ? '✓ All Orders Ready for Dispatch'
                : `⚡ One-Tap: Dispatch ${scheduledCount} Orders`}
            </button>
          </div>

          {/* Bulk Morning Pickup Manifest */}
          <div className="table-card">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F0', backgroundColor: '#F9FAFB' }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem' }}>
                Vendor Early Pickup Aggregation (04:30 AM)
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#6B7280' }}>
                Consolidated bulk units for riders before morning village departure.
              </p>
            </div>

            <div style={{ padding: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <Skeleton height="50px" borderRadius="0.5rem" />
                  <Skeleton height="50px" borderRadius="0.5rem" />
                  <Skeleton height="50px" borderRadius="0.5rem" />
                </div>
              ) : Object.keys(manifestItems).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '1rem', fontSize: '0.85rem' }}>
                  No bulk vendor items to pick up.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {Object.values(manifestItems).map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827' }}>
                          {it.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                          {it.vendor}
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.375rem',
                          fontWeight: 800,
                          fontFamily: 'Outfit',
                          fontSize: '0.95rem',
                        }}
                      >
                        {it.totalQty} Units
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Dispatch CTA (appears only on mobile < 1024px when scheduled orders exist) */}
      {scheduledCount > 0 && (
        <div className="sticky-dispatch-bar" role="complementary" aria-label="Quick Dispatch Bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{scheduledCount} Orders Scheduled</div>
              <div style={{ fontSize: '0.7rem', color: '#A7F3D0' }}>Ready for 05:00-08:00 window</div>
            </div>
          </div>

          <button
            onClick={handleDispatchBatch}
            disabled={dispatching}
            style={{
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: '38px',
            }}
          >
            {dispatching ? 'Dispatching...' : 'One-Tap Dispatch'}
          </button>
        </div>
      )}
    </div>
  );
}
