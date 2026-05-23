'use client';

import { useCallback, useEffect, useState } from 'react';
import { GoogleMap, Polyline, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import type { RouteDetail } from '@/types';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 };
const BRAND_COLOR = '#4F6EF7';

const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

interface Props {
  route: RouteDetail;
}

function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export default function RouteDetailMap({ route }: Props) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: API_KEY, id: 'rh-google-maps', libraries: GOOGLE_MAPS_LIBRARIES });
  const [dark, setDark] = useState(isDark());
  const [openPopup, setOpenPopup] = useState<number | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const stops = route.stops ?? [];

  const polylinePath = stops
    .filter(s => s.facility?.latitude && s.facility?.longitude)
    .sort((a, b) => a.sequence - b.sequence)
    .map(s => ({ lat: s.facility!.latitude, lng: s.facility!.longitude }));

  const gpsPath = ((route as any).driver_locations ?? [])
    .map((l: any) => ({ lat: l.latitude, lng: l.longitude }));

  const center = route.depot_latitude && route.depot_longitude
    ? { lat: route.depot_latitude, lng: route.depot_longitude }
    : DEFAULT_CENTER;

  const onLoad = useCallback((map: google.maps.Map) => {
    if (polylinePath.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      polylinePath.forEach(p => bounds.extend(p));
      map.fitBounds(bounds, 30);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.id]);

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
      center={center}
      zoom={12}
      options={{
        styles: dark ? DARK_STYLES : undefined,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {/* Planned route line */}
      {polylinePath.length > 1 && (
        <Polyline
          path={polylinePath}
          options={{ strokeColor: BRAND_COLOR, strokeWeight: 3, strokeOpacity: 0.8 }}
        />
      )}

      {/* GPS breadcrumb trail */}
      {gpsPath.length > 1 && (
        <Polyline
          path={gpsPath}
          options={{
            strokeColor: '#8B5CF6',
            strokeWeight: 2,
            strokeOpacity: 0,
            icons: [{
              icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.5, scale: 2, strokeColor: '#8B5CF6' },
              offset: '0',
              repeat: '8px',
            }],
          }}
        />
      )}

      {/* Stop markers */}
      {stops.map(stop => {
        if (!stop.facility?.latitude) return null;
        const isFailed = stop.status === 'failed' || stop.status === 'disputed';
        const pinColor = isFailed ? '#EF4444' : BRAND_COLOR;

        return (
          <Marker
            key={stop.sequence}
            position={{ lat: stop.facility.latitude, lng: stop.facility.longitude }}
            onClick={() => setOpenPopup(openPopup === stop.sequence ? null : stop.sequence)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 11,
              fillColor: pinColor,
              fillOpacity: 0.2,
              strokeColor: pinColor,
              strokeWeight: 2,
            }}
            label={{
              text: String(stop.sequence),
              color: pinColor,
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {openPopup === stop.sequence && (
              <InfoWindow
                position={{ lat: stop.facility.latitude, lng: stop.facility.longitude }}
                onCloseClick={() => setOpenPopup(null)}
              >
                <div style={{ fontSize: 12 }}>
                  <strong>{stop.facility.name}</strong><br />
                  {stop.status.replace(/_/g, ' ')}
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}
    </GoogleMap>
  );
}
