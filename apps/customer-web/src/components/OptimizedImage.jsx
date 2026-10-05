import React, { useState } from 'react';

/**
 * OptimizedImage Component
 * - lazy loading (loading="lazy")
 * - async decoding (decoding="async")
 * - WebP srcset note & modern image container
 * - Skeleton pulse placeholder while loading
 * - Graceful fallback on error
 */
export default function OptimizedImage({
  src,
  alt = '',
  className = '',
  style = {},
  aspectRatio = '16/9',
  fallbackSrc = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  webpSrc,
}) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // If webpSrc not provided, check if URL can support webp or construct srcset
  const resolvedSrc = hasError ? fallbackSrc : (src || fallbackSrc);

  return (
    <div
      className={`optimized-image-wrapper ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
        aspectRatio: aspectRatio,
        width: '100%',
        height: '100%',
        ...style,
      }}
    >
      {/* Skeleton Pulse shown while image is loading */}
      {!loaded && !hasError && (
        <div
          className="skeleton-pulse"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      )}

      {/* Picture element supporting WebP srcset with fallback per 2026 Web Standards */}
      <picture>
        {webpSrc && <source type="image/webp" srcSet={webpSrc} />}
        {/* WebP srcset note: When served by CDN, use image/webp next-gen format for 30%+ payload reduction */}
        <img
          src={resolvedSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (!hasError) {
              setHasError(true);
            }
            setLoaded(true);
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'opacity 0.25s ease-in-out',
            opacity: loaded ? 1 : 0,
          }}
        />
      </picture>
    </div>
  );
}
