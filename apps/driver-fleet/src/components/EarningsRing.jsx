import React from 'react';
import { calculateRingPercentage, calculateRingOffset } from '../api.js';

export { calculateRingPercentage, calculateRingOffset };

/**
 * EarningsRing component
 * SVG circular progress ring for tracking driver daily target / goals
 */
export default function EarningsRing({
  completed = 0,
  target = 16,
  percent: customPercent,
  size = 90,
  strokeWidth = 8,
  radius = 38,
  showLabel = true,
  color = '#059669',
  trackColor = '#E5E7EB',
  className = '',
}) {
  const percent = customPercent !== undefined
    ? Math.min(100, Math.max(0, Math.round(Number(customPercent) || 0)))
    : calculateRingPercentage(completed, target);

  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = calculateRingOffset(percent, radius);

  const center = size / 2;

  return (
    <div
      className={`earnings-ring-container ${className}`}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Daily goal progress: ${percent}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            textAlign: 'center',
            fontWeight: 800,
            fontSize: `${Math.max(0.75, size * 0.01)}rem`,
            color: '#064E3B',
            fontFamily: 'var(--font-family-display, sans-serif)',
          }}
        >
          {percent}%
        </div>
      )}
    </div>
  );
}
