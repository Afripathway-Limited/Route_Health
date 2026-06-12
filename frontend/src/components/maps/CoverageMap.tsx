'use client';

import { useCallback, useEffect, useRef } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi',     elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

interface Props {
  lat: number;
  lng: number;
  radius: number; // km
  onPinMove: (lat: number, lng: number) => void;
}

export default function CoverageMap({ lat, lng, radius, onPinMove }: Props) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: API_KEY, id: 'rh-google-maps', libraries: GOOGLE_MAPS_LIBRARIES });
  const mapRef = useRef<google.maps.Map | null>(null);

  // Re-center when lat/lng changes from outside (city search)
  useEffect(() => {
    mapRef.current?.panTo({ lat, lng });
  }, [lat, lng]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) onPinMove(e.latLng.lat(), e.latLng.lng());
  }, [onPinMove]);

  if (!isLoaded) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>Loading map…</p>
      </div>
    );
  }

  return (
    <GoogleMap
      onLoad={onLoad}
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={{ lat, lng }}
      zoom={12}
      options={{
        styles: MAP_STYLES,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      <Marker
        position={{ lat, lng }}
        draggable
        onDragEnd={onDragEnd}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4F6EF7',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        }}
      />
      <Circle
        center={{ lat, lng }}
        radius={radius * 1000}
        options={{
          fillColor: '#4F6EF7',
          fillOpacity: 0.1,
          strokeColor: '#4F6EF7',
          strokeWeight: 2,
          strokeOpacity: 0.8,
        }}
      />
    </GoogleMap>
  );
}
