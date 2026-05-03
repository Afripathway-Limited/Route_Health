'use client';

import { useEffect, useRef } from 'react';
import type { RouteDetail } from '@/types';

interface Props {
  route: RouteDetail;
}

const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR  = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>';

function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export default function RouteDetailMap({ route }: Props) {
  const mapRef      = useRef<any>(null);
  const tileRef     = useRef<any>(null);
  const containerId = `route-detail-map-${route.id ?? 'x'}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      const container = document.getElementById(containerId);
      if (!container || (container as any)._leaflet_id) return;

      const brandColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--brand').trim() || '#10B981';

      const center: [number, number] = route.depot_latitude && route.depot_longitude
        ? [route.depot_latitude, route.depot_longitude]
        : [-1.2921, 36.8219];

      const map = L.map(containerId).setView(center, 12);
      mapRef.current = map;

      tileRef.current = L.tileLayer(isDark() ? TILE_DARK : TILE_LIGHT, {
        attribution: TILE_ATTR,
        maxZoom: 19,
      }).addTo(map);

      const stops = route.stops ?? [];
      const coords: [number, number][] = stops
        .filter((s) => s.facility?.latitude && s.facility?.longitude)
        .sort((a, b) => a.sequence - b.sequence)
        .map((s) => [s.facility!.latitude, s.facility!.longitude]);

      if (coords.length > 1) {
        L.polyline(coords, { color: brandColor, weight: 3, opacity: 0.8 }).addTo(map);
      }

      stops.forEach((stop) => {
        if (!stop.facility?.latitude) return;
        const isFailed = stop.status === 'failed' || stop.status === 'disputed';
        const pinColor = isFailed ? '#EF4444' : brandColor;

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:24px;height:24px;border-radius:50%;
            background:${pinColor}20;
            border:2px solid ${pinColor};
            display:flex;align-items:center;justify-content:center;
            color:${pinColor};font-size:10px;font-weight:700;
          ">${stop.sequence}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        L.marker([stop.facility.latitude, stop.facility.longitude], { icon })
          .bindPopup(`<strong>${stop.facility.name}</strong><br/>${stop.status.replace(/_/g, ' ')}`)
          .addTo(map);
      });

      if ((route as any).driver_locations?.length > 1) {
        const gpsCoords: [number, number][] = (route as any).driver_locations.map((l: any) => [l.latitude, l.longitude]);
        L.polyline(gpsCoords, { color: '#8B5CF6', weight: 2, opacity: 0.5, dashArray: '4 4' }).addTo(map);
      }

      if (coords.length > 0) {
        map.fitBounds(coords, { padding: [30, 30] });
      }
    };

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileRef.current = null;
      }
    };
  }, [route.id]);

  // Watch theme changes and swap tile layer
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver(async () => {
      if (!mapRef.current || !tileRef.current) return;
      const L = (await import('leaflet')).default;
      tileRef.current.remove();
      tileRef.current = L.tileLayer(isDark() ? TILE_DARK : TILE_LIGHT, {
        attribution: TILE_ATTR,
        maxZoom: 19,
      }).addTo(mapRef.current);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      id={containerId}
      style={{ width: '100%', height: '100%', background: isDark() ? '#111827' : '#e8edf2' }}
    />
  );
}
