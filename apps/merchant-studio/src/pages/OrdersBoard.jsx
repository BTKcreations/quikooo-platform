import React, { useState, useEffect } from 'react';
import {
  getOrders,
  transitionOrder,
  TRANSITION_LABELS,
  INITIAL_MENU_ITEMS,
  toggleItemStock,
  buildPrepTimePayload,
  formatINR,
} from '../api.js';
import { SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function OrdersBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [transitioningId, setTransitioningId] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Prep-time selector modal state
  const [prepModalOrder, setPrepModalOrder] = useState(null);
  const [selectedPrepTime, setSelectedPrepTime] = useState(15);

  // Stock toggle state
  const [menuItems, setMenuItems] = useState(INITIAL_MENU_ITEMS);
  const [isStockDrawerOpen, setIsStockDrawerOpen] = useState(false);

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
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
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
      console.warn('AudioContext warning:', e);
    }
  };

  // One-tap transition with prep-time interceptor for ORDER_PLACED -> VENDOR_ACCEPTED
  const handleTransitionClick = (order) => {
    if (order.status === 'ORDER_PLACED') {
      setPrepModalOrder(order);
      setSelectedPrepTime(order.prepMinutes || 15);
      return;
    }
    executeTransition(order);
  };

  const handleConfirmAcceptWithPrepTime = async () => {
    if (!prepModalOrder) return;
    const order = prepModalOrder;
    const prepPayload = buildPrepTimePayload(order.id, selectedPrepTime);
    setPrepModalOrder(null);
    await executeTransition(order, `Accepted with ${prepPayload.prepMinutes}m prep time`);
  };

  const executeTransition = async (order, notes = '') => {
    const actionConfig = TRANSITION_LABELS[order.status];
    if (!actionConfig || !actionConfig.next) return;

    const nextStatus = actionConfig.next;
    setTransitioningId(order.id);

    try {
      await transitionOrder(order.id, order.status, nextStatus, notes);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: nextStatus, prepMinutes: selectedPrepTime || o.prepMinutes }
            : o
        )
      );

      setAlertMessage(`✓ Order ${order.orderNumber} updated to ${nextStatus}!`);
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (err) {
      alert(`Transition failed: ${err.message}`);
    } finally {
      setTransitioningId(null);
    }
  };

  const handleToggleStock = (itemId) => {
    setMenuItems((prev) => toggleItemStock(prev, itemId));
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
        { productId: 'p-new', name: 'Special Butter Naan & Shahi Paneer', quantity: 1, originalPrice: 100, customerPrice: 105 },
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
      prepMinutes: 15,
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
      default:
        return <span className="badge badge-muted">{status}</span>;
    }
  };

  // Payout calculation metrics
  const totalSettlement = orders.reduce((sum, o) => sum + (o.vendorSettlement || 90), 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'DELIVERED').length;

  const renderOrderCard = (order) => {
    const action = TRANSITION_LABELS[order.status];
    const isProcessing = transitioningId === order.id;

    return (
      <div
        key={order.id}
        className="card"
        style={{
          borderLeft:
            order.status === 'ORDER_PLACED'
              ? '4px solid #F59E0B'
              : order.status === 'PREPARING'
              ? '4px solid #EA580C'
              : '4px solid #059669',
          padding: '1rem',
        }}
      >
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

        <div style={{ fontSize: '0.8rem', color: '#4B5563', marginBottom: '0.5rem' }}>
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
          <div style={{ backgroundColor: '#D1FAE5', border: '1.5px dashed #059669', borderRadius: '0.5rem', padding: '0.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#065F46', fontWeight: 700, textTransform: 'uppercase' }}>
              🛵 Rider Pickup Handshake OTP
            </div>
            <div style={{ fontSize: '1.4rem', fontFamily: 'monospace', fontWeight: 900, color: '#022C22', letterSpacing: '0.25em' }}>
              {order.pickupOtp || '4512'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#047857' }}>
              Verify with driver partner upon handover
            </div>
          </div>
        )}

        {/* Action Button */}
        {action && action.next ? (
          <button
            onClick={() => handleTransitionClick(order)}
            disabled={isProcessing}
            className={`btn-block ${action.btnClass}`}
            style={{ fontSize: '0.875rem', padding: '0.6rem', minHeight: '44px' }}
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
  };

  return (
    <div className="page-content">
      {/* Audio alert notification banner */}
      {alertMessage && (
        <div className="alert-chime-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#064E3B', fontSize: '0.85rem' }}>
            <span>🔊</span>
            <span>{alertMessage}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#064E3B', fontWeight: 700, minHeight: '44px', minWidth: '44px' }}
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Controls Header */}
      <div className="flex-row-between mb-3" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 700 }}>Orders POS Terminal</h1>
          <p className="text-secondary" style={{ fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
            Kitchen State Progression & Real-Time Fulfillment
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsStockDrawerOpen(true)}
            className="btn-secondary btn-sm"
            style={{ minHeight: '44px', padding: '0.4rem 0.75rem' }}
          >
            📦 Menu Stock
          </button>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="btn-secondary btn-sm"
            style={{ minHeight: '44px', padding: '0.4rem 0.75rem' }}
            title="Toggle Sound Alert"
          >
            {audioEnabled ? '🔔 Sound On' : '🔕 Muted'}
          </button>

          <button
            onClick={simulateNewOrder}
            className="btn-primary btn-sm"
            style={{ minHeight: '44px', padding: '0.4rem 0.85rem' }}
          >
            + Simulate Order
          </button>
        </div>
      </div>

      {/* Payout & Kitchen Summary Cards */}
      <div className="grid-cards mb-4">
        <div className="card" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
            Active Kitchen Orders
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginTop: '0.2rem' }}>
            {activeOrdersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
            Live in queue
          </div>
        </div>

        <div className="card" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
            Net Settlement (90%)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
            {formatINR(totalSettlement)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#4B5563' }}>
            Canonical 10% commission applied
          </div>
        </div>

        <div className="card" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
            Avg Prep Speed
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginTop: '0.2rem' }}>
            14 mins
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
            ⚡ 10-15m target met
          </div>
        </div>
      </div>

      {/* Filter Tabs (Mobile View) */}
      <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        {['ALL', 'ORDER_PLACED', 'PREPARING', 'READY_FOR_PICKUP'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '9999px',
              border: activeTab === tab ? '1.5px solid var(--color-brand-primary, #059669)' : '1px solid #E5E7EB',
              backgroundColor: activeTab === tab ? 'var(--color-brand-primary, #059669)' : '#FFFFFF',
              color: activeTab === tab ? '#FFFFFF' : '#4B5563',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: '44px',
            }}
          >
            {tab === 'ALL' ? 'All Orders' : tab.replace(/_/g, ' ')}
            {' '}({orders.filter((o) => (tab === 'ALL' ? true : o.status === tab)).length})
          </button>
        ))}
      </div>

      {/* Orders Board: Multi-Column on lg desktop, list on mobile */}
      {loading ? (
        <div className="grid-cards">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      ) : activeTab === 'ALL' ? (
        <div className="status-columns-board">
          {/* Column 1: Placed */}
          <div>
            <div className="status-column-header badge-placed">
              <span>🔔 Placed / New Orders</span>
              <span>{orders.filter((o) => o.status === 'ORDER_PLACED').length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {orders.filter((o) => o.status === 'ORDER_PLACED').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9CA3AF', fontSize: '0.85rem' }}>
                  No new orders waiting
                </div>
              ) : (
                orders.filter((o) => o.status === 'ORDER_PLACED').map(renderOrderCard)
              )}
            </div>
          </div>

          {/* Column 2: Accepted & Preparing */}
          <div>
            <div className="status-column-header badge-preparing">
              <span>🍳 Cooking & Preparing</span>
              <span>{orders.filter((o) => o.status === 'VENDOR_ACCEPTED' || o.status === 'PREPARING').length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {orders.filter((o) => o.status === 'VENDOR_ACCEPTED' || o.status === 'PREPARING').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9CA3AF', fontSize: '0.85rem' }}>
                  No active cooking tasks
                </div>
              ) : (
                orders.filter((o) => o.status === 'VENDOR_ACCEPTED' || o.status === 'PREPARING').map(renderOrderCard)
              )}
            </div>
          </div>

          {/* Column 3: Ready for Pickup */}
          <div>
            <div className="status-column-header badge-ready">
              <span>🛵 Ready for Driver Handshake</span>
              <span>{orders.filter((o) => o.status === 'READY_FOR_PICKUP').length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {orders.filter((o) => o.status === 'READY_FOR_PICKUP').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9CA3AF', fontSize: '0.85rem' }}>
                  No orders waiting for pickup
                </div>
              ) : (
                orders.filter((o) => o.status === 'READY_FOR_PICKUP').map(renderOrderCard)
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {orders.filter((o) => o.status === activeTab).length === 0 ? (
            <EmptyState
              icon="👨‍🍳"
              title={`No orders in ${activeTab}`}
              description="Click '+ Simulate Order' to test kitchen order arrival."
            />
          ) : (
            orders.filter((o) => o.status === activeTab).map(renderOrderCard)
          )}
        </div>
      )}

      {/* Prep-Time Selector Modal */}
      {prepModalOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1rem',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem' }}>
              Accept Order & Set Prep Time
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#4B5563', margin: '0 0 1rem 0' }}>
              Order: <strong>{prepModalOrder.orderNumber}</strong> ({prepModalOrder.items?.[0]?.name})
            </p>

            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              ⏱️ Kitchen Preparation Time:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {[10, 15, 20, 30].map((mins) => {
                const isSelected = selectedPrepTime === mins;
                return (
                  <button
                    key={mins}
                    onClick={() => setSelectedPrepTime(mins)}
                    style={{
                      padding: '0.6rem 0.25rem',
                      borderRadius: '0.5rem',
                      border: isSelected ? '2px solid #059669' : '1px solid #D1D5DB',
                      backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                      color: isSelected ? '#065F46' : '#111827',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPrepModalOrder(null)}
                className="btn-secondary btn-sm"
                style={{ minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAcceptWithPrepTime}
                className="btn-primary btn-sm"
                style={{ minHeight: '44px', padding: '0.5rem 1rem' }}
              >
                Confirm & Accept ({selectedPrepTime}m)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Toggle Drawer */}
      {isStockDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setIsStockDrawerOpen(false)} role="dialog" aria-modal="true">
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Menu Stock Manager</h2>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                  Instant On/Off Stock Toggles
                </span>
              </div>
              <button
                onClick={() => setIsStockDrawerOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', minHeight: '44px', minWidth: '44px' }}
                aria-label="Close stock manager"
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #E5E7EB',
                    backgroundColor: item.inStock ? '#FFFFFF' : '#F9FAFB',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: item.inStock ? '#111827' : '#9CA3AF' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      {item.category} • Listed: ₹{item.price}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStock(item.id)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: item.inStock ? '#D1FAE5' : '#FEE2E2',
                      color: item.inStock ? '#065F46' : '#991B1B',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      minHeight: '44px',
                      minWidth: '100px',
                    }}
                  >
                    {item.inStock ? '🟢 IN STOCK' : '🔴 SOLD OUT'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
