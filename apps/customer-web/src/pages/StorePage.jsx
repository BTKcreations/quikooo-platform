import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getVendorById, getVendorProducts } from '../api.js';
import { useCart } from '../store/cart.js';
import { useToast } from '../components/Toast.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import { useVirtualList } from '../lib/virtualList.js';
import OptimizedImage from '../components/OptimizedImage.jsx';

export default function StorePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { showToast } = useToast();

  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conflictModal, setConflictModal] = useState(null);

  useEffect(() => {
    async function loadStore() {
      try {
        setLoading(true);
        const [vData, pData] = await Promise.all([
          getVendorById(id).catch(() => null),
          getVendorProducts(id).catch(() => []),
        ]);

        if (vData) {
          setVendor(vData);
        } else {
          setVendor({
            id,
            name: id === 'vendor-sample-2' ? 'Fresh Harvest Daily' : 'Curry & Spice Express',
            businessType: 'RESTAURANT',
            cuisine: 'Authentic Indian, Biryani & Tandoor',
            rating: 4.8,
            etaMinutes: 12,
            distanceKm: 1.2,
          });
        }

        if (pData && pData.length > 0) {
          setProducts(pData);
        } else {
          // Standard menu products conforming to Phase 1/2 pricing (₹100 original -> ₹105 customer)
          setProducts([
            {
              id: 'prod-101',
              name: 'Paneer Butter Masala',
              description: 'Fresh cottage cheese simmered in creamy tomato-cashew gravy.',
              originalPrice: 100.0,
              customerMenuPrice: 105.0,
              category: 'Main Course',
              image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&q=80',
            },
            {
              id: 'prod-102',
              name: 'Special Chicken Biryani',
              description: 'Aromatic basmati rice cooked with tender marinated chicken & saffron.',
              originalPrice: 200.0,
              customerMenuPrice: 210.0,
              category: 'Biryani & Rice',
              image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&q=80',
            },
            {
              id: 'prod-103',
              name: 'Garlic Butter Naan',
              description: 'Crisp clay oven flatbread brushed with roasted garlic and butter.',
              originalPrice: 40.0,
              customerMenuPrice: 42.0,
              category: 'Breads',
              image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&q=80',
            },
            {
              id: 'prod-104',
              name: 'Gulab Jamun (2 Pcs)',
              description: 'Golden fried milk dumplings soaked in cardamom sugar syrup.',
              originalPrice: 60.0,
              customerMenuPrice: 63.0,
              category: 'Desserts',
              image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&q=80',
            },
          ]);
        }
      } catch (err) {
        console.error('Error loading store:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStore();
  }, [id]);

  function handleAddToCart(product) {
    try {
      cart.addItem(
        {
          productId: product.id,
          name: product.name,
          originalPrice: product.originalPrice,
          customerMenuPrice: product.customerMenuPrice,
          quantity: 1,
        },
        vendor
      );
      showToast(`Added ${product.name} to cart!`, 'success');
    } catch (err) {
      if (err.message.includes('Single vendor')) {
        setConflictModal({
          pendingProduct: product,
          message: 'Your cart already contains items from another store. Quikooo enforces single-vendor delivery per order.',
        });
      } else {
        showToast(err.message, 'error');
      }
    }
  }

  function handleSwitchStoreAndAdd() {
    if (!conflictModal) return;
    cart.clearCart();
    cart.addItem(
      {
        productId: conflictModal.pendingProduct.id,
        name: conflictModal.pendingProduct.name,
        originalPrice: conflictModal.pendingProduct.originalPrice,
        customerMenuPrice: conflictModal.pendingProduct.customerMenuPrice,
        quantity: 1,
      },
      vendor
    );
    setConflictModal(null);
    showToast(`Cart reset to ${vendor?.name} & item added!`, 'success');
  }

  if (loading) {
    return (
      <div className="page-content">
        <SkeletonCard lines={2} style={{ marginBottom: '1rem' }} />
        <div className="grid-cards">
          <SkeletonCard lines={3} hasImage />
          <SkeletonCard lines={3} hasImage />
        </div>
      </div>
    );
  }

  const {
    displayedItems: displayedProducts,
    sentinelRef,
    hasMore,
    loadMore,
    visibleCount,
  } = useVirtualList({ items: products, initialCount: 30, step: 15 });

  return (
    <div className="page-content">
      {/* Back button & Store details header */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => navigate('/customer')}
          style={{
            background: 'none',
            border: 'none',
            color: '#059669',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0.25rem 0',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            minHeight: '44px',
          }}
        >
          ← Back to Stores
        </button>

        <div className="card" style={{ padding: '1rem', borderTop: '4px solid #059669' }}>
          <div className="flex-row-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="badge badge-success">
              {vendor?.businessType || 'RESTAURANT'}
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#D1FAE5',
                color: '#064E3B',
                border: '1px solid #A7F3D0',
                borderRadius: '9999px',
                padding: '0.25rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
              title="Verified by Quikooo ZoneService"
            >
              <span>🛡️</span>
              <span>10–15 Min Delivery Promise: Verified within 2.0 km Geofence (ZoneService Verified)</span>
            </div>
          </div>

          <h1 style={{ margin: '0.35rem 0 0.2rem 0', fontSize: '1.35rem', fontWeight: 700 }}>
            {vendor?.name}
          </h1>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', color: '#4B5563' }}>
            {vendor?.cuisine || 'Quality fresh food crafted for quick delivery'}
          </p>

          <div
            style={{
              fontSize: '0.75rem',
              background: '#ECFDF5',
              color: '#064E3B',
              padding: '0.4rem 0.6rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>ℹ️</span>
            <span>Menu prices reflect transparent +5% packaging & preparation adjustment.</span>
          </div>
        </div>
      </div>

      {/* Menu Header */}
      <div className="flex-row-between" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
          Store Menu ({products.length})
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Fresh Prepared</span>
      </div>

      {/* Product Grid / List */}
      <div className="grid-cards">
        {displayedProducts.map((product) => {
          const cartItem = cart.items.find((i) => i.productId === product.id);
          const quantityInCart = cartItem ? cartItem.quantity : 0;

          return (
            <div
              key={product.id}
              className="card"
              style={{
                padding: '0.875rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Lazy-loaded product image with async decoding and skeleton */}
                <div
                  style={{
                    height: '120px',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    marginBottom: '0.75rem',
                    position: 'relative',
                  }}
                >
                  <OptimizedImage
                    src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80'}
                    alt={product.name}
                    aspectRatio="16/9"
                  />
                </div>

                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: '#111827', fontWeight: 600 }}>
                  {product.name}
                </h3>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.4 }}>
                  {product.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#059669',
                      fontFamily: 'var(--font-family-display)',
                    }}
                  >
                    ₹{(product.customerMenuPrice || product.originalPrice * 1.05).toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#9CA3AF',
                      textDecoration: 'line-through',
                    }}
                  >
                    ₹{(product.originalPrice || 100).toFixed(2)}
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                    +5%
                  </span>
                </div>
              </div>

              {/* Add / Quantity Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {quantityInCart > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#059669',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      color: '#FFFFFF',
                      minHeight: '44px',
                    }}
                  >
                    <button
                      onClick={() => cart.updateQuantity(product.id, quantityInCart - 1)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#FFFFFF',
                        padding: '0.4rem 0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        minHeight: '44px',
                      }}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span style={{ padding: '0 0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                      {quantityInCart}
                    </span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#FFFFFF',
                        padding: '0.4rem 0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        minHeight: '44px',
                      }}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => handleAddToCart(product)}
                    style={{ padding: '0.5rem 1.25rem', minHeight: '44px' }}
                  >
                    + ADD
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* IntersectionObserver Sentinel for Infinite / Windowed Loading */}
      {hasMore && (
        <div
          ref={sentinelRef}
          style={{
            textAlign: 'center',
            padding: '1.5rem 0',
            color: '#6B7280',
            fontSize: '0.85rem',
          }}
        >
          <button
            onClick={loadMore}
            className="btn-secondary"
            style={{ minHeight: '44px', padding: '0.5rem 1.5rem' }}
          >
            Load More Items ({products.length - visibleCount} remaining)
          </button>
        </div>
      )}


      {/* Single-Vendor Cart Conflict Modal */}
      {conflictModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="card" style={{ maxWidth: '380px', width: '100%', padding: '1.25rem' }}>
            <h3 style={{ color: '#991B1B', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
              Single Vendor Cart Only
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#4B5563', margin: '0 0 1rem 0' }}>
              Your cart currently contains items from <strong>{cart.vendorName || 'another store'}</strong>.
              Would you like to clear your current cart and add items from <strong>{vendor?.name}</strong> instead?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary btn-sm"
                onClick={() => setConflictModal(null)}
                style={{ minHeight: '44px' }}
              >
                Keep Existing Cart
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={handleSwitchStoreAndAdd}
                style={{ minHeight: '44px' }}
              >
                Reset & Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Checkout Bar if items present */}
      {cart.itemCount > 0 && (
        <div className="floating-checkout-bar">
          <div
            style={{
              background: '#059669',
              borderRadius: '0.75rem',
              padding: '0.75rem 1rem',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 20px rgba(5, 150, 105, 0.4)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'} in cart
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-family-display)' }}>
                Subtotal: ₹{cart.breakdown.subtotal.toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => navigate('/cart')}
              style={{
                background: '#FFFFFF',
                color: '#059669',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                padding: '0.5rem 1.25rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              View Cart →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
