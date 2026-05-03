'use client';

import { useState, useEffect } from 'react';
import { Navigation, Clock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MOCK_ROUTES_NORM as MOCK_ROUTES, MOCK_RIDERS_NORM as MOCK_RIDERS, MOCK_FACILITIES, MOCK_RIDER_POSITIONS } from '@/lib/mock-data';
import dynamic from 'next/dynamic';

const LiveTrackingMap = dynamic(() => import('@/components/maps/LiveTrackingMap'), { ssr: false });

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  active:     { label: 'On Route',    color: 'brand',   dot: 'var(--brand)' },
  completed:  { label: 'Completed',   color: 'success', dot: 'var(--success)' },
  inactive:   { label: 'Off Duty',    color: 'gray',    dot: 'var(--text-muted)' },
};

const STOP_STATUS_COLORS: Record<string, string> = {
  pending:    'var(--text-muted)',
  arrived:    'var(--brand)',
  collected:  'var(--success)',
  completed:  'var(--success)',
  failed:     'var(--danger)',
  disputed:   'var(--danger)',
};

export default function LiveTrackingPage() {
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setLastUpdate(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const riderCards = MOCK_RIDERS.filter(r => r.is_active).map(r => {
    const route = MOCK_ROUTES.find((ro: any) => ro.rider_id === r.id);
    const completedStops = route?.stops.filter((s: any) => ['completed', 'collected'].includes(s.status)).length ?? 0;
    const totalStops = route?.stops.length ?? 0;
    return { rider: r, route, completedStops, totalStops };
  });

  const selectedRider = riderCards.find(rc => rc.rider.id === selectedRiderId);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Left panel */}
      <div className="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>

        {/* Header */}
        <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between">
            <h1 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Live Tracking</h1>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
              Auto-refresh
            </div>
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Updated {lastUpdate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Rider list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {riderCards.map(({ rider, route, completedStops, totalStops }) => {
            const isSelected = selectedRiderId === rider.id;
            const status = (rider as any).status ?? (rider as any).current_status ?? (rider.is_active ? 'active' : 'inactive');
            const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
            const progressPct = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;
            const nextStop = route?.stops.find((s: any) => !['completed', 'collected', 'failed'].includes(s.status));
            const nextFac = nextStop ? MOCK_FACILITIES.find(f => f.id === (nextStop as any).facility_id) : null;

            return (
              <button
                key={rider.id}
                onClick={() => { setSelectedRiderId(rider.id); setDrawerOpen(true); }}
                className="w-full rounded-[12px] p-3.5 transition-all text-left"
                style={{
                  background: isSelected ? 'var(--brand-subtle)' : 'var(--bg-subtle)',
                  border: `1.5px solid ${isSelected ? 'var(--brand-border)' : 'transparent'}`,
                  cursor: 'pointer',
                }}>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold"
                      style={{ background: isSelected ? 'var(--brand)' : 'var(--bg-surface)', color: isSelected ? '#fff' : 'var(--text-secondary)' }}>
                      {rider.name.charAt(0)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                      style={{ background: statusCfg.dot }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{rider.name}</p>
                      <Badge color={statusCfg.color as any}>{statusCfg.label}</Badge>
                    </div>
                    {nextFac && (
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                        Next: {nextFac.name}
                      </p>
                    )}
                  </div>
                </div>
                {totalStops > 0 && (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {completedStops}/{totalStops} stops
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{progressPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${progressPct}%`, background: progressPct === 100 ? 'var(--success)' : 'var(--brand)' }} />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="hidden lg:flex flex-1 relative" style={{ background: 'var(--bg-page)' }}>
        {(() => { const M = LiveTrackingMap as any; return <M riders={MOCK_RIDER_POSITIONS} selectedRiderId={selectedRiderId} />; })()}
      </div>

      {/* Route detail drawer (desktop) */}
      {selectedRider && (
        <div className="hidden lg:flex w-[320px] flex-shrink-0 flex-col overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)' }}>
          <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {selectedRider.rider.name}
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {selectedRider.completedStops}/{selectedRider.totalStops} stops completed
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {selectedRider.route?.stops.map((stop: any, i: number) => {
              const fac = MOCK_FACILITIES.find(f => f.id === stop.facility_id);
              const dotColor = STOP_STATUS_COLORS[stop.status] ?? 'var(--text-muted)';
              return (
                <div key={stop.id} className="flex gap-3 py-2">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: dotColor }}>{i + 1}</div>
                    {i < (selectedRider.route?.stops.length ?? 0) - 1 && (
                      <div className="w-0.5 flex-1 mt-1" style={{ background: 'var(--border-subtle)', minHeight: 12 }} />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{fac?.name ?? '—'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {stop.planned_arrival}
                      </span>
                      <Badge color={stop.status === 'completed' ? 'success' : stop.status === 'failed' ? 'danger' : 'gray'}>
                        {stop.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
