import React, { useState, useEffect, useMemo } from 'react';

// Popular food & grocery quick search tags
export const POPULAR_TAGS = ['Biryani', 'Paneer Butter', 'Garlic Naan', 'Milk & Eggs', 'Gulab Jamun', 'Healthy Bowls'];

/**
 * Fuzzy / Typo-tolerant substring & edit-distance match
 */
export function fuzzyMatch(pattern, text) {
  if (!pattern || !text) return false;
  const p = pattern.toLowerCase().trim();
  const t = text.toLowerCase().trim();
  if (t.includes(p)) return true;

  // Split query into terms
  const terms = p.split(/\s+/);
  return terms.every((term) => {
    if (t.includes(term)) return true;
    const words = t.split(/\s+/);
    const maxDist = term.length >= 5 ? 2 : 1;
    return words.some((w) => levenshtein(term, w) <= maxDist);
  });
}


function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export default function PredictiveSearch({ value, onChange, onSelectQuery }) {
  const [recentSearches, setRecentSearches] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('quikooo_recent_searches');
        return stored ? JSON.parse(stored) : ['Biryani', 'Curry'];
      } catch {
        return ['Biryani', 'Curry'];
      }
    }
    return ['Biryani', 'Curry'];
  });

  const [isFocused, setIsFocused] = useState(false);

  const handleSelect = (query) => {
    onChange(query);
    onSelectQuery?.(query);
    // Add to recent
    const updated = [query, ...recentSearches.filter((s) => s.toLowerCase() !== query.toLowerCase())].slice(0, 5);
    setRecentSearches(updated);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('quikooo_recent_searches', JSON.stringify(updated));
      } catch {}
    }
    setIsFocused(false);
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('quikooo_recent_searches');
    }
  };

  return (
    <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
      {/* Search Input Bar */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            position: 'absolute',
            left: '0.85rem',
            color: '#9CA3AF',
            fontSize: '1.1rem',
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          type="search"
          className="input"
          placeholder="Search restaurants, dishes or groceries (typo-tolerant)..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          style={{
            paddingLeft: '2.5rem',
            paddingRight: value ? '2.5rem' : '1rem',
            minHeight: '44px',
            fontSize: '0.9rem',
          }}
          aria-label="Search dishes and stores"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            style={{
              position: 'absolute',
              right: '0.75rem',
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0.25rem',
            }}
            aria-label="Clear search input"
          >
            ✕
          </button>
        )}
      </div>

      {/* Predictive Dropdown Drawer */}
      {isFocused && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            border: '1px solid #E5E7EB',
            padding: '0.75rem',
            marginTop: '0.35rem',
            zIndex: 50,
          }}
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                  🕒 Recent Searches
                </span>
                <button
                  onClick={handleClearRecent}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Clear
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSelect(term)}
                    style={{
                      background: '#F3F4F6',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.75rem',
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      minHeight: '36px',
                    }}
                  >
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Trending Tags */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              🔥 Popular Right Now
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleSelect(tag)}
                  style={{
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '9999px',
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.75rem',
                    color: '#065F46',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '36px',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #F3F4F0' }}>
            <button
              onClick={() => setIsFocused(false)}
              style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
