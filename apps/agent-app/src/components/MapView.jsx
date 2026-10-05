import React, { useEffect, useRef, useState } from 'react';

/**
 * QUIKOOO Map Provider Abstraction
 * Supports OpenStreetMap + Leaflet (free, zero API keys) with pluggable Google Maps future swap.
 */
export const MAP_PROVIDERS = {
  OSM: 'osm',
  GOOGLE: 'google',
};

const DEFAULT_CENTER_INDIA = [12.5244, 76.8958]; // Mandya Rural Hub Center fallback

/**
 * Normalizes coordinate inputs [lat, lng] or { lat, lng }
 */
function normalizeCoords(coords, fallback = DEFAULT_CENTER_INDIA) {
  if (!coords) return fallback;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lat = Number(coords[0]);
    const lng = Number(coords[1]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  if (typeof coords === 'object') {
    const lat = Number(coords.lat ?? coords.latitude);
    const lng = Number(coords.lng ?? coords.longitude ?? coords.lon);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  return fallback;
}

/**
 * Creates custom SVG DivIcons for rural batch operations (Hamlet Cluster, Zone Hub, Order Drop)
 */
function createSvgPin(L, type = 'cluster', label = '', count = 1) {
  let pinColor = '#059669'; // Emerald default
  let pinIcon = '📦';

  if (type === 'hub') {
    pinColor = '#7C3AED'; // Purple for Hub
    pinIcon = '🏛️';
    return L.divIcon({
      className: 'quikooo-div-icon',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
          <div style="background: #7C3AED; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; margin-bottom: 2px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">${label || 'Rural Hub'}</div>
          <svg width="32" height="38" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.268 0 0 6.268 0 14C0 23.5 14 34 14 34C14 34 28 23.5 28 14C28 6.268 21.732 0 14 0Z" fill="#7C3AED"/>
            <circle cx="14" cy="14" r="10" fill="#FFFFFF"/>
            <text x="14" y="18" font-size="12" text-anchor="middle">🏛️</text>
          </svg>
        </div>
      `,
      iconSize: [32, 38],
      iconAnchor: [16, 38],
      popupAnchor: [0, -36],
    });
  }

  if (type === 'cluster' || count > 1) {
    // Village Cluster Badge Pin
    return L.divIcon({
      className: 'quikooo-div-icon',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
          <div style="background: #059669; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; margin-bottom: 2px; white-space: nowrap; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.4); display: flex; align-items: center; gap: 4px;">
            <span>🏘️</span>
            <span>${label || 'Area'}</span>
            <span style="background: rgba(255,255,255,0.25); padding: 1px 5px; border-radius: 9999px;">${count}</span>
          </div>
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #059669; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 10px; font-weight: 800;">
            ${count}
          </div>
        </div>
      `,
      iconSize: [36, 40],
      iconAnchor: [18, 40],
      popupAnchor: [0, -38],
    });
  }

  return L.divIcon({
    className: 'quikooo-div-icon',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
        <svg width="24" height="30" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.268 0 0 6.268 0 14C0 23.5 14 34 14 34C14 34 28 23.5 28 14C28 6.268 21.732 0 14 0Z" fill="${pinColor}"/>
          <circle cx="14" cy="14" r="10" fill="#FFFFFF"/>
          <text x="14" y="18" font-size="12" text-anchor="middle">${pinIcon}</text>
        </svg>
      </div>
    `,
    iconSize: [24, 30],
    iconAnchor: [12, 30],
    popupAnchor: [0, -28],
  });
}

/**
 * Shared Agent App MapView Component
 */
export default function MapView({
  center = DEFAULT_CENTER_INDIA,
  zoom = 12,
  markers = [],
  radiusKm,
  route,
  polyline,
  onPick,
  className = 'quikooo-map-container',
  style,
  provider = MAP_PROVIDERS.OSM,
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const activeRoute = route || polyline;
  const normalizedCenter = normalizeCoords(center);

  // SSR-safe dynamic import & Leaflet initialization
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !containerRef.current) return;

      if (provider === MAP_PROVIDERS.GOOGLE) {
        console.info('[Agent MapView] Google Maps provider requested. In production, load Google Maps SDK.');
      }

      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        if (!isMounted || !containerRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(containerRef.current, {
          center: normalizedCenter,
          zoom,
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        if (onPick) {
          map.on('click', (e) => {
            onPick(e.latlng.lat, e.latlng.lng);
          });
        }

        const layersGroup = L.layerGroup().addTo(map);
        layersGroupRef.current = layersGroup;
        mapInstanceRef.current = map;

        setTimeout(() => {
          if (isMounted && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 150);

        setIsLoaded(true);
      } catch (err) {
        console.error('[Agent MapView] Failed to initialize Leaflet:', err);
        if (isMounted) {
          setLoadError(err.message || 'Failed to load map engine');
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [provider]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(normalizedCenter, zoom);
  }, [normalizedCenter[0], normalizedCenter[1], zoom]);

  // Update dynamic layers: Zone boundary circle, village hamlet cluster markers
  useEffect(() => {
    let isMounted = true;

    async function updateLayers() {
      if (!mapInstanceRef.current || !layersGroupRef.current) return;
      const L = await import('leaflet');
      if (!isMounted || !mapInstanceRef.current || !layersGroupRef.current) return;

      const group = layersGroupRef.current;
      group.clearLayers();

      // Zone Boundary Circle (e.g. 15km rural cluster or 2km node)
      if (radiusKm && Number(radiusKm) > 0) {
        L.circle(normalizedCenter, {
          radius: Number(radiusKm) * 1000,
          color: '#059669',
          fillColor: '#10B981',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 8',
        })
          .bindTooltip(`📍 Zone Boundary (${radiusKm} km radius)`, { permanent: false, direction: 'top' })
          .addTo(group);
      }

      // Polyline route if provided
      if (activeRoute && Array.isArray(activeRoute) && activeRoute.length > 1) {
        const polyPoints = activeRoute.map((pt) => normalizeCoords(pt));
        L.polyline(polyPoints, {
          color: '#059669',
          weight: 4,
          opacity: 0.85,
        }).addTo(group);
      }

      // Clustered hamlet markers
      if (Array.isArray(markers)) {
        markers.forEach((m) => {
          if (!m || (m.lat === undefined && m.latitude === undefined)) return;
          const markerCoords = normalizeCoords(m);
          const icon = createSvgPin(L, m.type || 'cluster', m.label || '', m.count || 1);
          const marker = L.marker(markerCoords, { icon }).addTo(group);

          if (m.popupContent || m.label || m.name) {
            const content = m.popupContent || `
              <div>
                <strong style="color: #059669; font-size: 0.9rem;">${m.label || m.name || 'Hamlet'}</strong>
                ${m.count ? `<p style="margin: 4px 0 0; color: #111827; font-weight: 700; font-size: 0.8rem;">${m.count} Consolidated Orders</p>` : ''}
                ${m.description ? `<p style="margin: 4px 0 0; color: #4B5563; font-size: 0.75rem;">${m.description}</p>` : ''}
              </div>
            `;
            marker.bindPopup(content);
          }

          if (typeof m.onClick === 'function') {
            marker.on('click', () => m.onClick(m));
          }
        });
      }
    }

    updateLayers();

    return () => {
      isMounted = false;
    };
  }, [markers, radiusKm, activeRoute, normalizedCenter[0], normalizedCenter[1]]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {!isLoaded && (
        <div className={`map-skeleton-placeholder ${className}`}>
          {loadError ? (
            <span style={{ color: '#DC2626' }}>⚠️ Map Error: {loadError}</span>
          ) : (
            <span>🗺️ Loading Rural Batch Logistics Map...</span>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className={className}
        style={{
          ...style,
          display: isLoaded ? 'block' : 'none',
        }}
        role="region"
        aria-label="Rural Logistics Map"
      />
    </div>
  );
}
