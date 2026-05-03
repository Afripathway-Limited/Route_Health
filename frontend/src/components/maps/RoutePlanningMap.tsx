'use client';

import { useEffect, useRef } from 'react';
import type { OptimizationResult, Rider } from '@/types';
import { getRiderColor } from '@/lib/utils';
import { post } from '@/lib/api';

interface Props {
  optimizationResult: OptimizationResult | null;
  riders: Rider[];
  mapId?: string;
}

const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219];

const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR  = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>';

function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

async function fetchRoadPolyline(stops: [number, number][]): Promise<[number, number][] | null> {
  try {
    const res = await post<{ points: [number, number][] }>('/maps/directions', { stops });
    return (res as any)?.points ?? null;
  } catch {
    return null;
  }
}

export default function RoutePlanningMap({ optimizationResult, riders, mapId = 'route-planning-map' }: Props) {
  const mapRef     = useRef<any>(null);
  const tileRef    = useRef<any>(null);
  const containerId = mapId;

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let map: any;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const container = document.getElementById(containerId);
      if (!container || (container as any)._leaflet_id) return;

      map = L.map(containerId, { zoomControl: true }).setView(DEFAULT_CENTER, 12);
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

  // Draw routes when optimization result changes
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    if (!optimizationResult) return;

    const drawRoutes = async () => {
      const L   = (await import('leaflet')).default;
      const map = mapRef.current;

      map.eachLayer((layer: any) => {
        if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
      });

      const allPoints: [number, number][] = [];

      await Promise.all(optimizationResult.riders.map(async (rr, i) => {
        const color  = getRiderColor(i);
        const coords: [number, number][] = rr.stops.map((s) => [s.latitude, s.longitude]);

        if (coords.length > 1) {
          // Try to get road-following polyline from backend proxy
          const roadPoints = await fetchRoadPolyline(coords);
          const lineCoords: [number, number][] = roadPoints ?? coords;

          L.polyline(lineCoords, {
            color,
            weight: roadPoints ? 4 : 3,
            opacity: 0.85,
            ...(roadPoints ? {} : { dashArray: '6 4' }),
          }).addTo(map);
        }

        rr.stops.forEach((stop) => {
          allPoints.push([stop.latitude, stop.longitude]);

          const icon = L.divIcon({
            className: '',
            html: `<div style="
              width:28px;height:28px;border-radius:50%;
              background:${color}22;border:2px solid ${color};
              display:flex;align-items:center;justify-content:center;
              color:${color};font-size:11px;font-weight:700;
            ">${stop.sequence}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          L.marker([stop.latitude, stop.longitude], { icon })
            .bindPopup(`
              <div style="font-size:12px;min-width:160px;">
                <strong>${stop.facility_name}</strong><br/>
                ${stop.facility_city}<br/>
                ETA: ${stop.planned_arrival?.slice(11, 16)}<br/>
                Type: ${stop.type}
              </div>
            `)
            .addTo(map);
        });
      }));

      if (allPoints.length > 0) {
        map.fitBounds(allPoints, { padding: [40, 40] });
      }
    };

    drawRoutes();
  }, [optimizationResult]);

  return (
    <div
      id={containerId}
      style={{ width: '100%', height: '100%', background: isDark() ? '#111827' : '#e8edf2' }}
    />
  );
}
