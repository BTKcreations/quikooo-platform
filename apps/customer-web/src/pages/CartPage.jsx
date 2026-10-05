import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart, enqueueCartOfflineOutbox } from '../store/cart.js';
import { calculateOrder, createOrder } from '../api.js';
import { useToast } from '../components/Toast.jsx';

const ADDRESSES = [
  { id: 'addr-indiranagar-01', label: 'Home', address: 'Flat 302, Palm Grove, 100ft Rd, Indiranagar', city: 'Bengaluru' },
  { id: 'addr-koramangala-02', label: 'Work', address: 'Quikooo Tech Hub, 4th Block, Koramangala', city: 'Bengaluru' },
];

const SLOTS = [
  { id: 'instant', label: '⚡ Instant Delivery', time: '10–15 mins', tag: 'Fastest' },
  { id: 'evening', label: '🌆 Evening Slot', time: '7:00 PM – 8:00 PM', tag: 'Scheduled' },
  { id: 'morning', label: '🌅 Tomorrow Batch', time: '05:00 AM – 08:00 AM', tag: 'Rural' },
];

export default function CartPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const { showToast } = useToast();

  const [calculation, setCalculation] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(ADDRESSES[0].id);
  const [selectedSlot, setSelectedSlot] = useState(SLOTS[0].id);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  // Trigger server-authoritative calculation via POST /api/v1/orders/calculate
  useEffect(() => {
    async function fetchServerCalculation() {
      if (cart.items.length === 0) {
        setCalculation(null);
        return;
      }

      try {
        setCalculating(true);
        setError(null);
        const result = await calculateOrder({
          vendorId: cart.vendorId || 'vendor-sample-1',
          items: cart.items,
          addressId: selectedAddressId,
          zoneType: selectedSlot === 'morning' ? 'RURAL' : 'URBAN',
        });
        setCalculation(result);
      } catch (err) {
        console.warn('Backend calculate API unavailable or returned error, using local breakdown:', err.message);
        setCalculation(cart.breakdown);
      } finally {
        setCalculating(false);
      }
    }

    fetchServerCalculation();
  }, [cart.items, cart.vendorId, selectedAddressId, selectedSlot]);

  async function handlePlaceOrder() {
    try {
      setPlacingOrder(true);
      setError(null);

      const orderPayload = {
        vendorId: cart.vendorId || 'vendor-sample-1',
        items: cart.items.map((it) => ({
          productId: it.productId,
          name: it.name,
          originalPrice: it.originalPrice,
          quantity: it.quantity,
        })),
        addressId: selectedAddressId,
        paymentMethod,
        slotId: selectedSlot,
        zoneType: selectedSlot === 'morning' ? 'RURAL' : 'URBAN',
      };

      let placedOrder;
      try {
        placedOrder = await createOrder(orderPayload);
        cart.clearCart();
        showToast('🎉 Order placed successfully!', 'success');
        const orderId = placedOrder?.id || placedOrder?.orderNumber;
        navigate(`/orders?success=1&id=${orderId}`);
      } catch (apiErr) {
        // Enqueue to explicit OFFLINE-QUEUE outbox for automatic resync
        enqueueCartOfflineOutbox(orderPayload);
        cart.clearCart();
        showToast('📡 OFFLINE-QUEUE: Network offline. Order queued in offline outbox for automatic resync.', 'info');
        navigate('/orders?offline_queued=1');
      }
    } catch (err) {
      setError(err.message || 'Failed to place order');
      showToast(err.message || 'Failed to place order', 'error');
    } finally {
      setPlacingOrder(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛒</div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111827' }}>Your Cart is Empty</h2>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1.5rem', maxWidth: '340px', margin: '0 auto 1.5rem auto' }}>
          Explore nearby kitchens and stores within your 2.0 km geofence with 10-15m express delivery.
        </p>
        <Link to="/customer" className="btn-primary" style={{ minHeight: '44px', display: 'inline-flex', padding: '0.6rem 1.5rem' }}>
          Browse Local Stores
        </Link>
      </div>
    );
  }

  // Active calculation data
  const breakdown = calculation || cart.breakdown;
  const originalPrice = breakdown.originalPrice || 0;
  const menuAdjustmentAmount = breakdown.menuAdjustmentAmount || 0;
  const customerMenuPrice = breakdown.customerMenuPrice || breakdown.subtotal || 0;
  const platformFee = breakdown.platformFee !== undefined ? breakdown.platformFee : 5.0;
  const deliveryFee = breakdown.deliveryFee !== undefined ? breakdown.deliveryFee : 25.0;
  const customerPayable = breakdown.customerPayable || (customerMenuPrice + platformFee + deliveryFee);
  const vendorSettlement = breakdown.vendorSettlement || (originalPrice - (breakdown.commissionAmount || originalPrice * 0.1));
  const quikoooGrossRevenue = breakdown.quikoooGrossRevenue || (menuAdjustmentAmount + (breakdown.commissionAmount || originalPrice * 0.1));

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex-row-between" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Single-Screen Checkout</h1>
          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
            Store: {cart.vendorName || 'Partner Kitchen'}
          </span>
        </div>
        <button
          onClick={() => cart.clearCart()}
          style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, minHeight: '44px' }}
        >
          Clear Cart
        </button>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Responsive layout: 1 col on mobile, 2 cols on md/lg */}
      <div className="grid-cards" style={{ alignItems: 'flex-start' }}>
        {/* Left Column: Address + Slot + Items + Payment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 1. Address Selection */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              📍 1. Delivery Address (2.0 km Geofence)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ADDRESSES.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: isSelected ? '1.5px solid #059669' : '1px solid #E5E7EB',
                      backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                      textAlign: 'left',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#065F46' : '#111827' }}>
                        {addr.label}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: '#4B5563' }}>
                        {addr.address}
                      </div>
                    </div>
                    {isSelected && <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Delivery Slot Selection */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              ⏱️ 2. Delivery Window
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
              {SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: isSelected ? '1.5px solid #059669' : '1px solid #E5E7EB',
                      backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'center',
                      minHeight: '44px',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: isSelected ? '#065F46' : '#111827' }}>
                      {slot.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                      {slot.time}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Items in Cart */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              🧺 3. Order Items ({cart.itemCount})
            </div>
            {cart.items.map((item) => (
              <div
                key={item.productId}
                className="flex-row-between"
                style={{ padding: '0.5rem 0', borderBottom: '1px solid #F3F4F0' }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    ₹{((item.originalPrice || 100) * 1.05).toFixed(2)} each (Orig: ₹{(item.originalPrice || 100).toFixed(2)})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #059669',
                      borderRadius: '0.375rem',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}
                      style={{ background: 'none', border: 'none', padding: '0.2rem 0.5rem', cursor: 'pointer', color: '#059669', minHeight: '32px' }}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0 0.35rem' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
                      style={{ background: 'none', border: 'none', padding: '0.2rem 0.5rem', cursor: 'pointer', color: '#059669', minHeight: '32px' }}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div style={{ minWidth: '4rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem' }}>
                    ₹{((item.originalPrice || 100) * 1.05 * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 4. Payment Method */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              💳 4. Payment Method
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { id: 'UPI', label: 'UPI / GPay / PhonePe / Paytm', badge: 'Instant & Zero Fee' },
                { id: 'COD', label: 'Cash on Delivery (Pay upon delivery)', badge: 'Available' },
                { id: 'CARD', label: 'Credit / Debit Cards & Net Banking', badge: 'Secure' },
              ].map((p) => {
                const isSelected = paymentMethod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPaymentMethod(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: isSelected ? '1.5px solid #059669' : '1px solid #E5E7EB',
                      backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                      textAlign: 'left',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: isSelected ? '#065F46' : '#111827' }}>
                        {p.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: isSelected ? '#059669' : '#6B7280', fontWeight: 600 }}>
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Summary & Transparent Breakdown */}
        <div style={{ position: 'sticky', top: '4.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="flex-row-between" style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>
                Transparent Fee Breakdown
              </h3>
              {calculating && <span style={{ fontSize: '0.75rem', color: '#059669' }}>Updating...</span>}
            </div>

            <div className="flex-row-between" style={{ fontSize: '0.85rem', padding: '0.25rem 0', color: '#4B5563' }}>
              <span>Vendor Listed Price (Original)</span>
              <span>₹{originalPrice.toFixed(2)}</span>
            </div>

            <div className="flex-row-between" style={{ fontSize: '0.85rem', padding: '0.25rem 0', color: '#047857' }}>
              <span>Menu Adjustment (+5% Markup)</span>
              <span>+₹{menuAdjustmentAmount.toFixed(2)}</span>
            </div>

            <div className="flex-row-between" style={{ fontSize: '0.9rem', fontWeight: 600, padding: '0.35rem 0', borderTop: '1px dashed #E5E7EB', borderBottom: '1px dashed #E5E7EB', margin: '0.35rem 0' }}>
              <span>Customer Menu Price (Subtotal)</span>
              <span>₹{customerMenuPrice.toFixed(2)}</span>
            </div>

            <div className="flex-row-between" style={{ fontSize: '0.85rem', padding: '0.25rem 0', color: '#4B5563' }}>
              <span>Platform Fee</span>
              <span>+₹{platformFee.toFixed(2)}</span>
            </div>

            <div className="flex-row-between" style={{ fontSize: '0.85rem', padding: '0.25rem 0', color: '#4B5563' }}>
              <span>Delivery Logistics Fee (100% to Driver)</span>
              <span>+₹{deliveryFee.toFixed(2)}</span>
            </div>

            <div
              className="flex-row-between"
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#059669',
                paddingTop: '0.75rem',
                marginTop: '0.5rem',
                borderTop: '2px solid #059669',
                fontFamily: 'var(--font-family-display, Outfit)',
              }}
            >
              <span>Total Payable</span>
              <span>₹{customerPayable.toFixed(2)}</span>
            </div>

            {/* Transparent Economic Disclosure */}
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                color: '#065F46',
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>
                ⚡ Full Fee Disclosure:
              </div>
              ₹{customerMenuPrice.toFixed(2)} food + ₹{platformFee.toFixed(2)} platform + ₹{deliveryFee.toFixed(2)} delivery = <strong>₹{customerPayable.toFixed(2)}</strong>.
              <br />
              • Vendor Settlement (90%): <strong>₹{vendorSettlement.toFixed(2)}</strong>
              <br />
              • Quikooo Gross Margin: <strong>₹{quikoooGrossRevenue.toFixed(2)}</strong>
            </div>

            {/* Place Order CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={placingOrder}
              className="btn-primary btn-block"
              style={{
                minHeight: '48px',
                marginTop: '1.25rem',
                fontSize: '1rem',
                fontWeight: 700,
              }}
            >
              {placingOrder ? 'Confirming Order...' : `Pay ₹${customerPayable.toFixed(2)} • Place Order`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
