'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Props {
  lat: number;
  lng: number;
  radius: number; // km
  onPinMove: (lat: number, lng: number) => void;
}

export default function CoverageMap({ lat, lng, radius, onPinMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markerRef    = useRef<L.Marker | null>(null);
  const circleRef    = useRef<L.Circle | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([lat, lng], 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: '',
      html: `<div style="width:22px;height:22px;background:#4F6EF7;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:grab;"></div>`,
      iconAnchor: [11, 11],
    });

    const marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
    marker.on('dragend', (e) => {
      const pos = (e.target as L.Marker).getLatLng();
      onPinMove(pos.lat, pos.lng);
    });

    const circle = L.circle([lat, lng], {
      radius: radius * 1000,
      color: '#4F6EF7',
      fillColor: '#4F6EF7',
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(map);

    mapRef.current    = map;
    markerRef.current = marker;
    circleRef.current = circle;

    return () => {
      map.remove();
      mapRef.current    = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync position + radius changes
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return;
    const pos: L.LatLngExpression = [lat, lng];
    markerRef.current.setLatLng(pos);
    circleRef.current.setLatLng(pos);
    circleRef.current.setRadius(radius * 1000);
    mapRef.current.panTo(pos, { animate: true, duration: 0.5 });
  }, [lat, lng, radius]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
