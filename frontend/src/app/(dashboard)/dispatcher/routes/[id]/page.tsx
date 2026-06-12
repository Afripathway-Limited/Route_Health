'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, Camera, MessageSquare, X, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

const RouteDetailMap = dynamic(() => import('@/components/maps/RouteDetailMap'), { ssr: false });

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'brand', completed: 'success',
  planned: 'warning', assigned: 'warning', cancelled: 'danger',
};

interface StopFacility {
  id: number; name: string; city: string;
  latitude: number; longitude: number;
}

interface StopPhoto {
  url: string; thumbnail_url: string | null;
  taken_at: string; latitude: number; longitude: number;
}

interface Stop {
  id: number; sequence: number; status: string;
  facility: StopFacility | null;
  planned_arrival: string; actual_arrival: string | null;
  delay_minutes: number | null;
  fail_reason: string | null; fail_notes: string | null;
  whatsapp_sent: boolean;
  pickup_photo: StopPhoto | null;
  delivery_photo: StopPhoto | null;
  whatsapp_confirmation: { response: string; received_at: string } | null;
}

interface RouteDetail {
  id: number; date: string; status: string;
  total_distance_km: number | null;
  completed_stops: number; total_stops: number;
  depot_latitude: number | null; depot_longitude: number | null;
  rider: { id: number; name: string; vehicle_type: string } | null;
  stops: Stop[];
  driver_locations: { latitude: number; longitude: number; recorded_at: string }[];
}

const STOP_DOT: Record<string, string> = {
  pending: 'var(--text-muted)', arrived: 'var(--brand)', in_progress: 'var(--brand)',
  collected: 'var(--success)', delivered: 'var(--success)', confirmed_delivered: 'var(--success)',
  failed: 'var(--danger)', disputed: 'var(--danger)',
};

