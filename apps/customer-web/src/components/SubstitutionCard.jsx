import React, { useState } from 'react';
import { useToast } from './Toast.jsx';

/**
 * SubstitutionCard Component
 * Zepto/Blinkit-level flow when an item is out of stock during kitchen prep / packing.
 * Allows instant acceptance of merchant-suggested alternative or full item refund.
 */
export default function SubstitutionCard({
  originalItem = {
    id: 'prod-101',
    name: 'Paneer Butter Masala',
    price: 105,
    quantity: 1,
  },
  alternatives = [
    {
      id: 'alt-101',
      name: 'Kadai Paneer Special',
      price: 105,
      priceDiff: 0,
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=150&q=80',
      reason: 'Same chef & rich tomato gravy',
    },
    {
      id: 'alt-102',
      name: 'Paneer Tikka Masala',
      price: 115,
      priceDiff: 10,
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=150&q=80',
      reason: 'Charcoal grilled paneer upgrade',
    },
  ],
  onAccept,
  onRefund,
}) {
  const { showToast } = useToast();
  const [selectedAltId, setSelectedAltId] = useState(alternatives[0]?.id || null);
  const [status, setStatus] = useState('PENDING'); // PENDING | ACCEPTED | REFUNDED

  const handleAccept = (alt) => {
    setStatus('ACCEPTED');
    showToast(`✓ Substitute accepted: ${alt.name}`, 'success');
    onAccept?.(alt, originalItem);
  };

  const handleRefund = () => {
    setStatus('REFUNDED');
    showToast(`✓ ₹${originalItem.price || 105} refunded to original payment method`, 'info');
    onRefund?.(originalItem);
  };

  if (status === 'ACCEPTED') {
    const chosen = alternatives.find((a) => a.id === selectedAltId) || alternatives[0];
    return (
      <div
        className="card"
        style={{
          padding: '0.85rem 1rem',
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065F46' }}>
          <span style={{ fontSize: '1.25rem' }}>✓</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
              Substitution Confirmed: {chosen?.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#047857' }}>
              Kitchen is packing your fresh replacement item.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'REFUNDED') {
    return (
      <div
        className="card"
        style={{
          padding: '0.85rem 1rem',
          backgroundColor: '#F3F4F6',
          border: '1px solid #E5E7EB',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
          <span style={{ fontSize: '1.25rem' }}>↩️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
              Item Refund Initiated: {originalItem.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
              ₹{originalItem.price} will credit back to your account automatically.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        padding: '1rem',
        marginBottom: '1.25rem',
        border: '1.5px solid #F59E0B',
        backgroundColor: '#FFFBEB',
      }}
      role="alert"
      aria-label="Item substitution required"
    >
      {/* Alert Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.4rem' }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400E' }}>
            Item Out of Stock at Kitchen
          </div>
          <div style={{ fontSize: '0.78rem', color: '#78350F' }}>
            <strong>{originalItem.name}</strong> ran out. Choose a store-recommended substitute or request a 1-tap refund.
          </div>
        </div>
      </div>

      {/* Suggested Alternatives */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem' }}>
        {alternatives.map((alt) => {
          const isSelected = selectedAltId === alt.id;
          const diffText =
            alt.priceDiff === 0
              ? 'No price difference'
              : alt.priceDiff > 0
              ? `+₹${alt.priceDiff} extra`
              : `-₹${Math.abs(alt.priceDiff)} refund`;

          return (
            <div
              key={alt.id}
              onClick={() => setSelectedAltId(alt.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '0.5rem',
                border: isSelected ? '2px solid #059669' : '1px solid #E5E7EB',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="radio"
                  name="substitute-selection"
                  checked={isSelected}
                  onChange={() => setSelectedAltId(alt.id)}
                  aria-label={`Select ${alt.name} as replacement`}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
                    {alt.name}
                  </div>
                  {alt.reason && (
                    <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                      {alt.reason}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#059669' }}>
                  ₹{alt.price}
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: alt.priceDiff > 0 ? '#B45309' : '#047857',
                  }}
                >
                  {diffText}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={handleRefund}
          className="btn-secondary btn-sm"
          style={{
            minHeight: '38px',
            fontSize: '0.78rem',
            color: '#B91C1C',
            borderColor: '#FCA5A5',
            backgroundColor: '#FEF2F2',
          }}
        >
          Don't Replace (Refund ₹{originalItem.price})
        </button>

        <button
          onClick={() => {
            const chosen = alternatives.find((a) => a.id === selectedAltId) || alternatives[0];
            handleAccept(chosen);
          }}
          className="btn-primary btn-sm"
          style={{ minHeight: '38px', fontSize: '0.78rem', fontWeight: 700 }}
        >
          ✓ Accept Replacement
        </button>
      </div>
    </div>
  );
}
