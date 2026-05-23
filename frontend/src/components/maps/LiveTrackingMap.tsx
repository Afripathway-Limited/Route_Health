'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import type { LiveRider, AllRider } from '@/types';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps';
import { getRiderColor, vehicleIcon } from '@/lib/utils';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 };

const AVAIL_COLORS: Record<string, string> = {
  free: '#059669', on_route: '#4F6EF7', busy: '#f59e0b', unavailable: '#9ca3af',
};

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

const LIGHT_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

interface Props {
  riders: LiveRider[];
  allRiders: AllRider[];
  selectedRiderId: number | null;
}

function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export default function LiveTrackingMap({ riders, allRiders, selectedRiderId }: Props) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: API_KEY, id: 'rh-google-maps', libraries: GOOGLE_MAPS_LIBRARIES });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [dark, setDark] = useState(isDark());
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Pan to selected rider — live riders first, then coverage-based
  useEffect(() => {
    if (!mapRef.current || !selectedRiderId) return;
    const live = riders.find(r => r.rider.id === selectedRiderId);
    if (live?.latest_location) {
      mapRef.current.panTo({ lat: live.latest_location.latitude, lng: live.latest_location.longitude });
      return;
    }
    const offline = allRiders.find(r => r.id === selectedRiderId);
    if (offline?.coverage_lat && offline?.coverage_lng) {
      mapRef.current.panTo({ lat: offline.coverage_lat, lng: offline.coverage_lng });
    }
  }, [selectedRiderId, riders, allRiders]);

  if (!isLoaded) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>Loading map…</p>
      </div>
    );
  }

  const liveRiderIds = new Set(riders.map(lr => lr.rider.id));

  return (
    <GoogleMap
      onLoad={onLoad}
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={DEFAULT_CENTER}
      zoom={12}
      options={{
        styles: dark ? DARK_STYLES : LIGHT_STYLES,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {/* ── Active route riders (live GPS) ─────────────────────────────────── */}
      {riders.map((lr, i) => {
        if (!lr.latest_location) return null;
        const { latitude, longitude } = lr.latest_location;
        const color = getRiderColor(i);
        const isSelected = lr.rider.id === selectedRiderId;
        const popupKey = `live-${lr.route_id}`;

        return (
          <Marker
            key={popupKey}
            position={{ lat: latitude, lng: longitude }}
            onClick={() => setOpenPopupId(openPopupId === popupKey ? null : popupKey)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: isSelected ? 14 : 11,
              fillColor: color,
              fillOpacity: isSelected ? 0.3 : 0.15,
              strokeColor: color,
              strokeWeight: isSelected ? 3 : 2,
            }}
            label={{
              text: vehicleIcon(lr.rider.vehicle_type),
              fontSize: isSelected ? '14px' : '11px',
            }}
          >
            {openPopupId === popupKey && (
              <InfoWindow
                position={{ lat: latitude, lng: longitude }}
                onCloseClick={() => setOpenPopupId(null)}
              >
                <div style={{ fontSize: 12, minWidth: 160 }}>
                  <strong>{lr.rider.name}</strong><br />
                  {lr.completed_stops}/{lr.total_stops} stops complete<br />
                  {lr.current_stop
                    ? `Now: ${lr.current_stop.facility?.name ?? '—'}`
                    : 'Heading to depot'}
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}

      {/* ── Offline riders (coverage location) ────────────────────────────── */}
      {allRiders
        .filter(r => !liveRiderIds.has(r.id) && r.coverage_lat && r.coverage_lng)
        .map(r => {
          const isSelected = r.id === selectedRiderId;
          const color = AVAIL_COLORS[r.availability_status] ?? '#9ca3af';
          const popupKey = `offline-${r.id}`;

          return (
            <Marker
              key={popupKey}
              position={{ lat: r.coverage_lat!, lng: r.coverage_lng! }}
              onClick={() => setOpenPopupId(openPopupId === popupKey ? null : popupKey)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: isSelected ? 12 : 9,
                fillColor: color,
                fillOpacity: isSelected ? 0.9 : 0.6,
                strokeColor: '#fff',
                strokeWeight: isSelected ? 2.5 : 1.5,
              }}
              label={{
                text: vehicleIcon(r.vehicle_type),
                fontSize: isSelected ? '13px' : '10px',
              }}
            >
              {openPopupId === popupKey && (
                <InfoWindow
                  position={{ lat: r.coverage_lat!, lng: r.coverage_lng! }}
                  onCloseClick={() => setOpenPopupId(null)}
                >
                  <div style={{ fontSize: 12, minWidth: 140 }}>
                    <strong>{r.name}</strong><br />
                    {r.vehicle_type}<br />
                    {r.coverage_city && <>{r.coverage_city}<br /></>}
                    Status: {r.availability_status === 'free' ? 'Available' : r.availability_status}
                  </div>
                </InfoWindow>
              )}
            </Marker>
          );
        })}
    </GoogleMap>
  );
}
