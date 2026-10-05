import React, { useState, useEffect } from 'react';

/**
 * Calculates remaining countdown time based on order placement time and estimated prep minutes.
 */
export function calculateRemainingTime(placedAt, prepMinutes = 15, nowMs = Date.now()) {
  const startTime = placedAt ? new Date(placedAt).getTime() : nowMs;
  const targetTime = startTime + (Number(prepMinutes) || 15) * 60 * 1000;
  const diffMs = targetTime - nowMs;
  const isOverdue = diffMs < 0;

  const totalAbsSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const minutes = Math.floor(totalAbsSeconds / 60);
  const seconds = totalAbsSeconds % 60;

  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return {
    isOverdue,
    totalSecondsRemaining: Math.floor(diffMs / 1000),
    minutes,
    seconds,
    formatted: formattedTime,
  };
}

/**
 * PrepTimer Component: Displays countdown or status for kitchen order fulfillment
 */
export default function PrepTimer({ placedAt, prepMinutes = 15, status }) {
  const [remaining, setRemaining] = useState(() =>
    calculateRemainingTime(placedAt, prepMinutes)
  );

  useEffect(() => {
    // Only tick live timer if order is currently active in kitchen
    if (status === 'READY_FOR_PICKUP' || status === 'DELIVERED') {
      return;
    }

    const interval = setInterval(() => {
      setRemaining(calculateRemainingTime(placedAt, prepMinutes));
    }, 1000);

    return () => clearInterval(interval);
  }, [placedAt, prepMinutes, status]);

  if (status === 'READY_FOR_PICKUP') {
    return (
      <span
        className="badge badge-ready"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
      >
        <span>✓</span>
        <span>Prep Completed</span>
      </span>
    );
  }

  if (status === 'ORDER_PLACED') {
    return (
      <span
        className="badge badge-placed"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        <span>⏱️</span>
        <span>Target: {prepMinutes}m</span>
      </span>
    );
  }

  // Active cooking (VENDOR_ACCEPTED or PREPARING)
  const isUrgent = remaining.minutes < 3 && !remaining.isOverdue;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        padding: '0.2rem 0.55rem',
        borderRadius: '9999px',
        backgroundColor: remaining.isOverdue
          ? '#FEE2E2'
          : isUrgent
          ? '#FEF3C7'
          : '#ECFDF5',
        color: remaining.isOverdue
          ? '#991B1B'
          : isUrgent
          ? '#B45309'
          : '#065F46',
        border: `1px solid ${
          remaining.isOverdue
            ? '#FECACA'
            : isUrgent
            ? '#FDE68A'
            : '#A7F3D0'
        }`,
      }}
      title={
        remaining.isOverdue
          ? `Preparation is overdue by ${remaining.formatted}`
          : `${remaining.formatted} left on kitchen prep timer`
      }
    >
      <span>{remaining.isOverdue ? '⚠️' : '⏱️'}</span>
      <span>
        {remaining.isOverdue
          ? `+${remaining.formatted} Overdue`
          : `${remaining.formatted} left`}
      </span>
    </span>
  );
}
