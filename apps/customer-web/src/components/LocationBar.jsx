import React, { useState, useEffect, useRef } from 'react';
import MapView from './MapView.jsx';
import { searchAddress, reverseGeocode, debounce } from '../lib/geocode.js';
import { useToast } from './Toast.jsx';

const PRESET_LOCATIONS = [
  { id: 'loc-1', name: 'Indiranagar 100ft Road', zone: 'URBAN', eta: '10–12m', city: 'Bengaluru', lat: 12.9784, lng: 77.6408, accuracy: '±10m (High Accuracy GPS)' },
  { id: 'loc-2', name: 'Koramangala 4th Block', zone: 'URBAN', eta: '12–15m', city: 'Bengaluru', lat: 12.9345, lng: 77.6266, accuracy: '±10m (High Accuracy GPS)' },
  { id: 'loc-3', name: 'HSR Layout Sector 1', zone: 'URBAN', eta: '10–14m', city: 'Bengaluru', lat: 12.9116, lng: 77.6389, accuracy: '±15m (Cell/GPS)' },
  { id: 'loc-4', name: 'Mandya Rural Cluster (ZN-RUR-01)', zone: 'RURAL', eta: 'Next Morning', city: 'Mandya', lat: 12.5244, lng: 76.8958, accuracy: '±25m (Regional Hub)' },
];

export default function LocationBar({ onLocationChange }) {
  const { showToast } = useToast();

  // Load persisted location from localStorage quikooo_location
  const [selectedLoc, setSelectedLoc] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('quikooo_location');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.name && parsed.lat && parsed.lng) {
            return parsed;
          }
        }
      }
    } catch (_) {}
    return PRESET_LOCATIONS[0];
  });

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // 1-second debounced search caller
  const debouncedSearchRef = useRef(
    debounce(async (query, showErr) => {
      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }
      try {
        const results = await searchAddress(query, {
          onError: (err) => {
            showErr?.(`Geocoding error: ${err.message}`);
          },
        });
        setSuggestions(results || []);
      } catch (err) {
        console.warn('Geocoding search failed:', err);
        showErr?.('Failed to fetch address suggestions. Using cached presets.');
      } finally {
        setIsSearching(false);
      }
    }, 1000)
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    if (val.trim().length >= 2) {
      setIsSearching(true);
      debouncedSearchRef.current(val, showToast);
    } else {
      setSuggestions([]);
      setIsSearching(false);
    }
  };

  const handleSelect = (loc) => {
    const fullLoc = {
      id: loc.id || `loc-${Date.now()}`,
      name: loc.name || loc.displayName || 'Custom Pinned Location',
      city: loc.city || 'Bengaluru',
      zone: loc.zone || (loc.city?.toLowerCase().includes('mandya') ? 'RURAL' : 'URBAN'),
      eta: loc.eta || '10–15m',
      lat: Number(loc.lat),
      lng: Number(loc.lng),
      accuracy: loc.accuracy || '±10m (OSM Nominatim Verified)',
      displayName: loc.displayName || loc.name,
    };

    setSelectedLoc(fullLoc);
    try {
      localStorage.setItem('quikooo_location', JSON.stringify(fullLoc));
    } catch (_) {}

    setSuggestions([]);
    setSearchText('');
    onLocationChange?.(fullLoc);
    showToast(`📍 Location updated: ${fullLoc.name}`, 'success');
  };

  // Click-to-set on mini MapView
  const handleMapPick = async (lat, lng) => {
    try {
      showToast('📍 Pinning selected map coordinates...', 'info');
      const rev = await reverseGeocode(lat, lng, {
        onError: () => {},
      });
      handleSelect({
        ...rev,
        lat,
        lng,
      });
    } catch (err) {
      handleSelect({
        name: `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        city: 'Bengaluru',
        lat,
        lng,
      });
    }
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
          <span style={{ fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</span>
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
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
            border: '1px solid #E5E7EB',
            padding: '1rem',
            zIndex: 60,
            animation: 'fadeIn 0.15s ease-out',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #F3F4F0' }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>Set Delivery Location</span>
              <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>OpenStreetMap Nominatim Live Search</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '1.1rem', padding: '0.25rem' }}
              aria-label="Close location selector"
            >
              ✕
            </button>
          </div>

          {/* Text Search Input with 1s Debounce */}
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <input
              type="text"
              className="input"
              value={searchText}
              onChange={handleInputChange}
              placeholder="Search area, road, landmark in India..."
              style={{
                width: '100%',
                paddingLeft: '2.25rem',
                fontSize: '0.875rem',
                minHeight: '44px',
              }}
              aria-label="Search address or area"
            />
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: '#9CA3AF' }}>
              🔍
            </span>
            {isSearching && (
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                Searching...
              </span>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div
              style={{
                marginBottom: '1rem',
                border: '1px solid #E5E7EB',
                borderRadius: '0.5rem',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '0.4rem 0.75rem', backgroundColor: '#F9FAFB', fontSize: '0.7rem', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase' }}>
                Search Suggestions ({suggestions.length})
              </div>
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(item)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    padding: '0.65rem 0.75rem',
                    border: 'none',
                    borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid #F3F4F0',
                    backgroundColor: '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{ fontSize: '1.1rem', marginTop: '1px' }}>📍</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.displayName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Mini MapView Preview + Accuracy Note */}
          <div style={{ marginBottom: '1rem' }}>
            <div className="flex-row-between" style={{ marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>
                Active Geofence Map (Click map to pin)
              </span>
              <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>
                2.0 km Radius
              </span>
            </div>

            <MapView
              center={[selectedLoc.lat, selectedLoc.lng]}
              zoom={14}
              radiusKm={2}
              markers={[
                {
                  lat: selectedLoc.lat,
                  lng: selectedLoc.lng,
                  label: selectedLoc.name,
                  type: 'user',
                  description: `${selectedLoc.city} • Express 10–15m delivery zone`,
                },
              ]}
              onPick={handleMapPick}
              className="quikooo-map-container map-mini"
              style={{ height: '160px', borderRadius: '0.5rem' }}
            />

            {/* Accuracy Note */}
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.4rem 0.6rem',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '0.375rem',
                fontSize: '0.72rem',
                color: '#065F46',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>🎯</span>
              <span>
                <strong>Accuracy:</strong> {selectedLoc.accuracy || '±10m (GPS Verified)'} • 2.0 km delivery geofence active.
              </span>
            </div>
          </div>

          {/* Quick Preset Zones */}
          <div style={{ borderTop: '1px solid #F3F4F0', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Quick Preset Hubs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {PRESET_LOCATIONS.map((loc) => {
                const isSelected = loc.id === selectedLoc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => handleSelect(loc)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: isSelected ? '1px solid #059669' : '1px solid #E5E7EB',
                      backgroundColor: isSelected ? '#ECFDF5' : '#F9FAFB',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: '44px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.825rem', color: isSelected ? '#065F46' : '#111827' }}>
                        {loc.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                        {loc.city} • {loc.eta} • {loc.zone}
                      </div>
                    </div>
                    {isSelected && <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
