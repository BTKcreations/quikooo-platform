import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../store/cart.js';
import { useToast } from './Toast.jsx';

/**
 * Normalizes an order record into a cart-ready reorder payload.
 * Exported for testing and reuse across Orders and Cart pages.
 */
export function buildReorderPayload(order) {
  if (!order || typeof order !== 'object') {
    return { vendorId: null, vendorName: null, vendor: null, items: [], itemCount: 0, totalAmount: 0 };
  }

  const vendorId = order.vendorId || order.vendor?.id || 'vendor-sample-1';
  const vendorName = order.vendorName || order.vendor?.name || 'Local Kitchen';

  const rawItems = Array.isArray(order.items) ? order.items : [];
  const items = rawItems.map((item) => {
    const originalPrice = Number(item.originalPrice || item.price || 100);
    const customerMenuPrice = Number(
      item.customerMenuPrice || Math.round(originalPrice * 1.05 * 100) / 100
    );
    return {
      productId: item.productId || item.id || `prod-${Math.random().toString(36).substr(2, 6)}`,
      name: item.name || 'Menu Item',
      originalPrice,
      customerMenuPrice,
      quantity: Number(item.quantity || 1),
      vendorId: item.vendorId || vendorId,
      image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&q=80',
    };
  });

  const totalAmount = Number(
    order.totalAmount ||
      items.reduce((sum, it) => sum + it.customerMenuPrice * it.quantity, 0)
  );

  return {
    vendorId,
    vendorName,
    vendor: { id: vendorId, name: vendorName },
    items,
    itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
    totalAmount,
  };
}

const DEFAULT_BUY_AGAIN_ORDERS = [
  {
    id: 'ord-hist-1',
    vendorId: 'vendor-sample-1',
    vendorName: 'Curry & Spice Express',
    date: 'Yesterday, 8:15 PM',
    totalAmount: 135.0,
    items: [
      {
        productId: 'prod-101',
        name: 'Paneer Butter Masala',
        quantity: 1,
        originalPrice: 100,
        customerMenuPrice: 105,
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=150&q=80',
      },
    ],
  },
  {
    id: 'ord-hist-2',
    vendorId: 'vendor-sample-2',
    vendorName: 'Fresh Harvest Daily',
    date: 'Oct 03, 1:30 PM',
    totalAmount: 210.0,
    items: [
      {
        productId: 'prod-102',
        name: 'Special Chicken Biryani',
        quantity: 1,
        originalPrice: 200,
        customerMenuPrice: 210,
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=150&q=80',
      },
    ],
  },
  {
    id: 'ord-hist-3',
    vendorId: 'vendor-sample-1',
    vendorName: 'Curry & Spice Express',
    date: 'Sep 29, 7:00 PM',
    totalAmount: 147.0,
    items: [
      {
        productId: 'prod-103',
        name: 'Garlic Butter Naan',
        quantity: 2,
        originalPrice: 40,
        customerMenuPrice: 42,
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=150&q=80',
      },
      {
        productId: 'prod-104',
        name: 'Gulab Jamun (2 Pcs)',
        quantity: 1,
        originalPrice: 60,
        customerMenuPrice: 63,
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=150&q=80',
      },
    ],
  },
];

export default function BuyAgain() {
  const navigate = useNavigate();
  const cart = useCart();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('quikooo_orders');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOrders(parsed);
            return;
          }
        }
      }
    } catch {
      // ignore JSON parse error
    }
    setOrders(DEFAULT_BUY_AGAIN_ORDERS);
  }, []);

  const handleAddAllToCart = (order) => {
    const payload = buildReorderPayload(order);
    try {
      for (const item of payload.items) {
        cart.addItem(item, payload.vendor);
      }
      showToast(`Added ${payload.itemCount} items from ${payload.vendorName} to cart!`, 'success');
    } catch (err) {
      showToast(err.message || 'Could not add to cart', 'error');
    }
  };

  const handleOneTapReorder = (order) => {
    const payload = buildReorderPayload(order);
    try {
      cart.reorder(payload.items, payload.vendor);
      showToast(`⚡ Reordering ${payload.vendorName}... cart updated!`, 'success');
      navigate('/cart');
    } catch (err) {
      showToast(err.message || 'Could not reorder', 'error');
    }
  };

  const handleAddSingleItem = (item, order) => {
    const vendor = { id: order.vendorId, name: order.vendorName };
    try {
      cart.addItem(item, vendor);
      showToast(`Added ${item.name} to cart!`, 'success');
    } catch (err) {
      showToast(err.message || 'Could not add item', 'error');
    }
  };

  if (!orders || orders.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Buy Again - Previous Orders Carousel"
      style={{ marginBottom: '1.5rem' }}
    >
      <div className="flex-row-between" style={{ marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '1.1rem' }}>⚡</span>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#111827' }}>
            Buy Again
          </h3>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              padding: '0.15rem 0.45rem',
              borderRadius: '9999px',
            }}
          >
            1-Tap Reorder
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Based on order history</span>
      </div>

      {/* Horizontal Carousel */}
      <div
        style={{
          display: 'flex',
          gap: '0.85rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {orders.map((ord) => {
          const payload = buildReorderPayload(ord);
          const firstItem = payload.items[0];

          return (
            <div
              key={ord.id || ord.orderNumber}
              className="card"
              style={{
                minWidth: '260px',
                maxWidth: '280px',
                flexShrink: 0,
                scrollSnapAlign: 'start',
                padding: '0.875rem',
                borderLeft: '4px solid #059669',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div className="flex-row-between" style={{ marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {payload.vendorName}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                    {ord.date || 'Recent'}
                  </span>
                </div>

                {/* Items Summary preview */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  {firstItem && (
                    <img
                      src={firstItem.image}
                      alt={firstItem.name}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '0.375rem',
                        objectFit: 'cover',
                        backgroundColor: '#E5E7EB',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#374151',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {payload.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                      ₹{payload.totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: One-tap add-all + One-tap reorder */}
              <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #F3F4F0', paddingTop: '0.6rem' }}>
                <button
                  onClick={() => handleAddAllToCart(ord)}
                  className="btn-secondary btn-sm"
                  style={{
                    flex: 1,
                    minHeight: '36px',
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.5rem',
                    whiteSpace: 'nowrap',
                  }}
                  title="Add all items from this order to current cart"
                >
                  + Add to Cart
                </button>
                <button
                  onClick={() => handleOneTapReorder(ord)}
                  className="btn-primary btn-sm"
                  style={{
                    flex: 1,
                    minHeight: '36px',
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.5rem',
                    whiteSpace: 'nowrap',
                  }}
                  title="Reorder this order directly"
                >
                  ⚡ Reorder
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
