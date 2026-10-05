import React from 'react';

/**
 * Calculates sum of a specified numeric field or numeric items in an array,
 * rounded to 2 decimal places to avoid floating point inaccuracies.
 *
 * @param {Array} items - Array of objects or numbers
 * @param {string} [key] - Object property to sum if items are objects
 * @returns {number}
 */
export function calculateKpiSum(items = [], key) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const total = items.reduce((acc, item) => {
    let val;
    if (typeof item === 'object' && item !== null) {
      val = key ? item[key] : (item.amount ?? item.value ?? item.total ?? 0);
    } else {
      val = item;
    }
    const num = Number(val);
    return acc + (isNaN(num) ? 0 : num);
  }, 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

export const sumKpi = calculateKpiSum;

export default function KpiCard({
  label,
  title,
  value,
  subtext,
  subtitle,
  icon,
  valueColor,
  color,
  trend,
  badge,
  className = '',
  style = {},
  onClick,
}) {
  const displayLabel = label || title;
  const displaySubtext = subtext || subtitle;
  const valColor = valueColor || color;

  return (
    <div
      className={`kpi-card ${className}`}
      style={{
        ...style,
        ...(onClick ? { cursor: 'pointer' } : {}),
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <div className="kpi-label" style={{ margin: 0 }}>{displayLabel}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {badge && <span className="status-pill primary" style={{ fontSize: '0.7rem' }}>{badge}</span>}
          {icon && <span className="kpi-icon" style={{ fontSize: '1.2rem', lineHeight: 1 }}>{icon}</span>}
        </div>
      </div>

      <div className="kpi-value" style={valColor ? { color: valColor } : undefined}>
        {value}
      </div>

      {(displaySubtext || trend) && (
        <div className="kpi-subtext" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {trend && (
            <span
              style={{
                fontWeight: 600,
                color: typeof trend === 'object' && trend.negative ? '#DC2626' : '#059669',
              }}
            >
              {typeof trend === 'object' ? trend.value : trend}
            </span>
          )}
          {displaySubtext && <span>{displaySubtext}</span>}
        </div>
      )}
    </div>
  );
}
