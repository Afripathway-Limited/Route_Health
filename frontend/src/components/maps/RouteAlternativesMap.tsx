'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export interface RouteStop {
  taskId: number;
  label: string;
  lat: number;
  lng: number;
}

interface Props {
  origin: { lat: number; lng: number; label: string };
  stops: RouteStop[];
  destination: { lat: number; lng: number; label: string };
  selectedRouteIdx: number;
  onRoutesLoaded: (routes: google.maps.DirectionsRoute[]) => void;
}

export default function RouteAlternativesMap({ origin, stops, destination, selectedRouteIdx, onRoutesLoaded }: Props) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: API_KEY, id: 'rh-google-maps', libraries: GOOGLE_MAPS_LIBRARIES });
  const [routes, setRoutes] = useState<google.maps.DirectionsRoute[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const onRoutesLoadedRef = useRef(onRoutesLoaded);

  useEffect(() => { onRoutesLoadedRef.current = onRoutesLoaded; });

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  useEffect(() => {
    if (!isLoaded || stops.length === 0) return;

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        waypoints: stops.map(s => ({ location: { lat: s.lat, lng: s.lng }, stopover: true })),
        provideRouteAlternatives: true,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result?.routes?.length) {
          setRoutes(result.routes);
          onRoutesLoadedRef.current(result.routes);
          if (mapRef.current) {
            const bounds = new google.maps.LatLngBounds();
            result.routes[0].overview_path.forEach(p => bounds.extend(p));
            bounds.extend({ lat: origin.lat, lng: origin.lng });
            mapRef.current.fitBounds(bounds, 48);
          }
        } else {
          onRoutesLoadedRef.current([]);
        }
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, origin.lat, origin.lng, destination.lat, destination.lng, stops.length]);

  if (!isLoaded) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>Loading map…</p>
      </div>
    );
  }

  return (
    <GoogleMap
      onLoad={onLoad}
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={{ lat: origin.lat, lng: origin.lng }}
      zoom={12}
      options={{ zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      {/* Depot / origin marker (green) */}
      <Marker
        position={{ lat: origin.lat, lng: origin.lng }}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#059669',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        }}
        title={origin.label}
      />

      {/* Task stop markers (blue, numbered) */}
      {stops.map((s, i) => (
        <Marker
          key={s.taskId}
          position={{ lat: s.lat, lng: s.lng }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#4F6EF7',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          }}
          label={{ text: String(i + 1), fontSize: '11px', fontWeight: 'bold', color: '#fff' }}
          title={s.label}
        />
      ))}

      {/* Route polylines — selected thick/blue, others thin/gray */}
      {routes.map((route, idx) => {
        const isSelected = idx === selectedRouteIdx;
        const path = route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
        return (
          <Polyline
            key={idx}
            path={path}
            options={{
              strokeColor: isSelected ? '#4F6EF7' : '#9ca3af',
              strokeWeight: isSelected ? 5 : 2,
              strokeOpacity: isSelected ? 0.9 : 0.4,
              zIndex: isSelected ? 10 : 1,
            }}
          />
        );
      })}
    </GoogleMap>
  );
}
