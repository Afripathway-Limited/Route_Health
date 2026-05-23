'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, Polyline, Marker, Circle, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import type { OptimizationResult } from '@/types';
import { getRiderColor } from '@/lib/utils';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps';
import { post } from '@/lib/api';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 };
const DEFAULT_RADIUS_KM = 30;

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

interface OrgServiceArea {
  lat: number;
  lng: number;
  radius_km: number;
}

interface MapRider {
  id: number;
  name: string;
  vehicle_type: string;
  availability_status: string;
  coverage_lat: number | null;
  coverage_lng: number | null;
}

interface Props {
  optimizationResult: OptimizationResult | null;
  riders: MapRider[];
  orgServiceArea?: OrgServiceArea | null;
  mapId?: string;
}

interface RouteData {
  color: string;
  path: google.maps.LatLngLiteral[];
  dashed: boolean;
  stops: {
    lat: number;
    lng: number;
    sequence: number;
    color: string;
    name: string;
    city: string;
    eta: string;
    type: string;
  }[];
}

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

export default function RoutePlanningMap({ optimizationResult, riders, orgServiceArea }: Props) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: API_KEY, id: 'rh-google-maps', libraries: GOOGLE_MAPS_LIBRARIES });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [dark, setDark] = useState(isDark());
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [openPopup, setOpenPopup] = useState<string | null>(null);

  const center = orgServiceArea
    ? { lat: orgServiceArea.lat, lng: orgServiceArea.lng }
    : DEFAULT_CENTER;

  const radiusMeters = (orgServiceArea?.radius_km ?? DEFAULT_RADIUS_KM) * 1000;

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Fit to org service area on initial load
    if (orgServiceArea) {
      const bounds = new google.maps.LatLngBounds();
      const r = orgServiceArea.radius_km * 1000;
      const latDelta = r / 111320;
      const lngDelta = r / (111320 * Math.cos((orgServiceArea.lat * Math.PI) / 180));
      bounds.extend({ lat: orgServiceArea.lat - latDelta, lng: orgServiceArea.lng - lngDelta });
      bounds.extend({ lat: orgServiceArea.lat + latDelta, lng: orgServiceArea.lng + lngDelta });
      map.fitBounds(bounds, 20);
    }
  }, [orgServiceArea]);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Build route data when optimization result changes
  useEffect(() => {
    if (!optimizationResult) { setRoutes([]); return; }

    const build = async () => {
      const allPoints: google.maps.LatLngLiteral[] = [];
      const newRoutes: RouteData[] = [];

      await Promise.all(optimizationResult.riders.map(async (rr, i) => {
        const color = getRiderColor(i);
        const coords: [number, number][] = rr.stops.map(s => [s.latitude, s.longitude]);

        let path: google.maps.LatLngLiteral[];
        let dashed = false;

        if (coords.length > 1) {
          const roadPts = await fetchRoadPolyline(coords);
          dashed = !roadPts;
          path = (roadPts ?? coords).map(([lat, lng]) => ({ lat, lng }));
        } else {
          path = coords.map(([lat, lng]) => ({ lat, lng }));
          dashed = true;
        }

        const stops = rr.stops.map(stop => {
          allPoints.push({ lat: stop.latitude, lng: stop.longitude });
          return {
            lat: stop.latitude,
            lng: stop.longitude,
            sequence: stop.sequence,
            color,
            name: stop.facility_name,
            city: stop.facility_city,
            eta: stop.planned_arrival?.slice(11, 16) ?? '—',
            type: stop.type,
          };
        });

        newRoutes[i] = { color, path, dashed, stops };
      }));

      setRoutes(newRoutes.filter(Boolean));

      if (allPoints.length > 0 && mapRef.current) {
        const bounds = new google.maps.LatLngBounds();
        allPoints.forEach(p => bounds.extend(p));
        mapRef.current.fitBounds(bounds, 40);
      }
    };

    build();
  }, [optimizationResult]);

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
      zoom={orgServiceArea ? 11 : 12}
      options={{
        styles: dark ? DARK_STYLES : undefined,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {/* Org service area coverage circle */}
      {orgServiceArea && (
        <Circle
          center={{ lat: orgServiceArea.lat, lng: orgServiceArea.lng }}
          radius={radiusMeters}
          options={{
            fillColor: '#4F6EF7',
            fillOpacity: 0.06,
            strokeColor: '#4F6EF7',
            strokeOpacity: 0.35,
            strokeWeight: 1.5,
          }}
        />
      )}

      {/* Rider home markers (shown before optimization) */}
      {!optimizationResult && riders.map((rider, i) => {
        if (!rider.coverage_lat || !rider.coverage_lng) return null;
        const color = getRiderColor(i);
        const key = `rider-${rider.id}`;
        return (
          <Marker
            key={key}
            position={{ lat: rider.coverage_lat, lng: rider.coverage_lng }}
            onClick={() => setOpenPopup(openPopup === key ? null : key)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: color,
              fillOpacity: 0.9,
              strokeColor: '#fff',
              strokeWeight: 2,
            }}
            label={{
              text: rider.name.charAt(0),
              color: '#fff',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {openPopup === key && (
              <InfoWindow
                position={{ lat: rider.coverage_lat!, lng: rider.coverage_lng! }}
                onCloseClick={() => setOpenPopup(null)}
              >
                <div style={{ fontSize: 12, minWidth: 120 }}>
                  <strong>{rider.name}</strong><br />
                  {rider.vehicle_type}<br />
                  <span style={{ color: rider.availability_status === 'free' ? '#059669' : '#f59e0b' }}>
                    {rider.availability_status}
                  </span>
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}

      {/* Optimized routes */}
      {routes.map((route, i) => (
        <span key={i}>
          {route.path.length > 1 && (
            <Polyline
              path={route.path}
              options={{
                strokeColor: route.color,
                strokeWeight: route.dashed ? 3 : 4,
                strokeOpacity: route.dashed ? 0 : 0.85,
                ...(route.dashed ? {
                  icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3, strokeColor: route.color },
                    offset: '0',
                    repeat: '10px',
                  }],
                } : {}),
              }}
            />
          )}
          {route.stops.map(stop => {
            const key = `${i}-${stop.sequence}`;
            return (
              <Marker
                key={key}
                position={{ lat: stop.lat, lng: stop.lng }}
                onClick={() => setOpenPopup(openPopup === key ? null : key)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: stop.color,
                  fillOpacity: 0.2,
                  strokeColor: stop.color,
                  strokeWeight: 2,
                }}
                label={{
                  text: String(stop.sequence),
                  color: stop.color,
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                {openPopup === key && (
                  <InfoWindow
                    position={{ lat: stop.lat, lng: stop.lng }}
                    onCloseClick={() => setOpenPopup(null)}
                  >
                    <div style={{ fontSize: 12, minWidth: 160 }}>
                      <strong>{stop.name}</strong><br />
                      {stop.city}<br />
                      ETA: {stop.eta}<br />
                      Type: {stop.type}
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            );
          })}
        </span>
      ))}
    </GoogleMap>
  );
}
