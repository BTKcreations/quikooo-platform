import React, { useEffect, useRef, useState } from 'react';

export const MAP_PROVIDERS = {
  OSM: 'osm',
  GOOGLE: 'google',
};

const DEFAULT_CENTER_INDIA = [19.076, 72.8777];

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

export default function MapView({
  center = DEFAULT_CENTER_INDIA,
  zoom = 13,
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

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !containerRef.current) return;
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
        console.error('[MapView] Failed to initialize Leaflet:', err);
        if (isMounted) setLoadError(err.message || 'Failed to load map engine');
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

  useEffect(() => {
    let isMounted = true;
    async function updateLayers() {
      if (!mapInstanceRef.current || !layersGroupRef.current) return;
      const L = await import('leaflet');
      if (!isMounted || !mapInstanceRef.current || !layersGroupRef.current) return;

      const group = layersGroupRef.current;
      group.clearLayers();

      if (radiusKm && Number(radiusKm) > 0) {
        L.circle(normalizedCenter, {
          radius: Number(radiusKm) * 1000,
          color: '#059669',
          fillColor: '#10B981',
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '4, 6',
        }).addTo(group);
      }

      if (activeRoute && Array.isArray(activeRoute) && activeRoute.length > 1) {
        const polyPoints = activeRoute.map((pt) => normalizeCoords(pt));
        L.polyline(polyPoints, { color: '#059669', weight: 4, opacity: 0.85 }).addTo(group);
      }

      if (Array.isArray(markers)) {
        markers.forEach((m) => {
          if (!m || (m.lat === undefined && m.latitude === undefined)) return;
          const markerCoords = normalizeCoords(m);
          const marker = L.marker(markerCoords).addTo(group);
          if (m.label || m.name) marker.bindPopup(m.label || m.name);
          if (typeof m.onClick === 'function') marker.on('click', () => m.onClick(m));
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
            <span>🗺️ Loading OpenStreetMap...</span>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className={className}
        style={{ ...style, display: isLoaded ? 'block' : 'none' }}
        role="region"
        aria-label="Interactive Map"
      />
    </div>
  );
}
