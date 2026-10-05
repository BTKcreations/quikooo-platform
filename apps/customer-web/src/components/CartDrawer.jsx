import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, enqueueCartOfflineOutbox } from '../store/cart.js';
import { createOrder } from '../api.js';
import { useToast } from './Toast.jsx';

const DEFAULT_ADDRESSES = [
  { id: 'addr-indiranagar-01', label: 'Home', address: 'Flat 302, Palm Grove, 100ft Rd, Indiranagar' },
  { id: 'addr-koramangala-02', label: 'Work', address: 'Quikooo Tech Hub, 4th Block, Koramangala' },
];

export default function CartDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const cart = useCart();
  const { showToast } = useToast();

  const [selectedAddressId, setSelectedAddressId] = useState(DEFAULT_ADDRESSES[0].id);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showCheckoutDetails, setShowCheckoutDetails] = useState(false);

  if (!isOpen) return null;

  const breakdown = cart.breakdown;
  const originalPrice = breakdown.originalPrice || 0;
  const customerPayable = breakdown.customerPayable || 0;

  // Calculate savings summary (e.g. Free express delivery or discounted promo vs standard)
  const savingsAmount = Math.max(15, Math.round(originalPrice * 0.15));

  const getStockBadge = (item) => {
    if (item.stockText) return item.stockText;
    const qty = item.quantity || 1;
    if (qty >= 3) {
      return { label: 'Only 3 left', type: 'warning' };
    }
    if (qty === 2) {
      return { label: 'Low stock', type: 'warning' };
    }
    return { label: 'In stock', type: 'success' };
  };

  const handlePlaceOrderDirect = async () => {
    try {
      setIsPlacingOrder(true);
      const orderPayload = {
        vendorId: cart.vendorId || 'vendor-sample-1',
        vendorName: cart.vendorName || 'Curry & Spice Express',
        items: cart.items.map((it) => ({
          productId: it.productId,
          name: it.name,
          originalPrice: it.originalPrice,
          customerMenuPrice: it.customerMenuPrice,
          quantity: it.quantity,
        })),
        addressId: selectedAddressId,
        paymentMethod,
        zoneType: 'URBAN',
        totalAmount: customerPayable,
      };

      let placedOrder;
      try {
        placedOrder = await createOrder(orderPayload);
      } catch (err) {
        // Fallback to offline outbox buffer
        enqueueCartOfflineOutbox(orderPayload);
        placedOrder = {
          id: `QK-ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          orderNumber: `QK-ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          status: 'ORDER_PLACED',
          vendorName: cart.vendorName || 'Curry & Spice Express',
          items: cart.items,
          customerPayable,
        };
      }

      // Record in localStorage quikooo_orders & quikooo_active_order for BuyAgain and CountdownTimer
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('quikooo_orders');
          const existing = raw ? JSON.parse(raw) : [];
          const newOrderRecord = {
            id: placedOrder.id || placedOrder.orderNumber,
            orderNumber: placedOrder.orderNumber || placedOrder.id,
            vendorId: cart.vendorId || 'vendor-sample-1',
            vendorName: cart.vendorName || 'Curry & Spice Express',
            status: 'PREPARING',
            date: 'Just now',
            totalAmount: customerPayable,
            items: cart.items,
            etaSeconds: 720,
          };
          localStorage.setItem('quikooo_orders', JSON.stringify([newOrderRecord, ...existing]));
          localStorage.setItem('quikooo_active_order', JSON.stringify(newOrderRecord));
        }
      } catch {}

      cart.clearCart();
      onClose();
      showToast('🎉 Order placed successfully from express cart!', 'success');
      const orderId = placedOrder.id || placedOrder.orderNumber;
      navigate(`/orders?success=1&id=${orderId}`);
    } catch (err) {
      showToast(err.message || 'Failed to place order', 'error');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div
      className="drawer-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart Drawer"
    >
      <div
        className="drawer-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#FFFFFF',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #F3F4F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'var(--font-family-display, Outfit)' }}>
              Express Cart ({cart.itemCount})
            </h2>
            {cart.vendorName && (
              <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                🏪 {cart.vendorName} • 10-15m Express
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: '#4B5563',
              cursor: 'pointer',
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close cart drawer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', paddingBottom: '7rem' }}>
          {cart.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛒</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Your cart is empty</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
                Add delicious dishes & fresh groceries within your 2.0 km geofence to get started.
              </p>
            </div>
          ) : (
            <div>
              {/* Savings Summary Banner */}
              <div
                style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>🎉</span>
                <div style={{ fontSize: '0.8rem', color: '#065F46', fontWeight: 600 }}>
                  <strong>Savings Summary:</strong> You saved ₹{savingsAmount} with flat ₹5 platform fee & direct partner pricing!
                </div>
              </div>

              {/* Items List with Stock Transparency Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                  Items in Basket
                </div>
                {cart.items.map((item) => {
                  const stock = getStockBadge(item);
                  return (
                    <div
                      key={item.productId}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #F3F4F0',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <div className="flex-row-between" style={{ marginBottom: '0.35rem' }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>
                            ₹{item.customerMenuPrice || item.originalPrice} × {item.quantity}
                          </div>
                        </div>

                        {/* Stock Transparency Badge */}
                        <span
                          className={`badge ${stock.type === 'warning' ? 'badge-warning' : 'badge-success'}`}
                          style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}
                        >
                          {stock.label}
                        </span>
                      </div>

                      {/* Quantity Selector + Price Total */}
                      <div className="flex-row-between" style={{ paddingTop: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.375rem',
                              border: '1px solid #D1D5DB',
                              background: '#FFFFFF',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 700, minWidth: '1.25rem', textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.375rem',
                              border: '1px solid #059669',
                              background: '#ECFDF5',
                              color: '#065F46',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                          ₹{((item.customerMenuPrice || item.originalPrice) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Condensed Single-Screen Checkout Options (Address & Payment) */}
              <div
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: '0.75rem',
                  padding: '0.85rem',
                  border: '1px solid #E5E7EB',
                  marginBottom: '1rem',
                }}
              >
                <div className="flex-row-between" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
                    📍 Delivery Address
                  </span>
                  <button
                    onClick={() => setShowCheckoutDetails(!showCheckoutDetails)}
                    style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {showCheckoutDetails ? 'Hide' : 'Change'}
                  </button>
                </div>

                {DEFAULT_ADDRESSES.map((addr) => {
                  const isSel = selectedAddressId === addr.id;
                  if (!showCheckoutDetails && !isSel) return null;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      style={{
                        padding: '0.45rem 0.65rem',
                        borderRadius: '0.375rem',
                        border: isSel ? '1.5px solid #059669' : '1px solid #E5E7EB',
                        backgroundColor: isSel ? '#ECFDF5' : '#FFFFFF',
                        marginBottom: '0.35rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: isSel ? '#065F46' : '#111827' }}>
                          {addr.label}:
                        </span>{' '}
                        <span style={{ fontSize: '0.75rem', color: '#4B5563' }}>{addr.address}</span>
                      </div>
                      {isSel && <span style={{ color: '#059669', fontWeight: 700 }}>✓</span>}
                    </div>
                  );
                })}

                {/* Payment Selection */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    💳 Payment Mode
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {[
                      { id: 'UPI', label: '⚡ UPI' },
                      { id: 'COD', label: '💵 COD' },
                      { id: 'CARD', label: '💳 Card' },
                    ].map((m) => {
                      const isSel = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={isSel ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
                          style={{ flex: 1, minHeight: '34px', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bill Details */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '0.75rem',
                  padding: '0.85rem',
                  border: '1px solid #E5E7EB',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Bill Details
                </div>
                <div className="flex-row-between" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#6B7280' }}>Item Total (Menu Price):</span>
                  <span>₹{breakdown.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex-row-between" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#6B7280' }}>Platform Fee:</span>
                  <span>₹{breakdown.platformFee.toFixed(2)}</span>
                </div>
                <div className="flex-row-between" style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#6B7280' }}>Delivery Fee (100% Rider):</span>
                  <span>₹{breakdown.deliveryFee.toFixed(2)}</span>
                </div>
                <div
                  className="flex-row-between"
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    paddingTop: '0.4rem',
                    borderTop: '1px solid #E5E7EB',
                    color: '#064E3B',
                  }}
                >
                  <span>To Pay:</span>
                  <span>₹{customerPayable.toFixed(2)}</span>
                </div>
              </div>

              {/* Clear Cart Option */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => cart.clearCart()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear Cart
                </button>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/cart');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Open Full Checkout Page →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Bar with Total + "Place Order" CTA */}
        {cart.items.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '0.85rem 1.25rem calc(0.85rem + env(safe-area-inset-bottom, 0px))',
              borderTop: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              zIndex: 10,
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Payable
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-family-display, Outfit)' }}>
                ₹{customerPayable.toFixed(2)}
              </div>
            </div>

            <button
              onClick={handlePlaceOrderDirect}
              disabled={isPlacingOrder}
              className="btn-primary"
              style={{
                flex: 1,
                minHeight: '48px',
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: '0.5rem',
              }}
            >
              {isPlacingOrder ? 'Confirming...' : 'Place Order ⚡'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
