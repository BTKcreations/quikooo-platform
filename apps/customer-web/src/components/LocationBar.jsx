import React, { useState } from 'react';

const LOCATIONS = [
  { id: 'loc-1', name: 'Indiranagar 100ft Road', zone: 'URBAN', eta: '10–12m', city: 'Bengaluru' },
  { id: 'loc-2', name: 'Koramangala 4th Block', zone: 'URBAN', eta: '12–15m', city: 'Bengaluru' },
  { id: 'loc-3', name: 'HSR Layout Sector 1', zone: 'URBAN', eta: '10–14m', city: 'Bengaluru' },
  { id: 'loc-4', name: 'Mandya Rural Cluster (ZN-RUR-01)', zone: 'RURAL', eta: 'Next Morning', city: 'Mandya' },
];

export default function LocationBar({ onLocationChange }) {
  const [selectedLoc, setSelectedLoc] = useState(LOCATIONS[0]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (loc) => {
    setSelectedLoc(loc);
    setIsOpen(false);
    onLocationChange?.(loc);
  };

  return (
    <div style={{ position: 'relative', zIndex: 30 }}>
      {/* Clickable Location Bar Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '0.75rem',
          padding: '0.625rem 0.875rem',
          cursor: 'pointer',
          textAlign: 'left',
          marginBottom: '1rem',
          boxShadow: '0 2px 8px rgba(6, 78, 59, 0.15)',
          minHeight: '44px',
        }}
        aria-label="Change delivery location"
        aria-expanded={isOpen}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <span style={{ fontSize: '1.2rem' }}>📍</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: '#A7F3D0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Deliver to {selectedLoc.city} • <span style={{ color: '#FDE047' }}>⚡ {selectedLoc.eta}</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedLoc.name}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
            {selectedLoc.zone}
          </span>
          <span style={{ fontSize: '0.8rem' }}>▼</span>
        </div>
      </button>

      {/* Location Picker Modal / Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1px solid #E5E7EB',
            padding: '0.75rem',
            zIndex: 60,
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #F3F4F0' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Select Delivery Zone</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '0.9rem' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {LOCATIONS.map((loc) => {
              const isSelected = loc.id === selectedLoc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => handleSelect(loc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: isSelected ? '1px solid #059669' : '1px solid transparent',
                    backgroundColor: isSelected ? '#ECFDF5' : '#F9FAFB',
                    cursor: 'pointer',
                    textAlign: 'left',
                    minHeight: '44px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isSelected ? '#065F46' : '#111827' }}>
                      {loc.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      {loc.city} • Express ETA: {loc.eta}
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
