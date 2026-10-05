import React, { useState, useEffect } from 'react';
import { getOrders, transitionOrder, TRANSITION_LABELS, formatINR } from '../api.js';

export default function OrdersBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [transitioningId, setTransitioningId] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    async function fetchInitialOrders() {
      try {
        const data = await getOrders();
        setOrders(data);
      } catch (err) {
        console.error('Failed to load orders', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialOrders();
  }, []);

  // Web Audio synthesizer for incoming order alert chime
  const playAlertChime = () => {
    if (!audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Bell chime tone 1 (1046.5Hz - C6)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.frequency.setValueAtTime(1046.5, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Bell chime tone 2 (1318.5Hz - E6)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.frequency.setValueAtTime(1318.5, now + 0.18);
      gain2.gain.setValueAtTime(0.35, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  };

  // Handle advancing state machine via transition API
  const handleTransition = async (order) => {
    const actionConfig = TRANSITION_LABELS[order.status];
    if (!actionConfig || !actionConfig.next) return;

    const nextStatus = actionConfig.next;
    setTransitioningId(order.id);

    try {
      const res = await transitionOrder(order.id, order.status, nextStatus);
      
      // Update order status in local state
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
      );

      setAlertMessage(`Order ${order.orderNumber} transitioned to ${nextStatus}!`);
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (err) {
      alert(`Transition failed: ${err.message}`);
    } finally {
      setTransitioningId(null);
    }
  };

  // Simulate new incoming order to demonstrate audio chime and live terminal
  const simulateNewOrder = () => {
    const randomId = `ord-${Math.floor(100 + Math.random() * 900)}`;
    const newOrder = {
      id: randomId,
      orderNumber: `QK-20261005-${randomId.substring(4)}`,
      customerName: 'Kavita Menon',
      customerPhone: '+91 98200 44556',
      items: [
        { productId: 'p-new', name: 'Special Butter Naan & Shahi Paneer', quantity: 1, originalPrice: 100, customerPrice: 105 }
      ],
      totalOriginalPrice: 100,
      subtotal: 105,
      platformFee: 5,
      deliveryFee: 25,
      customerPayable: 135,
      vendorSettlement: 90,
      status: 'ORDER_PLACED',
      placedAt: new Date().toISOString(),
      pickupOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    playAlertChime();
    setAlertMessage(`🔔 NEW ORDER: ${newOrder.orderNumber} received! Chime played.`);
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ORDER_PLACED':
        return <span className="badge badge-placed">🔔 Placed (Needs Acceptance)</span>;
      case 'VENDOR_ACCEPTED':
        return <span className="badge badge-accepted">⏳ Accepted (In Queue)</span>;
      case 'PREPARING':
        return <span className="badge badge-preparing">🍳 Cooking / Preparing</span>;
      case 'READY_FOR_PICKUP':
        return <span className="badge badge-ready">🛵 Ready for Pickup</span>;
      case 'DELIVERED':
        return <span className="badge badge-success">✅ Delivered</span>;
      default:
        return <span className="badge badge-muted">{status}</span>;
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'ALL') return true;
    return o.status === activeTab;
  });

  return (
    <div className="page-content">
      {/* Audio alert notification banner placeholder */}
      {alertMessage && (
        <div className="alert-chime-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#064E3B', fontSize: '0.85rem' }}>
            <span>🔊</span>
            <span>{alertMessage}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#064E3B', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header with audio chime toggle & simulate button */}
      <div className="flex-row-between mb-3">
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Orders Board</h2>
          <p className="text-secondary" style={{ fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
            Kitchen POS & State Progression Terminal
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="btn-secondary btn-sm"
            title="Toggle Sound Alert"
            style={{ padding: '0.35rem 0.6rem' }}
          >
            {audioEnabled ? '🔔 Sound On' : '🔕 Muted'}
          </button>

          <button
            onClick={simulateNewOrder}
            className="btn-primary btn-sm"
            style={{ padding: '0.35rem 0.75rem' }}
          >
            + New Order
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
        {['ALL', 'ORDER_PLACED', 'VENDOR_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '9999px',
              border: activeTab === tab ? '1px solid var(--color-brand-primary, #059669)' : '1px solid #E5E7EB',
              backgroundColor: activeTab === tab ? 'var(--color-brand-primary, #059669)' : '#FFFFFF',
              color: activeTab === tab ? '#FFFFFF' : '#4B5563',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab === 'ALL' ? 'All Orders' : tab.replace(/_/g, ' ')}
            {' '}({orders.filter((o) => (tab === 'ALL' ? true : o.status === tab)).length})
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>Loading kitchen terminal...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>👨‍🍳</span>
          <h3 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.1rem' }}>No orders in this stage</h3>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            Click <strong>"+ New Order"</strong> to simulate an incoming customer order.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredOrders.map((order) => {
            const action = TRANSITION_LABELS[order.status];
            const isProcessing = transitioningId === order.id;

            return (
              <div
                key={order.id}
                className="card"
                style={{
                  borderLeft: order.status === 'ORDER_PLACED' ? '4px solid #F59E0B' : order.status === 'PREPARING' ? '4px solid #EA580C' : '4px solid #059669',
                }}
              >
                {/* Header row */}
                <div className="flex-row-between mb-2">
                  <div>
                    <span style={{ fontFamily: 'var(--font-family-display, Outfit)', fontWeight: 700, fontSize: '0.95rem' }}>
                      {order.orderNumber}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', marginLeft: '0.5rem' }}>
                      {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Customer Details */}
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #4B5563)', marginBottom: '0.5rem' }}>
                  Customer: <strong>{order.customerName}</strong> ({order.customerPhone || 'Urban Cluster'})
                </div>

                {/* Items List */}
                <div style={{ backgroundColor: '#F9FAFB', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.75rem' }}>
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex-row-between" style={{ fontSize: '0.85rem', padding: '0.15rem 0' }}>
                      <span><strong>{item.quantity}x</strong> {item.name}</span>
                      <span style={{ fontWeight: 600 }}>{formatINR((item.originalPrice || 100) * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing / Settlement summary */}
                <div className="flex-row-between" style={{ fontSize: '0.8rem', borderTop: '1px solid #F3F4F0', paddingTop: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span className="text-secondary">Original Listed: </span>
                    <strong>{formatINR(order.totalOriginalPrice || 100)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#059669', fontWeight: 600 }}>Net Settlement (90%): </span>
                    <strong style={{ color: '#059669' }}>{formatINR(order.vendorSettlement || 90)}</strong>
                  </div>
                </div>

                {/* Driver Pickup OTP display when READY_FOR_PICKUP */}
                {order.status === 'READY_FOR_PICKUP' && (
                  <div style={{ backgroundColor: '#D1FAE5', border: '1px dashed #059669', borderRadius: '0.5rem', padding: '0.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#065F46', fontWeight: 600, textTransform: 'uppercase' }}>
                      🛵 Rider Pickup Handshake OTP
                    </div>
                    <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 800, color: '#022C22', letterSpacing: '0.2em' }}>
                      {order.pickupOtp || '4512'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#047857' }}>
                      Verify with driver partner upon food bag handover
                    </div>
                  </div>
                )}

                {/* Action Transition Button */}
                {action && action.next ? (
                  <button
                    onClick={() => handleTransition(order)}
                    disabled={isProcessing}
                    className={`btn-block ${action.btnClass}`}
                    style={{ fontSize: '0.875rem', padding: '0.55rem' }}
                  >
                    {isProcessing ? 'Updating Status...' : `Advance: ${action.label} →`}
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#059669', fontWeight: 600, padding: '0.25rem' }}>
                    ✓ Order Ready — Waiting for Rider Pickup
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
