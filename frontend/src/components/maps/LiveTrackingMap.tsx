'use client';

import { useEffect, useRef } from 'react';
import type { LiveRider } from '@/types';
import { getRiderColor, vehicleIcon } from '@/lib/utils';

interface Props {
  riders: LiveRider[];
  selectedRiderId: number | null;
  mapId?: string;
}

const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219];

const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR  = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>';

function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export default function LiveTrackingMap({ riders, selectedRiderId, mapId = 'live-tracking-map' }: Props) {
  const mapRef      = useRef<any>(null);
  const tileRef     = useRef<any>(null);
  const markersRef  = useRef<Map<number, any>>(new Map());
  const containerId = mapId;

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      const container = document.getElementById(containerId);
      if (!container || (container as any)._leaflet_id) return;

      const map = L.map(containerId).setView(DEFAULT_CENTER, 12);
      mapRef.current = map;

      tileRef.current = L.tileLayer(isDark() ? TILE_DARK : TILE_LIGHT, {
        attribution: TILE_ATTR,
        maxZoom: 19,
      }).addTo(map);
    };

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileRef.current = null;
        markersRef.current.clear();
      }
    };
  }, [containerId]);

  // Watch theme changes via MutationObserver on <html> classList
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

  // Update markers on rider data change
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    const updateMarkers = async () => {
      const L   = (await import('leaflet')).default;
      const map = mapRef.current;

      riders.forEach((lr, i) => {
        if (!lr.latest_location) return;
        const { latitude, longitude } = lr.latest_location;
        const color      = getRiderColor(i);
        const isSelected = lr.rider.id === selectedRiderId;

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${isSelected ? 44 : 36}px;
            height:${isSelected ? 44 : 36}px;
            border-radius:50%;
            background:${color}${isSelected ? '40' : '20'};
            border:${isSelected ? '3px' : '2px'} solid ${color};
            display:flex;align-items:center;justify-content:center;
            font-size:${isSelected ? '18px' : '14px'};
            box-shadow:${isSelected ? `0 0 0 6px ${color}20` : 'none'};
            transition:all 0.3s;
          ">${vehicleIcon(lr.rider.vehicle_type)}</div>`,
          iconSize:   [isSelected ? 44 : 36, isSelected ? 44 : 36],
          iconAnchor: [isSelected ? 22 : 18, isSelected ? 22 : 18],
        });

        const existing = markersRef.current.get(lr.route_id);
        if (existing) {
          existing.setLatLng([latitude, longitude]);
          existing.setIcon(icon);
        } else {
          const marker = L.marker([latitude, longitude], { icon })
            .bindPopup(`
              <div style="font-size:12px;min-width:160px;">
                <strong>${lr.rider.name}</strong><br/>
                ${lr.completed_stops}/${lr.total_stops} stops complete<br/>
                ${lr.current_stop ? `Now: ${lr.current_stop.facility?.name ?? '—'}` : 'Heading to depot'}
              </div>
            `)
            .addTo(map);
          markersRef.current.set(lr.route_id, marker);
        }
      });

      if (selectedRiderId) {
        const sel = riders.find((r) => r.rider.id === selectedRiderId);
        if (sel?.latest_location) {
          map.panTo([sel.latest_location.latitude, sel.latest_location.longitude]);
        }
      }
    };

    updateMarkers();
  }, [riders, selectedRiderId]);

  return (
    <div
      id={containerId}
      style={{ width: '100%', height: '100%', background: isDark() ? '#111827' : '#e8edf2' }}
    />
  );
}
