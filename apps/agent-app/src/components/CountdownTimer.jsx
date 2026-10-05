import React, { useState, useEffect } from 'react';
import { calculateCutoffCountdown, isRuralOrderEligible } from '../api.js';

/**
 * Formats countdown values into standardized string
 */
export function formatCountdownDisplay({ hours = 0, minutes = 0, seconds = 0, isPassed = false } = {}) {
  if (isPassed) {
    return '00h : 00m : 00s (Cutoff Locked)';
  }
  const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
  return `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}

/**
 * CountdownTimer Component
 * Live countdown to the strict 21:00 Asia/Kolkata cutoff.
 * Automatically signals when the batch is locked for next-morning 05:00 - 08:00 dispatch.
 */
export default function CountdownTimer({
  customTime = null,
  onLockChange,
  className = '',
  compact = false,
}) {
  const [countdown, setCountdown] = useState(() => {
    return calculateCutoffCountdown(customTime || new Date());
  });

  const isLocked = countdown.isPassed;

  useEffect(() => {
    // If a custom static time is provided (e.g., in simulation), update once
    if (customTime) {
      const cd = calculateCutoffCountdown(customTime);
      setCountdown(cd);
      if (onLockChange) onLockChange(cd.isPassed);
      return;
    }

    const tick = () => {
      const cd = calculateCutoffCountdown(new Date());
      setCountdown(cd);
      if (onLockChange) onLockChange(cd.isPassed);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [customTime, onLockChange]);

  const pad = (n) => String(n).padStart(2, '0');

  if (compact) {
    return (
      <div
        className={`countdown-compact ${isLocked ? 'locked' : 'open'} ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          backgroundColor: isLocked ? '#FEE2E2' : '#D1FAE5',
          color: isLocked ? '#991B1B' : '#065F46',
          fontSize: '0.85rem',
          fontWeight: 700,
          fontFamily: 'monospace',
          border: `1px solid ${isLocked ? '#FECACA' : '#A7F3D0'}`,
        }}
        role="timer"
        aria-live="polite"
      >
        <span>{isLocked ? '🔒' : '⏱️'}</span>
        <span>{isLocked ? 'Cutoff Locked' : countdown.formatted}</span>
      </div>
    );
  }

  return (
    <div
      className={`alert-card ${isLocked ? 'locked' : 'success'} ${className}`}
      style={{
        borderRadius: '0.875rem',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
      role="region"
      aria-label="Cutoff Countdown Monitor"
    >
      <div style={{ fontSize: '2.25rem', lineHeight: 1 }}>{isLocked ? '🔒' : '⏱️'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <strong style={{ fontSize: '1.1rem', fontFamily: 'Outfit, sans-serif' }}>
            {isLocked
              ? '21:00 Asia/Kolkata Cutoff Reached — Rural Batch Locked'
              : 'Rural Batch Ordering Window Open (Cutoff: 21:00 Asia/Kolkata)'}
          </strong>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              backgroundColor: isLocked ? '#DC2626' : '#059669',
              color: '#FFFFFF',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {isLocked ? 'CUTOFF LOCKED' : 'WINDOW OPEN'}
          </span>
        </div>

        <p style={{ margin: '0.5rem 0 0.75rem 0', fontSize: '0.875rem', color: isLocked ? '#7F1D1D' : '#064E3B' }}>
          {isLocked
            ? 'New rural orders are strictly locked for next-morning 05:00 - 08:00 dispatch. The batch manifest is sealed for route aggregation.'
            : 'Accepting scheduled rural orders for tomorrow morning delivery. Batch will automatically seal at 21:00 Asia/Kolkata.'}
        </p>

        {/* Live Digits Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isLocked ? '#991B1B' : '#065F46' }}>
            Countdown to Cutoff:
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'monospace' }}>
            <div
              style={{
                backgroundColor: isLocked ? '#FEE2E2' : '#FFFFFF',
                color: isLocked ? '#991B1B' : '#065F46',
                border: `1px solid ${isLocked ? '#FECACA' : '#A7F3D0'}`,
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                fontWeight: 800,
                fontSize: '1rem',
              }}
            >
              {pad(countdown.hours)}h
            </div>
            <span style={{ fontWeight: 800, color: isLocked ? '#991B1B' : '#059669' }}>:</span>
            <div
              style={{
                backgroundColor: isLocked ? '#FEE2E2' : '#FFFFFF',
                color: isLocked ? '#991B1B' : '#065F46',
                border: `1px solid ${isLocked ? '#FECACA' : '#A7F3D0'}`,
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                fontWeight: 800,
                fontSize: '1rem',
              }}
            >
              {pad(countdown.minutes)}m
            </div>
            <span style={{ fontWeight: 800, color: isLocked ? '#991B1B' : '#059669' }}>:</span>
            <div
              style={{
                backgroundColor: isLocked ? '#FEE2E2' : '#FFFFFF',
                color: isLocked ? '#991B1B' : '#065F46',
                border: `1px solid ${isLocked ? '#FECACA' : '#A7F3D0'}`,
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                fontWeight: 800,
                fontSize: '1rem',
              }}
            >
              {pad(countdown.seconds)}s
            </div>
          </div>

          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: isLocked ? '#B91C1C' : '#047857',
              marginLeft: '0.5rem',
            }}
          >
            {isLocked ? '(Next batch opens tomorrow morning)' : 'remaining until batch freeze'}
          </span>
        </div>
      </div>
    </div>
  );
}
