import React from 'react';

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = '0.5rem',
  className = '',
  style = {},
}) {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#E5E7EB',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ lines = 3, hasImage = false, className = '' }) {
  return (
    <div
      className={`card ${className}`}
      style={{ padding: '1rem' }}
      aria-busy="true"
      aria-label="Loading content"
    >
      {hasImage && (
        <Skeleton height="140px" borderRadius="0.75rem" style={{ marginBottom: '0.75rem' }} />
      )}
      <Skeleton width="60%" height="1.25rem" style={{ marginBottom: '0.5rem' }} />
      <Skeleton width="90%" height="0.875rem" style={{ marginBottom: '0.35rem' }} />
      {lines > 2 && <Skeleton width="40%" height="0.875rem" style={{ marginBottom: '0.5rem' }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
        <Skeleton width="30%" height="1.25rem" />
        <Skeleton width="25%" height="2rem" borderRadius="0.5rem" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div
      className="grid-cards"
      style={{ marginTop: '1rem' }}
      aria-busy="true"
      aria-label="Loading grid items"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} hasImage />
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="page-content" aria-busy="true" aria-label="Loading page">
      <Skeleton height="3.5rem" borderRadius="0.75rem" style={{ marginBottom: '1rem' }} />
      <Skeleton height="2.75rem" borderRadius="0.5rem" style={{ marginBottom: '1rem' }} />
      <SkeletonGrid count={4} />
    </div>
  );
}

export default Skeleton;
