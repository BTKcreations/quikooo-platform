import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Pure pagination helper for slicing list collections.
 * Defaults to 30 items per page.
 */
export function paginateHelper(items = [], page = 1, pageSize = 30) {
  if (!Array.isArray(items)) return [];
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.max(1, parseInt(pageSize, 10) || 30);
  const startIndex = (safePage - 1) * size;
  return items.slice(startIndex, startIndex + size);
}

/**
 * Limit-based pagination helper returning the first N items.
 */
export function paginateList(items = [], limit = 30) {
  if (!Array.isArray(items)) return [];
  const safeLimit = Math.max(0, parseInt(limit, 10) || 30);
  return items.slice(0, safeLimit);
}

/**
 * Windowed Virtual List Hook (adapted from customer-web)
 * Renders first 30 items initially and dynamically loads more using IntersectionObserver
 */
export function useVirtualList({ items = [], initialCount = 30, step = 15 } = {}) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(initialCount, items.length));
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisibleCount((prev) => Math.max(initialCount, Math.min(prev, items.length)));
  }, [items.length, initialCount]);

  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + step, items.length));
  }, [items.length, step]);

  useEffect(() => {
    if (!hasMore || typeof window === 'undefined') return;
    if (!('IntersectionObserver' in window)) return;

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
