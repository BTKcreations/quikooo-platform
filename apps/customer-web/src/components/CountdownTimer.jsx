import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Formats seconds into mm:ss string format
 * Exported for testability and reuse
 */
export function formatCountdown(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  return `${mm}:${ss}`;
}

/**
 * Live Order ETA Countdown Timer
 */
export default function CountdownTimer({
  initialSeconds = 720,
  onExpire,
  className = '',
  style = {},
  showIcon = true,
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  return (
    <div
      className={`countdown-timer ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontWeight: 800,
        fontFamily: 'monospace',
        letterSpacing: '0.05em',
        ...style,
      }}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${formatCountdown(secondsLeft)}`}
    >
      {showIcon && <span>⏱️</span>}
      <span>{formatCountdown(secondsLeft)}</span>
    </div>
  );
}

/**
 * Homepage Active Order Banner
 * Displays sticky/prominent express ETA countdown and quick link to tracking
 */
export function ActiveOrderBanner({ order, onTrack }) {
  const navigate = useNavigate();
  const [activeOrder, setActiveOrder] = useState(order || null);

  useEffect(() => {
    if (order) {
      setActiveOrder(order);
      return;
    }
    // Check localStorage for active order
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('quikooo_active_order');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.status === 'PREPARING' || parsed.status === 'PICKED_UP' || parsed.status === 'ORDER_PLACED')) {
            setActiveOrder(parsed);
            return;
          }
        }
      }
    } catch {
      // ignore
    }
  }, [order]);

  if (!activeOrder) return null;

  const orderId = activeOrder.id || activeOrder.orderNumber || 'QK-ORD-LIVE';
  const vendorName = activeOrder.vendorName || 'Curry & Spice Express';
  const etaSecs = activeOrder.etaSeconds || 680;

  const handleTrack = () => {
    if (onTrack) {
      onTrack(activeOrder);
    } else {
      navigate(`/orders?id=${orderId}`);
    }
  };

  return (
    <div
      className="card card-emerald"
      style={{
        marginBottom: '1rem',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        borderLeft: '4px solid #059669',
        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.15)',
        animation: 'fadeIn 0.25s ease',
      }}
      role="region"
      aria-label="Active order delivery status"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
        <span
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.25)',
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>
              ⚡ Order in Progress ({activeOrder.status || 'On The Way'})
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
              {vendorName}
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 700, marginTop: '0.1rem' }}>
            Arriving in <CountdownTimer initialSeconds={etaSecs} showIcon={false} style={{ color: '#059669' }} />
          </div>
        </div>
      </div>

      <button
        onClick={handleTrack}
        className="btn-primary btn-sm"
        style={{
          whiteSpace: 'nowrap',
          minHeight: '38px',
          padding: '0.35rem 0.85rem',
          fontSize: '0.8rem',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        Track Order →
      </button>
    </div>
  );
}
