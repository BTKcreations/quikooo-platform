import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * PrefetchLink
 * Wraps react-router-dom Link with onMouseEnter, onFocus, and onTouchStart warmup triggers.
 * Accepts `prefetch` prop (a dynamic import function like `() => import('./pages/...')`).
 */
export default function PrefetchLink({
  to,
  prefetch,
  children,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}) {
  const prefetchedRef = useRef(false);

  const handleWarmup = () => {
    if (!prefetchedRef.current && typeof prefetch === 'function') {
      prefetchedRef.current = true;
      try {
        const promise = prefetch();
        if (promise && typeof promise.catch === 'function') {
          promise.catch(() => {});
        }
      } catch {
        // dynamic import warmup error ignored
      }
    }
  };

  return (
    <Link
      to={to}
      onMouseEnter={(e) => {
        handleWarmup();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        handleWarmup();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        handleWarmup();
        onTouchStart?.(e);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
