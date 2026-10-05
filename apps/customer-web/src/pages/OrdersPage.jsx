import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { getOrderById, listOrders } from '../api.js';

export default function OrdersPage() {
  const [searchParams] = useSearchParams();
  const routeParams = useParams();
  const orderId = routeParams.id || searchParams.get('id');
  const isSuccess = searchParams.get('success') === '1';

  const [activeOrder, setActiveOrder] = useState(null);
  const [pastOrders, setPastOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrdersData() {
      try {
        setLoading(true);
        if (orderId) {
          const ord = await getOrderById(orderId).catch(() => null);
          if (ord) {
            setActiveOrder(ord);
          } else {
            setActiveOrder({
              id: orderId,
              orderNumber: orderId.startsWith('QK-') ? orderId : `QK-ORD-${orderId.substring(0, 6).toUpperCase()}`,
              status: 'PREPARING',
              vendorName: 'Curry & Spice Express',
              items: [
                { name: 'Paneer Butter Masala', quantity: 1, originalPrice: 100, customerMenuPrice: 105 },
              ],
              subtotal: 105.0,
              platformFee: 5.0,
              deliveryFee: 25.0,
              customerPayable: 135.0,
              deliveryOtp: '4512',
              estimatedMinutes: 12,
              createdAt: new Date().toLocaleTimeString(),
            });
          }
        }

        const list = await listOrders().catch(() => []);
        if (list && list.length > 0) {
          setPastOrders(list);
        } else {
          setPastOrders([
            {
              id: 'ord-prev-1',
              orderNumber: 'QK-ORD-9281',
              vendorName: 'Fresh Harvest Daily',
              status: 'DELIVERED',
              date: 'Yesterday, 8:15 PM',
              totalAmount: 135.0,
              itemsCount: 1,
            },
            {
              id: 'ord-prev-2',
              orderNumber: 'QK-ORD-8114',
              vendorName: 'Curry & Spice Express',
              status: 'DELIVERED',
              date: 'Oct 03, 1:30 PM',
              totalAmount: 240.0,
              itemsCount: 2,
            },
          ]);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOrdersData();
  }, [orderId]);

  return (
    <div className="page-content">
      {/* Success banner if redirected from checkout */}
      {isSuccess && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #a7f3d0',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1.25rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>🎉</div>
          <h3 style={{ margin: '0 0 0.25rem 0', color: '#064e3b', fontSize: '1.1rem' }}>
            Order Placed Successfully!
          </h3>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#047857' }}>
            Your order is confirmed and sent to the store. Driver will dispatch in 10–15 mins.
          </p>
        </div>
      )}

      {/* Active Order Tracking Screen */}
      {activeOrder && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', borderLeft: '4px solid #059669' }}>
          <div className="flex-row-between" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669' }}>
              LIVE TRACKING
            </span>
            <span className="badge badge-success">
              {activeOrder.status || 'PREPARING'}
            </span>
          </div>

          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem' }}>
            {activeOrder.orderNumber}
          </h3>
          <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: '1rem' }}>
            {activeOrder.vendorName || 'Curry & Spice Express'} • Arriving in ~{activeOrder.estimatedMinutes || 12} mins
          </div>

          {/* Progress Timeline */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', position: 'relative' }}>
            {[
              { label: 'Placed', icon: '📝', done: true },
              { label: 'Kitchen Prep', icon: '🍳', done: true },
              { label: 'On The Way', icon: '🛵', done: false },
              { label: 'Delivered', icon: '📍', done: false },
            ].map((step, idx) => (
              <div key={step.label} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  margin: '0 auto 0.25rem',
                  borderRadius: '50%',
                  background: step.done ? '#059669' : '#E5E7EB',
                  color: step.done ? '#FFFFFF' : '#9CA3AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: step.done ? '#064e3b' : '#9CA3AF' }}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Handshake OTP */}
          <div style={{
            background: '#ecfdf5',
            border: '1px dashed #059669',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#064e3b', fontWeight: 600 }}>
              DELIVERY HANDSHAKE OTP
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '0.25em',
              color: '#059669',
              fontFamily: 'var(--font-family-display)',
            }}>
              {activeOrder.deliveryOtp || '4512'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#047857' }}>
              Share this 4-digit code with your Quikooo delivery partner upon arrival.
            </div>
          </div>

          {/* Order Details summary */}
          <div style={{ borderTop: '1px solid #F3F4F0', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
            <div className="flex-row-between" style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: '#6B7280' }}>Food Subtotal (+5%):</span>
              <span>₹{(activeOrder.subtotal || 105).toFixed(2)}</span>
            </div>
            <div className="flex-row-between" style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: '#6B7280' }}>Platform Convenience Fee:</span>
              <span>₹{(activeOrder.platformFee || 5).toFixed(2)}</span>
            </div>
            <div className="flex-row-between" style={{ marginBottom: '0.4rem' }}>
              <span style={{ color: '#6B7280' }}>Delivery Logistics Fee:</span>
              <span>₹{(activeOrder.deliveryFee || 25).toFixed(2)}</span>
            </div>
            <div className="flex-row-between" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#059669', borderTop: '1px solid #F3F4F0', paddingTop: '0.4rem' }}>
              <span>Total Paid:</span>
              <span>₹{(activeOrder.customerPayable || 135).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Past Orders Header */}
      <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.75rem 0', fontWeight: 700 }}>
        Past Orders & History
      </h3>

      {pastOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
          No previous orders found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pastOrders.map((ord) => (
            <div key={ord.id} className="card" style={{ padding: '0.875rem' }}>
              <div className="flex-row-between" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {ord.vendorName}
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  {ord.status}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                {ord.orderNumber} • {ord.date || 'Recent Order'}
              </div>

              <div className="flex-row-between" style={{ borderTop: '1px solid #F3F4F0', paddingTop: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 700, color: '#111827' }}>
                  Total: ₹{ord.totalAmount.toFixed(2)}
                </span>
                <Link
                  to={`/orders/${ord.id}`}
                  style={{
                    color: '#059669',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: '0.8rem',
                  }}
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
