import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Windowed Virtual List Hook
 * Renders first 30 items initially and dynamically loads more using IntersectionObserver
 * Handles high-concurrency / large catalogs with zero scroll lag
 */
export function useVirtualList({ items = [], initialCount = 30, step = 15 } = {}) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(initialCount, items.length));
  const sentinelRef = useRef(null);

  // If item collection changes significantly, adjust visible count
  useEffect(() => {
    setVisibleCount((prev) => Math.max(initialCount, Math.min(prev, items.length)));
  }, [items.length, initialCount]);

  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + step, items.length));
  }, [items.length, step]);

  useEffect(() => {
    if (!hasMore || typeof window === 'undefined') return;

    if (!('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    const target = sentinelRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) observer.unobserve(target);
      observer.disconnect();
    };
  }, [hasMore, loadMore]);

  const displayedItems = items.slice(0, visibleCount);

  return {
    displayedItems,
    visibleCount,
    totalCount: items.length,
    hasMore,
    loadMore,
    sentinelRef,
  };
}

export default useVirtualList;