function formatTime(dt: string | null) {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }); }
  catch { return dt; }
}

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [expandedStop, setExpandedStop] = useState<number | null>(null);

  const { data: route, isLoading } = useQuery<RouteDetail>({
    queryKey: ['route', id],
    queryFn: () => get<RouteDetail>(`/routes/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center" style={{ minHeight: 300 }}>
        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Loading route…</p>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4" style={{ minHeight: 300 }}>
        <p className="text-[15px] font-medium" style={{ color: 'var(--text-secondary)' }}>Route not found</p>
        <button onClick={() => router.back()} className="text-[13px]"
          style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Go back
        </button>
      </div>
    );
  }

  const pct = route.total_stops > 0 ? Math.round((route.completed_stops / route.total_stops) * 100) : 0;

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Route #{route.id}
            </h1>
            <Badge color={STATUS_COLORS[route.status] as any}>
              {route.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {route.rider ? `${route.rider.name} · ` : ''}{route.date} · {route.total_distance_km ?? '—'} km
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[22px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{pct}%</p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{route.completed_stops}/{route.total_stops} stops</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Stop timeline */}
        <div className="space-y-3">
          {route.stops.length === 0 ? (
            <div className="rounded-[14px] p-8 text-center" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No stops on this route</p>
            </div>
          ) : route.stops.map((stop, i) => {
            const isFailedOrDisputed = stop.status === 'failed' || stop.status === 'disputed';
            const delay = stop.delay_minutes ?? 0;
            const delayColor = delay <= 0 ? 'var(--success)' : delay <= 30 ? 'var(--warning)' : 'var(--danger)';
            const dotColor = STOP_DOT[stop.status] ?? 'var(--text-muted)';
            const isExpanded = expandedStop === stop.id;
            const hasPhotos = stop.pickup_photo || stop.delivery_photo;

            return (
              <div key={stop.id}
                className="rounded-[14px] overflow-hidden"
                style={{
                  background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)',
                  border: isFailedOrDisputed ? '1.5px solid var(--danger-border)' : '1px solid var(--border-subtle)',
                }}>
                <div className="flex items-start gap-4 p-4">
                  <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                      style={{ background: dotColor }}>
                      {stop.sequence}
                    </div>
                    {i < route.stops.length - 1 && (
                      <div className="w-0.5 flex-1 mt-1.5" style={{ background: 'var(--border-subtle)', minHeight: 16 }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {stop.facility?.name ?? '—'}
                        </p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {stop.facility?.city ?? ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                          Planned: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatTime(stop.planned_arrival)}</span>
                        </p>
                        {stop.actual_arrival && (
                          <p className="text-[11px] mt-0.5" style={{ color: delayColor }}>
                            Actual: {formatTime(stop.actual_arrival)}
                            {delay !== 0 && <span className="ml-1">({delay > 0 ? `+${delay}m` : `${delay}m`})</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                      <Badge color={isFailedOrDisputed ? 'danger' : ['collected','delivered','confirmed_delivered'].includes(stop.status) ? 'success' : 'gray'}>
                        {stop.status.replace(/_/g, ' ')}
                      </Badge>
                      {stop.whatsapp_sent && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--success)' }}>
                          <MessageSquare size={10} /> WA sent
                        </span>
                      )}
                      {stop.whatsapp_confirmation && (
                        <span className="flex items-center gap-1 text-[11px]"
                          style={{ color: stop.whatsapp_confirmation.response === 'yes' ? 'var(--success)' : 'var(--danger)' }}>
                          <CheckCircle2 size={10} />
                          {stop.whatsapp_confirmation.response === 'yes' ? 'Confirmed' : 'Disputed'}
                        </span>
                      )}
                    </div>

                    {isFailedOrDisputed && stop.fail_reason && (
                      <div className="mt-2 px-3 py-2 rounded-[8px] text-[12px]"
                        style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}>
                        <strong>Reason:</strong> {stop.fail_reason}
                        {stop.fail_notes && <p className="mt-0.5 opacity-80">{stop.fail_notes}</p>}
                      </div>
                    )}

                    {hasPhotos && (
                      <button onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                        className="flex items-center gap-1.5 mt-2 text-[12px] font-medium transition-colors"
                        style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Camera size={12} /> {isExpanded ? 'Hide' : 'View'} custody photos
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded photos */}
                {isExpanded && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    {[
                      { label: 'Pickup Photo', photo: stop.pickup_photo },
                      { label: 'Delivery Photo', photo: stop.delivery_photo },
                    ].map(({ label, photo }) => (
                      <div key={label} className="pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                        {photo ? (
                          <>
                            <img src={photo.thumbnail_url ?? photo.url} alt={label}
                              className="w-full h-[120px] object-cover rounded-[8px] cursor-pointer"
                              onClick={() => window.open(photo.url, '_blank')} />
                            <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                              <MapPin size={9} /> {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                            </p>
                            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{formatTime(photo.taken_at)}</p>
                          </>
                        ) : (
                          <div className="h-[120px] rounded-[8px] flex items-center justify-center"
                            style={{ background: 'var(--bg-subtle)' }}>
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No photo</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: map + summary */}
        <div className="space-y-4">
          <div className="rounded-[14px] overflow-hidden" style={{ height: 320, boxShadow: 'var(--shadow-card)' }}>
            <RouteDetailMap route={route as any} />
          </div>

          <div className="rounded-[14px] p-4 space-y-3" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Route Summary</h3>
            {[
              { label: 'Rider',      value: route.rider?.name ?? '—' },
              { label: 'Date',       value: route.date },
              { label: 'Distance',   value: route.total_distance_km ? `${route.total_distance_km} km` : '—' },
              { label: 'Total Stops', value: String(route.total_stops) },
              { label: 'Completed',  value: String(route.completed_stops) },
              { label: 'Failed',     value: String(route.stops.filter(s => s.status === 'failed').length) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-[13px]">
                <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
