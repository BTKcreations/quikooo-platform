import React from 'react';

export default function EmptyState({
  icon = '📦',
  title = 'No data found',
  description = 'There are no items to display at this moment.',
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`card ${className}`}
      style={{
        textAlign: 'center',
        padding: '3rem 1.5rem',
        margin: '1rem 0',
      }}
      role="status"
    >
      <div style={{ fontSize: '3rem', marginBottom: '0.75rem', lineHeight: 1 }} aria-hidden="true">
        {icon}
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--color-text-primary, #111827)' }}>
        {title}
      </h3>
      <p style={{ margin: '0 auto 1.25rem auto', maxWidth: '360px', fontSize: '0.875rem', color: 'var(--color-text-secondary, #4B5563)' }}>
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="btn-primary"
          style={{ minHeight: '44px', padding: '0.5rem 1.25rem' }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
