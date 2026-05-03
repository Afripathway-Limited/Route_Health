'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, Camera, MessageSquare, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MOCK_ROUTES_NORM as MOCK_ROUTES, MOCK_RIDERS_NORM as MOCK_RIDERS, MOCK_FACILITIES } from '@/lib/mock-data';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const RouteDetailMap = dynamic(() => import('@/components/maps/RouteDetailMap'), { ssr: false });

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'brand',
  completed: 'success',
  planned: 'warning',
  assigned: 'warning',
  cancelled: 'danger',
};

const STOP_STATUS_COLORS: Record<string, string> = {
  pending: 'var(--text-muted)',
  arrived: 'var(--brand)',
  in_progress: 'var(--brand)',
  collected: 'var(--success)',
  completed: 'var(--success)',
  failed: 'var(--danger)',
  disputed: 'var(--danger)',
};

const MOCK_PHOTO = 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&q=80';

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [photoStopId, setPhotoStopId] = useState<number | null>(null);

  const route = MOCK_ROUTES.find(r => r.id === Number(id));

  if (!route) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4" style={{ minHeight: 300 }}>
        <p className="text-[15px] font-medium" style={{ color: 'var(--text-secondary)' }}>Route not found</p>
        <button onClick={() => router.back()} className="text-[13px]" style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Go back
        </button>
      </div>
    );
  }

  const rider = MOCK_RIDERS.find(r => r.id === route.rider_id);
  const pct = route.total_stops > 0 ? Math.round((route.completed_stops / route.total_stops) * 100) : 0;
  const photoStop = photoStopId !== null ? route.stops.find((s: any) => s.id === photoStopId) : null;

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
            {rider ? `${rider.name} · ` : ''}{route.date} · {route.total_distance_km ?? '—'} km
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[22px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{pct}%</p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{route.completed_stops}/{route.total_stops} stops</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Timeline */}
        <div className="space-y-3">
          {route.stops.map((stop: any, i: number) => {
            const fac = MOCK_FACILITIES.find(f => f.id === stop.facility_id);
            const isFailed = stop.status === 'failed' || stop.status === 'disputed';
            const isLate = (stop.delay_minutes ?? 0) > 5;
            const dotColor = STOP_STATUS_COLORS[stop.status] ?? 'var(--text-muted)';
            const hasPhoto = ['collected', 'completed', 'failed'].includes(stop.status);

            return (
              <div key={stop.id ?? i}
                className="rounded-[14px] overflow-hidden"
                style={{
                  background: 'var(--bg-surface)',
                  boxShadow: 'var(--shadow-card)',
                  border: isFailed ? '1.5px solid var(--danger-border)' : '1px solid var(--border-subtle)',
                }}>
                <div className="flex items-start gap-4 p-4">
                  {/* Sequence dot */}
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
                          {fac?.name ?? stop.facility_name ?? '—'}
                        </p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {(fac as any)?.city ?? 'Nairobi'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                          Planned: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{stop.planned_arrival}</span>
                        </p>
                        {stop.actual_arrival && (
                          <p className="text-[11px] mt-0.5" style={{ color: isLate ? 'var(--warning)' : 'var(--success)' }}>
                            Actual: {stop.actual_arrival}
                            {stop.delay_minutes != null && (
                              <span className="ml-1">
                                {stop.delay_minutes > 0 ? `(+${stop.delay_minutes}m)` : `(${stop.delay_minutes}m)`}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                      <Badge color={isFailed ? 'danger' : stop.status === 'collected' || stop.status === 'completed' ? 'success' : 'gray'}>
                        {stop.status.replace(/_/g, ' ')}
                      </Badge>
                      {stop.whatsapp_sent && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--success)' }}>
                          <MessageSquare size={10} /> WA sent
                        </span>
                      )}
                      {stop.confirmed && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--success)' }}>
                          <CheckCircle2 size={10} /> Confirmed
                        </span>
                      )}
                    </div>

                    {isFailed && stop.fail_reason && (
                      <div className="mt-2 px-3 py-2 rounded-[8px] text-[12px]"
                        style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}>
                        <strong>Reason:</strong> {stop.fail_reason}
                      </div>
                    )}

                    {hasPhoto && (
                      <button onClick={() => setPhotoStopId(stop.id ?? i)}
                        className="flex items-center gap-1.5 mt-2 text-[12px] font-medium transition-colors"
                        style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Camera size={12} /> View custody photos
                      </button>
                    )}
                  </div>
                </div>
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
              { label: 'Rider', value: rider?.name ?? '—' },
              { label: 'Date', value: route.date },
              { label: 'Distance', value: route.total_distance_km ? `${route.total_distance_km} km` : '—' },
              { label: 'Total Stops', value: String(route.total_stops) },
              { label: 'Completed', value: String(route.completed_stops) },
              { label: 'Failed', value: String(route.stops.filter((s: any) => s.status === 'failed').length) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-[13px]">
                <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Photo lightbox */}
      {photoStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setPhotoStopId(null)}>
          <div className="w-full max-w-xl rounded-[20px] overflow-hidden"
            style={{ background: 'var(--bg-surface)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Chain of Custody — {MOCK_FACILITIES.find(f => f.id === photoStop.facility_id)?.name ?? 'Stop'}
              </h3>
              <button onClick={() => setPhotoStopId(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={14} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              {(['Pickup', 'Delivery'] as const).map(type => (
                <div key={type}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    {type} Photo
                  </p>
                  <img src={MOCK_PHOTO} alt={type} className="w-full h-[140px] object-cover rounded-[10px]" />
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    {photoStop.actual_arrival ?? photoStop.planned_arrival} · GPS verified
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
