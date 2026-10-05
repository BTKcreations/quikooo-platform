import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getVendorById, getVendorProducts } from '../api.js';
import { useCart } from '../store/cart.js';

export default function StorePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();

  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conflictModal, setConflictModal] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

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
            },
            {
              id: 'prod-102',
              name: 'Special Chicken Biryani',
              description: 'Aromatic basmati rice cooked with tender marinated chicken & saffron.',
              originalPrice: 200.0,
              customerMenuPrice: 210.0,
              category: 'Biryani & Rice',
            },
            {
              id: 'prod-103',
              name: 'Garlic Butter Naan',
              description: 'Crisp clay oven flatbread brushed with roasted garlic and butter.',
              originalPrice: 40.0,
              customerMenuPrice: 42.0,
              category: 'Breads',
            },
            {
              id: 'prod-104',
              name: 'Gulab Jamun (2 Pcs)',
              description: 'Golden fried milk dumplings soaked in cardamom sugar syrup.',
              originalPrice: 60.0,
              customerMenuPrice: 63.0,
              category: 'Desserts',
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
      setFeedbackMsg(`Added ${product.name} to cart`);
      setTimeout(() => setFeedbackMsg(''), 2000);
    } catch (err) {
      if (err.message.includes('Single vendor')) {
        setConflictModal({
          pendingProduct: product,
          message: 'Your cart already contains items from another store. Quikooo enforces single-vendor delivery per order.',
        });
      } else {
        alert(err.message);
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
    setFeedbackMsg(`Cart reset and added ${conflictModal.pendingProduct.name}`);
    setTimeout(() => setFeedbackMsg(''), 2000);
  }

  if (loading) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '3rem' }}>
        Loading store catalog...
      </div>
    );
  }

  const isCurrentStoreInCart = cart.vendorId === id || !cart.vendorId;

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
          }}
        >
          ← Back to Stores
        </button>

        <div className="card" style={{ padding: '1rem', borderTop: '4px solid #059669' }}>
          <div className="flex-row-between">
            <span className="badge badge-success">
              {vendor?.businessType || 'RESTAURANT'}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#047857' }}>
              ⚡ 10–15 Min Express
            </span>
          </div>

          <h2 style={{ margin: '0.35rem 0 0.2rem 0', fontSize: '1.35rem' }}>
            {vendor?.name}
          </h2>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', color: '#4B5563' }}>
            {vendor?.cuisine || 'Quality fresh food crafted for quick delivery'}
          </p>

          <div style={{
            fontSize: '0.75rem',
            background: '#ecfdf5',
            color: '#064e3b',
            padding: '0.4rem 0.6rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}>
            <span>ℹ️</span>
            <span>Menu prices reflect +5% packaging & preparation adjustment.</span>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div style={{
          background: '#d1fae5',
          color: '#064e3b',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          ✓ {feedbackMsg}
        </div>
      )}

      {/* Menu Header */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 700 }}>
        Store Menu & Catalog
      </h3>

      {/* Product List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {products.map((product) => {
          const cartItem = cart.items.find((i) => i.productId === product.id);
          const quantityInCart = cartItem ? cartItem.quantity : 0;

          return (
            <div key={product.id} className="card" style={{ padding: '0.875rem' }}>
              <div className="flex-row-between" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, paddingRight: '0.75rem' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: '#111827' }}>
                    {product.name}
                  </h4>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6B7280' }}>
                    {product.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#059669',
                      fontFamily: 'var(--font-family-display)',
                    }}>
                      ₹{(product.customerMenuPrice || product.originalPrice * 1.05).toFixed(2)}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#9CA3AF',
                      textDecoration: 'line-through',
                    }}>
                      ₹{(product.originalPrice || 100).toFixed(2)}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                      +5%
                    </span>
                  </div>
                </div>

                {/* Add / Quantity Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {quantityInCart > 0 ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#059669',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      color: '#FFFFFF',
                    }}>
                      <button
                        onClick={() => cart.updateQuantity(product.id, quantityInCart - 1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FFFFFF',
                          padding: '0.35rem 0.65rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
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
                          padding: '0.35rem 0.65rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleAddToCart(product)}
                      style={{ padding: '0.4rem 1rem' }}
                    >
                      + ADD
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Single-Vendor Cart Conflict Modal */}
      {conflictModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
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
              >
                Keep Existing Cart
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={handleSwitchStoreAndAdd}
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
          <div style={{
            background: '#059669',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 20px rgba(5, 150, 105, 0.4)',
          }}>
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
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
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
