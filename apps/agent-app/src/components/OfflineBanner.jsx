import React, { useState, useEffect } from 'react';

/**
 * OfflineBanner
 * Monitors navigator.onLine and periodic lightweight heartbeat.
 * Displays a slim non-blocking banner when offline.
 * Never blocks navigation or UI interaction.
 * Displays brief success indicator when reconnected.
 */
export default function OfflineBanner({ heartbeatIntervalMs = 15000 }) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        const timer = setTimeout(() => setShowReconnected(false), 3000);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Heartbeat check
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        try {
          const res = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
          if (!isOnline && res.ok) {
            handleOnline();
          }
        } catch {
          // Keep non-blocking
        }
      }
    }, heartbeatIntervalMs);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [wasOffline, isOnline, heartbeatIntervalMs]);

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          backgroundColor: '#059669',
          color: '#FFFFFF',
          padding: '0.4rem 1rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        <span>⚡</span>
        <span>Back online! Network connection restored.</span>
      </div>
    );
  }

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        backgroundColor: '#F59E0B',
        color: '#78350F',
        padding: '0.4rem 1rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
      }}
    >
      <span>📡</span>
      <span>You are currently offline. Showing cached data — navigation remains active.</span>
    </div>
  );
}
