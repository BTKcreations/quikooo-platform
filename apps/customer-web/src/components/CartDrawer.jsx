import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../store/cart.js';

export default function CartDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const cart = useCart();
  const breakdown = cart.breakdown;

  if (!isOpen) return null;

  const handleCheckout = () => {
    onClose();
    navigate('/cart');
  };

  return (
    <div className="drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Shopping Cart Drawer">
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #F3F4F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'var(--font-family-display, Outfit)' }}>
              Your Cart ({cart.itemCount})
            </h2>
            {cart.vendorName && (
              <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                🏪 {cart.vendorName}
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

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
          {cart.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛒</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Your cart is empty</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
                Add items from nearby kitchens and stores to get started.
              </p>
            </div>
          ) : (
            <div>
              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {cart.items.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #F3F4F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>
                        ₹{item.customerMenuPrice || item.originalPrice} × {item.quantity}
                      </div>
                    </div>

                    {/* Quantity Selector */}
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
                  </div>
                ))}
              </div>

              {/* Bill Details & Transparent Breakdown */}
              <div
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  border: '1px solid #E5E7EB',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                  Bill Summary
                </div>

                <div className="flex-row-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span className="text-secondary">Item Total (Menu Price):</span>
                  <span>₹{breakdown.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex-row-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span className="text-secondary">Platform Fee:</span>
                  <span>₹{breakdown.platformFee.toFixed(2)}</span>
                </div>

                <div className="flex-row-between" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span className="text-secondary">Delivery Fee (100% Rider):</span>
                  <span>₹{breakdown.deliveryFee.toFixed(2)}</span>
                </div>

                <div
                  className="flex-row-between"
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #E5E7EB',
                    color: '#064E3B',
                  }}
                >
                  <span>To Pay:</span>
                  <span>₹{breakdown.customerPayable.toFixed(2)}</span>
                </div>

                {/* 2026 Transparent Disclosure Banner */}
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.65rem',
                    backgroundColor: '#ECFDF5',
                    borderRadius: '0.5rem',
                    fontSize: '0.72rem',
                    color: '#047857',
                    lineHeight: 1.4,
                  }}
                >
                  ⚡ <strong>Transparent Pricing:</strong> ₹{breakdown.subtotal} menu + ₹{breakdown.platformFee} platform + ₹{breakdown.deliveryFee} delivery = ₹{breakdown.customerPayable}. Vendor settlement: ₹{breakdown.vendorSettlement.toFixed(2)}, Platform margin: ₹{breakdown.quikoooGrossRevenue.toFixed(2)}.
                </div>
              </div>

              {/* Clear Cart Option */}
              <button
                onClick={() => cart.clearCart()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EF4444',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.25rem 0',
                }}
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>

        {/* Footer Checkout Action */}
        {cart.items.length > 0 && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #F3F4F0', backgroundColor: '#FFFFFF' }}>
            <button
              onClick={handleCheckout}
              className="btn-primary btn-block"
              style={{ minHeight: '48px', fontSize: '1rem', fontWeight: 700 }}
            >
              <span>Proceed to Checkout</span>
              <span style={{ margin: '0 0.5rem' }}>•</span>
              <span>₹{breakdown.customerPayable.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
