import React, { useState, useEffect } from 'react';
import {
  getOrders,
  transitionOrder,
  TRANSITION_LABELS,
  INITIAL_MENU_ITEMS,
  toggleItemStock,
  buildPrepTimePayload,
  formatINR,
  PREP_TIME_OPTIONS,
} from '../api.js';
import { SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import AudioAlert, {
  getStoredAudioMuted,
  setStoredAudioMuted,
  playOrderBeep,
} from '../components/AudioAlert.jsx';
import PrepTimer from '../components/PrepTimer.jsx';

export default function OrdersBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [transitioningId, setTransitioningId] = useState(null);

  // Audio Alert State with localStorage persistence
  const [audioMuted, setAudioMuted] = useState(() => getStoredAudioMuted());

  // Toast notifications hook
  const { showToast } = useToast();

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
        showToast('Failed to load active orders', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchInitialOrders();
  }, [showToast]);

  const handleToggleAudio = () => {
    const nextMuted = !audioMuted;
    setAudioMuted(nextMuted);
    setStoredAudioMuted(nextMuted);
    showToast(
      nextMuted ? '🔕 Sound alerts muted' : '🔔 Sound alerts enabled',
      'info'
    );
  };

  // Open prep-time selector modal
  const openPrepModal = (order) => {
    setPrepModalOrder(order);
    setSelectedPrepTime(order.prepMinutes || 15);
  };

  // One-tap Accept directly with default/selected prep time
  const handleOneTapAccept = async (order, prepMins = 15) => {
    const prepPayload = buildPrepTimePayload(order.id, prepMins);
    await executeTransition(
      order,
      'VENDOR_ACCEPTED',
      `Accepted with ${prepPayload.prepMinutes}m prep time`,
      prepPayload.prepMinutes
    );
  };

  // Advance order through one-tap button progression:
  // ORDER_PLACED -> VENDOR_ACCEPTED -> PREPARING -> READY_FOR_PICKUP
  const handleAdvanceOrder = async (order) => {
    if (order.status === 'ORDER_PLACED') {
      await handleOneTapAccept(order, order.prepMinutes || 15);
      return;
    }

    const actionConfig = TRANSITION_LABELS[order.status];
    if (actionConfig && actionConfig.next) {
      await executeTransition(order, actionConfig.next);
    }
  };

  const handleConfirmPrepModal = async () => {
    if (!prepModalOrder) return;
    const order = prepModalOrder;
    const prepMins = selectedPrepTime || 15;
    setPrepModalOrder(null);
    await handleOneTapAccept(order, prepMins);
  };

  const executeTransition = async (order, nextStatus, notes = '', customPrepMinutes = null) => {
    setTransitioningId(order.id);

    try {
      await transitionOrder(order.id, order.status, nextStatus, notes);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: nextStatus,
                prepMinutes: customPrepMinutes || o.prepMinutes || 15,
              }
            : o
        )
      );

      const statusLabels = {
        VENDOR_ACCEPTED: 'Accepted (Queue)',
        PREPARING: 'Cooking / Preparing',
        READY_FOR_PICKUP: 'Ready for Pickup',
      };
      showToast(
        `✓ Order ${order.orderNumber} advanced to ${statusLabels[nextStatus] || nextStatus}!`,
        'success'
      );
    } catch (err) {
      showToast(`Transition failed: ${err.message}`, 'error');
    } finally {
      setTransitioningId(null);
    }
  };

  const handleToggleStock = (itemId) => {
    setMenuItems((prev) => {
      const updated = toggleItemStock(prev, itemId);
      const item = updated.find((it) => it.id === itemId);
      if (item) {
        showToast(
          `${item.name} is now ${item.inStock ? 'IN STOCK 🟢' : 'SOLD OUT 🔴'}`,
          item.inStock ? 'success' : 'info'
        );
      }
      return updated;
    });
  };

  // Simulate new incoming order with audio chime alert
  const simulateNewOrder = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const newOrder = {
      id: `ord-${randomNum}`,
      orderNumber: `QK-20261005-${randomNum}`,
      customerName: 'Kavita Menon',
      customerPhone: '+91 98200 44556',
      items: [
        {
          productId: 'p-new',
          name: 'Special Butter Naan & Shahi Paneer',
          quantity: 1,
          originalPrice: 100,
          customerPrice: 105,
        },
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
    playOrderBeep(audioMuted);
    showToast(`🔔 NEW ORDER: ${newOrder.orderNumber} received!`, 'success');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ORDER_PLACED':
        return <span className="badge badge-placed">🔔 Placed</span>;
      case 'VENDOR_ACCEPTED':
        return <span className="badge badge-accepted">⏳ Accepted</span>;
      case 'PREPARING':
        return <span className="badge badge-preparing">🍳 Cooking</span>;
      case 'READY_FOR_PICKUP':
        return <span className="badge badge-ready">🛵 Ready</span>;
      default:
        return <span className="badge badge-muted">{status}</span>;
    }
  };

  // Payout calculation metrics
  const totalSettlement = orders.reduce(
    (sum, o) => sum + (o.vendorSettlement || 90),
    0
  );
  const activeOrdersCount = orders.filter((o) => o.status !== 'DELIVERED').length;

  // Filter definitions for tabs
  const filterTabs = [
    { key: 'ALL', label: 'All Orders', count: orders.length },
    {
      key: 'ORDER_PLACED',
      label: '🔔 Placed',
      count: orders.filter((o) => o.status === 'ORDER_PLACED').length,
    },
    {
      key: 'PREPARING',
      label: '🍳 Cooking',
      count: orders.filter(
        (o) => o.status === 'VENDOR_ACCEPTED' || o.status === 'PREPARING'
      ).length,
    },
    {
      key: 'READY_FOR_PICKUP',
      label: '🛵 Ready',
      count: orders.filter((o) => o.status === 'READY_FOR_PICKUP').length,
    },
  ];

  const matchesFilter = (order, filter) => {
    if (filter === 'ALL') return true;
    if (filter === 'PREPARING') {
      return order.status === 'VENDOR_ACCEPTED' || order.status === 'PREPARING';
    }
    return order.status === filter;
  };

  const renderOrderCard = (order) => {
    const isProcessing = transitioningId === order.id;

    return (
      <div
        key={order.id}
        className="card"
        style={{
          borderLeft:
            order.status === 'ORDER_PLACED'
              ? '4px solid #F59E0B'
              : order.status === 'VENDOR_ACCEPTED'
              ? '4px solid #4F46E5'
              : order.status === 'PREPARING'
              ? '4px solid #EA580C'
              : '4px solid #059669',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        {/* Card Header */}
        <div className="flex-row-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-family-display, Outfit)',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}
            >
              {order.orderNumber}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
              {new Date(order.placedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {getStatusBadge(order.status)}
          </div>
        </div>

        {/* Live PrepTimer Countdown */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>
            Customer: <strong>{order.customerName}</strong>
          </div>
          <PrepTimer
            placedAt={order.placedAt}
            prepMinutes={order.prepMinutes || 15}
            status={order.status}
          />
        </div>

        {/* Items List */}
        <div
          style={{
            backgroundColor: '#F9FAFB',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
          }}
        >
          {order.items?.map((item, idx) => (
            <div
              key={idx}
              className="flex-row-between"
              style={{ fontSize: '0.85rem', padding: '0.15rem 0' }}
            >
              <span>
                <strong>{item.quantity}x</strong> {item.name}
              </span>
              <span style={{ fontWeight: 600 }}>
                {formatINR((item.originalPrice || 100) * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing / Settlement summary */}
        <div
          className="flex-row-between"
          style={{
            fontSize: '0.8rem',
            borderTop: '1px solid #F3F4F0',
            paddingTop: '0.5rem',
          }}
        >
          <div>
            <span className="text-secondary">Original Listed: </span>
            <strong>{formatINR(order.totalOriginalPrice || 100)}</strong>
          </div>
          <div>
            <span style={{ color: '#059669', fontWeight: 600 }}>
              Net Settlement (90%):{' '}
            </span>
            <strong style={{ color: '#059669' }}>
              {formatINR(order.vendorSettlement || 90)}
            </strong>
          </div>
        </div>

        {/* Driver Pickup OTP display when READY_FOR_PICKUP */}
        {order.status === 'READY_FOR_PICKUP' && (
          <div
            style={{
              backgroundColor: '#D1FAE5',
              border: '1.5px dashed #059669',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                color: '#065F46',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              🛵 Rider Pickup Handshake OTP
            </div>
            <div
              style={{
                fontSize: '1.4rem',
                fontFamily: 'monospace',
                fontWeight: 900,
                color: '#022C22',
                letterSpacing: '0.25em',
              }}
            >
              {order.pickupOtp || '4512'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#047857' }}>
              Verify with driver partner upon handover
            </div>
          </div>
        )}

        {/* One-Tap Progression Buttons */}
        {order.status === 'ORDER_PLACED' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleOneTapAccept(order, 15)}
              disabled={isProcessing}
              className="btn-primary btn-block"
              style={{
                fontSize: '0.875rem',
                padding: '0.6rem',
                minHeight: '44px',
                flex: 2,
              }}
            >
              {isProcessing ? 'Accepting...' : '⚡ One-Tap Accept (15m)'}
            </button>
            <button
              onClick={() => openPrepModal(order)}
              disabled={isProcessing}
              className="btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.6rem',
                minHeight: '44px',
                flex: 1,
              }}
              title="Set custom preparation time"
            >
              ⏱️ Time...
            </button>
          </div>
        )}

        {order.status === 'VENDOR_ACCEPTED' && (
          <button
            onClick={() => handleAdvanceOrder(order)}
            disabled={isProcessing}
            className="btn-primary btn-block"
            style={{
              fontSize: '0.875rem',
              padding: '0.6rem',
              minHeight: '44px',
              backgroundColor: '#4F46E5',
              borderColor: '#4338CA',
            }}
          >
            {isProcessing ? 'Updating...' : '🍳 Start Cooking →'}
          </button>
        )}

        {order.status === 'PREPARING' && (
          <button
            onClick={() => handleAdvanceOrder(order)}
            disabled={isProcessing}
            className="btn-primary btn-block"
            style={{
              fontSize: '0.875rem',
              padding: '0.6rem',
              minHeight: '44px',
              backgroundColor: '#EA580C',
              borderColor: '#C2410C',
            }}
          >
            {isProcessing ? 'Updating...' : '🛵 Mark Ready for Pickup →'}
          </button>
        )}

        {order.status === 'READY_FOR_PICKUP' && (
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.8rem',
              color: '#059669',
              fontWeight: 600,
              padding: '0.25rem',
            }}
          >
            ✓ Order Ready — Waiting for Rider Pickup
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-content">
      {/* Top Controls Header */}
      <div
        className="flex-row-between mb-3"
        style={{ flexWrap: 'wrap', gap: '0.5rem' }}
      >
        <div>
          <h1 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 700 }}>
            Orders POS Terminal
          </h1>
          <p
            className="text-secondary"
            style={{ fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}
          >
            Kitchen State Progression & Real-Time Fulfillment
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setIsStockDrawerOpen(true)}
            className="btn-secondary btn-sm"
            style={{ minHeight: '44px', padding: '0.4rem 0.75rem' }}
          >
            📦 Menu Stock
          </button>

          {/* Audio Alert Toggle with persisted mute */}
          <AudioAlert muted={audioMuted} onToggle={handleToggleAudio} />

          <button
            onClick={simulateNewOrder}
            className="btn-primary btn-sm"
            style={{ minHeight: '44px', padding: '0.4rem 0.85rem' }}
          >
            + Simulate Order
          </button>
        </div>
      </div>

      {/* Payout & Kitchen Summary Metrics */}
      <div className="grid-cards mb-4">
        <div className="card" style={{ padding: '0.875rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#6B7280',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Active Kitchen Orders
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#111827',
              marginTop: '0.2rem',
            }}
          >
            {activeOrdersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
            Live in queue
          </div>
        </div>

        <div className="card" style={{ padding: '0.875rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#6B7280',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Net Settlement (90%)
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#059669',
              marginTop: '0.2rem',
            }}
          >
            {formatINR(totalSettlement)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#4B5563' }}>
            Canonical 10% commission applied
          </div>
        </div>

        <div className="card" style={{ padding: '0.875rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#6B7280',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Target Prep Window
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#111827',
              marginTop: '0.2rem',
            }}
          >
            10 - 20m
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
            ⚡ Hyperlocal fast handover
          </div>
        </div>
      </div>

      {/* Filter Tabs (Responsive horizontal bar) */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '9999px',
              border:
                activeTab === tab.key
                  ? '1.5px solid var(--color-brand-primary, #059669)'
                  : '1px solid #E5E7EB',
              backgroundColor:
                activeTab === tab.key
                  ? 'var(--color-brand-primary, #059669)'
                  : '#FFFFFF',
              color: activeTab === tab.key ? '#FFFFFF' : '#4B5563',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: '44px',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Orders Board: 3-column kanban on lg desktop, single column on mobile */}
      {loading ? (
        <div className="grid-cards">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="👨‍🍳"
          title="No Kitchen Orders Yet"
          description="Your kitchen terminal is live and ready. Click below to simulate an incoming customer order."
          actionText="+ Simulate Incoming Order"
          onAction={simulateNewOrder}
        />
      ) : activeTab === 'ALL' ? (
        <div className="status-columns-board">
          {/* Column 1: Placed */}
          <div>
            <div className="status-column-header badge-placed">
              <span>🔔 Placed / New Orders</span>
              <span>
                {orders.filter((o) => o.status === 'ORDER_PLACED').length}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {orders.filter((o) => o.status === 'ORDER_PLACED').length === 0 ? (
                <EmptyState
                  icon="🔔"
                  title="No New Placed Orders"
                  description="All incoming orders have been accepted."
                  actionText="+ Add Simulated Order"
                  onAction={simulateNewOrder}
                />
              ) : (
                orders
                  .filter((o) => o.status === 'ORDER_PLACED')
                  .map(renderOrderCard)
              )}
            </div>
          </div>

          {/* Column 2: Accepted & Preparing */}
          <div>
            <div className="status-column-header badge-preparing">
              <span>🍳 Cooking & Preparing</span>
              <span>
                {
                  orders.filter(
                    (o) =>
                      o.status === 'VENDOR_ACCEPTED' || o.status === 'PREPARING'
                  ).length
                }
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {orders.filter(
                (o) =>
                  o.status === 'VENDOR_ACCEPTED' || o.status === 'PREPARING'
              ).length === 0 ? (
                <EmptyState
                  icon="🍳"
                  title="No Active Cooking"
                  description="Accept incoming orders to move them to kitchen preparation."
                />
              ) : (
                orders
                  .filter(
                    (o) =>
                      o.status === 'VENDOR_ACCEPTED' || o.status === 'PREPARING'
                  )
                  .map(renderOrderCard)
              )}
            </div>
          </div>

          {/* Column 3: Ready for Pickup */}
          <div>
            <div className="status-column-header badge-ready">
              <span>🛵 Ready for Driver Handshake</span>
              <span>
                {
                  orders.filter((o) => o.status === 'READY_FOR_PICKUP').length
                }
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {orders.filter((o) => o.status === 'READY_FOR_PICKUP').length === 0 ? (
                <EmptyState
                  icon="🛵"
                  title="No Orders Awaiting Pickup"
                  description="Prepared orders ready for delivery rider pickup will appear here."
                />
              ) : (
                orders
                  .filter((o) => o.status === 'READY_FOR_PICKUP')
                  .map(renderOrderCard)
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Filtered single column view for activeTab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {orders.filter((o) => matchesFilter(o, activeTab)).length === 0 ? (
            <EmptyState
              icon="👨‍🍳"
              title={`No orders in ${
                filterTabs.find((t) => t.key === activeTab)?.label || activeTab
              }`}
              description="Click '+ Simulate Order' to test kitchen order arrival."
              actionText="+ Simulate Order"
              onAction={simulateNewOrder}
            />
          ) : (
            orders
              .filter((o) => matchesFilter(o, activeTab))
              .map(renderOrderCard)
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
          <div
            className="card"
            style={{ maxWidth: '400px', width: '100%', padding: '1.25rem' }}
          >
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem' }}>
              Accept Order & Set Prep Time
            </h3>
            <p
              style={{
                fontSize: '0.8rem',
                color: '#4B5563',
                margin: '0 0 1rem 0',
              }}
            >
              Order: <strong>{prepModalOrder.orderNumber}</strong> (
              {prepModalOrder.items?.[0]?.name})
            </p>

            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#374151',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
              }}
            >
              ⏱️ Kitchen Preparation Time:
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${PREP_TIME_OPTIONS.length}, 1fr)`,
                gap: '0.5rem',
                marginBottom: '1.25rem',
              }}
            >
              {PREP_TIME_OPTIONS.map((mins) => {
                const isSelected = selectedPrepTime === mins;
                return (
                  <button
                    key={mins}
                    onClick={() => setSelectedPrepTime(mins)}
                    style={{
                      padding: '0.6rem 0.25rem',
                      borderRadius: '0.5rem',
                      border: isSelected
                        ? '2px solid #059669'
                        : '1px solid #D1D5DB',
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

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setPrepModalOrder(null)}
                className="btn-secondary btn-sm"
                style={{ minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPrepModal}
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
        <div
          className="drawer-overlay"
          onClick={() => setIsStockDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="drawer-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #F3F4F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>
                  Menu Stock Manager
                </h2>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#059669',
                    fontWeight: 600,
                  }}
                >
                  Instant On/Off Stock Toggles
                </span>
              </div>
              <button
                onClick={() => setIsStockDrawerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                  minWidth: '44px',
                }}
                aria-label="Close stock manager"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
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
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: item.inStock ? '#111827' : '#9CA3AF',
                      }}
                    >
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
