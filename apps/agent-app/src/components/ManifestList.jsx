import React, { useState, useMemo } from 'react';
import { formatINR } from '../api.js';
import EmptyState from './EmptyState.jsx';
import Skeleton from './Skeleton.jsx';

/**
 * ManifestList Component
 * Grouped orders by area/village with virtualized first-50 pagination + "Load More"
 */
export default function ManifestList({
  orders = [],
  loading = false,
  pageSize = 50,
  onDispatchOrder,
  onDispatchAll,
  dispatching = false,
}) {
  const [visibleLimit, setVisibleLimit] = useState(pageSize);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | SCHEDULED | READY
  const [collapsedAreas, setCollapsedAreas] = useState({});

  // Filter orders by search query and status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterStatus === 'SCHEDULED' && order.status !== 'SCHEDULED_FOR_NEXT_DAY') {
        return false;
      }
      if (filterStatus === 'READY' && order.status !== 'READY_FOR_MORNING_DISPATCH') {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchNum = (order.orderNumber || '').toLowerCase().includes(q);
      const matchCust = (order.customerName || '').toLowerCase().includes(q);
      const matchVillage = (order.village || '').toLowerCase().includes(q);
      const matchItem = (order.items || []).some((it) =>
        (it.name || '').toLowerCase().includes(q) || (it.vendor || '').toLowerCase().includes(q)
      );

      return matchNum || matchCust || matchVillage || matchItem;
    });
  }, [orders, searchQuery, filterStatus]);

  // Virtualized slice (first 50 + load more)
  const visibleOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleLimit);
  }, [filteredOrders, visibleLimit]);

  // Group visible orders by area / village
  const groupedOrders = useMemo(() => {
    const groups = {};
    visibleOrders.forEach((order) => {
      const area = order.village || order.area || 'Central Mandya Zone';
      if (!groups[area]) {
        groups[area] = {
          areaName: area,
          orders: [],
          totalValue: 0,
          scheduledCount: 0,
          readyCount: 0,
        };
      }
      groups[area].orders.push(order);
      groups[area].totalValue += (order.customerPayable || 0);
      if (order.status === 'SCHEDULED_FOR_NEXT_DAY') {
        groups[area].scheduledCount += 1;
      } else {
        groups[area].readyCount += 1;
      }
    });
    return Object.values(groups);
  }, [visibleOrders]);

  const toggleArea = (areaName) => {
    setCollapsedAreas((prev) => ({
      ...prev,
      [areaName]: !prev[areaName],
    }));
  };

  const handleLoadMore = () => {
    setVisibleLimit((prev) => prev + pageSize);
  };

  if (loading) {
    return (
      <div className="table-card" style={{ padding: '1.5rem' }}>
        <Skeleton width="40%" height="28px" style={{ marginBottom: '1rem' }} />
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Skeleton width="120px" height="36px" borderRadius="9999px" />
          <Skeleton width="120px" height="36px" borderRadius="9999px" />
          <Skeleton width="120px" height="36px" borderRadius="9999px" />
        </div>
        <Skeleton height="70px" borderRadius="0.5rem" style={{ marginBottom: '0.75rem' }} />
        <Skeleton height="70px" borderRadius="0.5rem" style={{ marginBottom: '0.75rem' }} />
        <Skeleton height="70px" borderRadius="0.5rem" style={{ marginBottom: '0.75rem' }} />
        <Skeleton height="70px" borderRadius="0.5rem" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="No Rural Scheduled Orders"
        description="No aggregated morning batch orders found for this delivery date. New orders accepted before 21:00 cutoff will automatically appear here."
      />
    );
  }

  const scheduledTotal = filteredOrders.filter((o) => o.status === 'SCHEDULED_FOR_NEXT_DAY').length;

  return (
    <div className="manifest-container">
      {/* Controls Bar: Search, Status Filter & Stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#FFFFFF',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: '1px solid #E5E7EB',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 240px', maxWidth: '400px', position: 'relative' }}>
          <input
            type="search"
            placeholder="Search village, customer, order # or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.25rem', height: '40px', minHeight: '40px' }}
            aria-label="Search batch orders"
          />
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterStatus('ALL')}
            style={{
              minHeight: '36px',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: filterStatus === 'ALL' ? '#059669' : '#F3F4F6',
              color: filterStatus === 'ALL' ? '#FFFFFF' : '#374151',
              transition: 'all 0.15s ease',
            }}
          >
            All ({orders.length})
          </button>

          <button
            onClick={() => setFilterStatus('SCHEDULED')}
            style={{
              minHeight: '36px',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: filterStatus === 'SCHEDULED' ? '#D97706' : '#FEF3C7',
              color: filterStatus === 'SCHEDULED' ? '#FFFFFF' : '#92400E',
              transition: 'all 0.15s ease',
            }}
          >
            Scheduled ({orders.filter((o) => o.status === 'SCHEDULED_FOR_NEXT_DAY').length})
          </button>

          <button
            onClick={() => setFilterStatus('READY')}
            style={{
              minHeight: '36px',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: filterStatus === 'READY' ? '#059669' : '#D1FAE5',
              color: filterStatus === 'READY' ? '#FFFFFF' : '#065F46',
              transition: 'all 0.15s ease',
            }}
          >
            Ready for Dispatch ({orders.filter((o) => o.status === 'READY_FOR_MORNING_DISPATCH').length})
          </button>
        </div>

        {/* Count summary */}
        <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>
          Showing <strong>{Math.min(visibleOrders.length, filteredOrders.length)}</strong> of{' '}
          <strong>{filteredOrders.length}</strong> orders
        </div>
      </div>

      {/* Grouped Orders List */}
      {groupedOrders.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No Matching Orders"
          description={`No orders match your filter criteria "${searchQuery}".`}
          actionText="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setFilterStatus('ALL');
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {groupedOrders.map((group) => {
            const isCollapsed = Boolean(collapsedAreas[group.areaName]);
            return (
              <div
                key={group.areaName}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '0.875rem',
                  border: '1px solid #E5E7EB',
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                }}
              >
                {/* Area Header */}
                <div
                  onClick={() => toggleArea(group.areaName)}
                  style={{
                    backgroundColor: '#F9FAFB',
                    padding: '0.85rem 1.25rem',
                    borderBottom: isCollapsed ? 'none' : '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={!isCollapsed}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      toggleArea(group.areaName);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#111827', fontFamily: 'Outfit, sans-serif' }}>
                        {group.areaName}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {group.orders.length} orders in this delivery cluster
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {formatINR(group.totalValue)}
                    </span>

                    {group.scheduledCount > 0 && (
                      <span
                        style={{
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                        }}
                      >
                        {group.scheduledCount} Scheduled
                      </span>
                    )}

                    <span style={{ fontSize: '0.9rem', color: '#6B7280', transition: 'transform 0.15s ease' }}>
                      {isCollapsed ? '▼' : '▲'}
                    </span>
                  </div>
                </div>

                {/* Orders List inside Area */}
                {!isCollapsed && (
                  <div className="area-orders-container">
                    {group.orders.map((order) => {
                      const isReady = order.status === 'READY_FOR_MORNING_DISPATCH';
                      return (
                        <div
                          key={order.id}
                          style={{
                            padding: '1rem 1.25rem',
                            borderBottom: '1px solid #F3F4F6',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            backgroundColor: isReady ? '#FAFCFB' : '#FFFFFF',
                          }}
                        >
                          {/* Order Metadata */}
                          <div style={{ flex: '1 1 260px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.92rem' }}>
                                {order.orderNumber}
                              </span>
                              <span
                                className={`status-pill ${
                                  isReady ? 'status-approved' : 'status-pending'
                                }`}
                                style={{ fontSize: '0.7rem' }}
                              >
                                {isReady ? '🟢 READY FOR 05:00-08:00' : '⏱️ SCHEDULED'}
                              </span>
                            </div>

                            <div style={{ marginTop: '0.35rem', fontWeight: 600, color: '#1F2937', fontSize: '0.9rem' }}>
                              {order.customerName}
                            </div>

                            {/* Items list */}
                            <ul
                              style={{
                                margin: '0.4rem 0 0 0',
                                paddingLeft: '1.1rem',
                                fontSize: '0.8rem',
                                color: '#4B5563',
                                lineHeight: 1.4,
                              }}
                            >
                              {(order.items || []).map((item, idx) => (
                                <li key={idx}>
                                  <strong>{item.qty}x</strong> {item.name}{' '}
                                  <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 600 }}>
                                    ({item.vendor})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Economics & Window */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', fontFamily: 'Outfit' }}>
                              {formatINR(order.customerPayable)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                              Original: {formatINR(order.originalTotal)}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#059669',
                                backgroundColor: '#ECFDF5',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                marginTop: '0.25rem',
                              }}
                            >
                              🕒 {order.window || '05:00 - 08:00'}
                            </div>

                            {/* One-tap order dispatch button if individual dispatch supported */}
                            {!isReady && onDispatchOrder && (
                              <button
                                onClick={() => onDispatchOrder(order.id)}
                                style={{
                                  marginTop: '0.4rem',
                                  padding: '0.3rem 0.75rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: '#10B981',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Mark Ready
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Virtualization: Load More Orders CTA */}
      {visibleLimit < filteredOrders.length && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '1rem' }}>
          <button
            onClick={handleLoadMore}
            className="btn-secondary"
            style={{
              padding: '0.75rem 2rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
            }}
          >
            Load Next 50 Orders ({filteredOrders.length - visibleLimit} remaining)
          </button>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.5rem' }}>
            Loaded {visibleLimit} of {filteredOrders.length} orders
          </div>
        </div>
      )}
    </div>
  );
}
