import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../store/cart.js';
import { useToast } from './Toast.jsx';

/**
 * RatingReorder Component
 * Blinkit/Zepto-grade post-delivery experience:
 * - Instant 1-tap 5-star rating
 * - Prominent Reorder button with total price
 */
export default function RatingReorder({
  order = {
    id: 'ord-prev-1',
    orderNumber: 'QK-ORD-9281',
    vendorName: 'Curry & Spice Express',
    vendorId: 'vendor-sample-1',
    status: 'DELIVERED',
    totalAmount: 135.0,
    items: [
      { productId: 'prod-101', name: 'Paneer Butter Masala', quantity: 1, originalPrice: 100, customerMenuPrice: 105 },
    ],
  },
  onReorderSuccess,
}) {
  const navigate = useNavigate();
  const cart = useCart();
  const { showToast } = useToast();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('quikooo_ratings');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed[order.id || order.orderNumber]) {
            setRating(parsed[order.id || order.orderNumber]);
            setFeedbackSubmitted(true);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [order.id, order.orderNumber]);

  const handleRate = (stars) => {
    setRating(stars);
    setFeedbackSubmitted(true);
    showToast(
      stars === 5 ? '🌟 Thanks! Glad you loved the express delivery!' : `★ Rated ${stars} stars. Thank you!`,
      'success'
    );
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('quikooo_ratings');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed[order.id || order.orderNumber] = stars;
        localStorage.setItem('quikooo_ratings', JSON.stringify(parsed));
      }
    } catch {
      // ignore
    }
  };

  const handleReorder = () => {
    try {
      const vendor = { id: order.vendorId, name: order.vendorName };
      cart.reorder(order.items, vendor);
      showToast(`⚡ Order loaded into cart from ${order.vendorName}!`, 'success');
      if (onReorderSuccess) {
        onReorderSuccess(order);
      } else {
        navigate('/cart');
      }
    } catch (err) {
      showToast(err.message || 'Failed to reorder', 'error');
    }
  };

  const activeStars = hoverRating || rating;

  return (
    <div
      className="card"
      style={{
        padding: '1.25rem',
        borderLeft: '4px solid #10B981',
        backgroundColor: '#FFFFFF',
        marginBottom: '1.25rem',
      }}
      role="region"
      aria-label="Rate delivered order and reorder"
    >
      <div className="flex-row-between" style={{ marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
          🎉 Order Delivered Successfully
        </span>
        <span className="badge badge-success">DELIVERED</span>
      </div>

      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: '0.25rem' }}>
        How was your order from {order.vendorName}?
      </div>
      <div style={{ fontSize: '0.8rem', color: '#4B5563', marginBottom: '0.85rem' }}>
        {order.items?.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
      </div>

      {/* 1-Tap Star Rating Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#F9FAFB',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.65rem',
                color: star <= activeStars ? '#F59E0B' : '#D1D5DB',
                padding: '0.1rem',
                transition: 'transform 0.15s ease, color 0.15s ease',
                transform: star <= activeStars ? 'scale(1.1)' : 'scale(1)',
                minWidth: '36px',
                minHeight: '36px',
              }}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: activeStars === 5 ? '#059669' : '#4B5563', flex: 1, textAlign: 'right' }}>
          {feedbackSubmitted
            ? `Rated ${rating} ★ Thank you!`
            : activeStars === 5
            ? '⚡ 1-Tap 5-Star Express!'
            : activeStars > 0
            ? `${activeStars} Stars`
            : 'Tap stars to rate'}
        </div>
      </div>

      {/* Prominent Reorder Action */}
      <button
        onClick={handleReorder}
        className="btn-primary btn-block"
        style={{
          minHeight: '46px',
          fontSize: '0.95rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
        }}
      >
        <span>⚡ Reorder Again</span>
        <span>•</span>
        <span>₹{Number(order.totalAmount || 135).toFixed(2)}</span>
      </button>
    </div>
  );
}
