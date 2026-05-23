'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navigation, AlertTriangle, ChevronRight, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { get } from '@/lib/api';
import type { LiveRider, AllRider } from '@/types';
import dynamic from 'next/dynamic';

const LiveTrackingMap = dynamic(() => import('@/components/maps/LiveTrackingMap'), { ssr: false });

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  in_progress: { label: 'On Route',  color: 'brand',   dot: 'var(--brand)' },
  assigned:    { label: 'Assigned',  color: 'warning', dot: 'var(--warning)' },
  completed:   { label: 'Done',      color: 'success', dot: 'var(--success)' },
  planned:     { label: 'Planned',   color: 'gray',    dot: 'var(--text-muted)' },
};

const AVAIL_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  free:        { label: 'Available',  color: 'success', dot: 'var(--success)' },
  on_route:    { label: 'On Route',   color: 'brand',   dot: 'var(--brand)' },
  busy:        { label: 'Busy',       color: 'warning', dot: 'var(--warning)' },
  unavailable: { label: 'Off Duty',   color: 'gray',    dot: 'var(--text-muted)' },
};

export default function LiveTrackingPage() {
  const [liveRiders, setLiveRiders]         = useState<LiveRider[]>([]);
  const [allRiders, setAllRiders]           = useState<AllRider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate]         = useState(new Date());
  const [loading, setLoading]               = useState(true);

  const fetchLive = useCallback(async () => {
    try {
      const [liveData, riderData] = await Promise.all([
        get<LiveRider[]>('/live/riders'),
        get<AllRider[]>('/riders'),
      ]);
      setLiveRiders(Array.isArray(liveData) ? liveData : []);
      setAllRiders(Array.isArray(riderData) ? riderData : []);
      setLastUpdate(new Date());
    } catch {
      // Silent — don't spam toasts on poll errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  const selectedLiveRider = liveRiders.find(lr => lr.rider.id === selectedRiderId);

  // Riders NOT currently on active routes (for the "All Riders" section)
  const liveRiderIds = new Set(liveRiders.map(lr => lr.rider.id));
  const offlineRiders = allRiders.filter(r => !liveRiderIds.has(r.id));

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>

        <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between">
            <h1 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Live Tracking</h1>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
              Auto-refresh
            </div>
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Updated {lastUpdate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {loading && (
            <div className="py-8 text-center">
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
            </div>
          )}

          {/* ── Active routes section ───────────────────────────────────── */}
          {!loading && liveRiders.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider px-1 mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Active Routes ({liveRiders.length})
              </p>
              <div className="space-y-2">
                {liveRiders.map(lr => {
                  const isSelected = selectedRiderId === lr.rider.id;
                  const statusCfg = STATUS_CONFIG[lr.status] ?? STATUS_CONFIG.planned;
                  const progressPct = lr.completion_percentage;

                  return (
                    <button
                      key={lr.route_id}
                      onClick={() => setSelectedRiderId(isSelected ? null : lr.rider.id)}
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
                            {lr.rider.name.charAt(0)}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                            style={{ background: statusCfg.dot }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{lr.rider.name}</p>
                            <Badge color={statusCfg.color as any}>{statusCfg.label}</Badge>
                          </div>
                          {lr.current_stop?.facility && (
                            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                              Now: {lr.current_stop.facility.name}
                            </p>
                          )}
                          {lr.has_disputes && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <AlertTriangle size={10} style={{ color: 'var(--danger)' }} />
                              <span className="text-[11px]" style={{ color: 'var(--danger)' }}>Has disputes</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                            {lr.completed_stops}/{lr.total_stops} stops
                          </span>
                          <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{progressPct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${progressPct}%`, background: progressPct >= 100 ? 'var(--success)' : 'var(--brand)' }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── All riders section ──────────────────────────────────────── */}
          {!loading && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider px-1 mb-2" style={{ color: 'var(--text-tertiary)' }}>
                All Riders ({allRiders.length})
              </p>
              {allRiders.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <Navigation size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No riders</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {allRiders.map(r => {
                    const isOnRoute = liveRiderIds.has(r.id);
                    const avail = AVAIL_CONFIG[r.availability_status] ?? AVAIL_CONFIG.unavailable;
                    const isSelected = selectedRiderId === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRiderId(isSelected ? null : r.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-[10px] transition-all text-left"
                        style={{
                          background: isSelected ? 'var(--brand-subtle)' : 'var(--bg-subtle)',
                          border: `1.5px solid ${isSelected ? 'var(--brand-border)' : 'transparent'}`,
                          cursor: 'pointer',
                        }}>
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
                            style={{ background: isOnRoute ? 'var(--brand)' : 'var(--bg-elevated)', color: isOnRoute ? '#fff' : 'var(--text-secondary)' }}>
                            {r.name.charAt(0)}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                            style={{ background: avail.dot }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                          {r.coverage_city && (
                            <p className="text-[10px] flex items-center gap-0.5 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                              <MapPin size={9} /> {r.coverage_city}
                            </p>
                          )}
                        </div>
                        <Badge color={avail.color as any}>{avail.label}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative" style={{ background: 'var(--bg-page)' }}>
        <LiveTrackingMap
          riders={liveRiders}
          allRiders={allRiders}
          selectedRiderId={selectedRiderId}
        />
      </div>

      {/* ── Route detail panel (desktop) ───────────────────────────────────── */}
      {selectedLiveRider && (
        <div className="hidden lg:flex w-[320px] flex-shrink-0 flex-col overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)' }}>
          <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {selectedLiveRider.rider.name}
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {selectedLiveRider.completed_stops}/{selectedLiveRider.total_stops} stops completed
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {selectedLiveRider.current_stop && (
              <div className="px-3 py-2 rounded-[8px] mb-3"
                style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--brand)' }}>Current Stop</p>
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {selectedLiveRider.current_stop.facility?.name ?? '—'}
                </p>
              </div>
            )}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-tertiary)' }}>
                Next Stop
              </p>
              {selectedLiveRider.next_stop ? (
                <div className="flex gap-3 px-2 py-2 rounded-[8px]" style={{ background: 'var(--bg-subtle)' }}>
                  <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      {selectedLiveRider.next_stop.facility?.name ?? '—'}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      ETA: {selectedLiveRider.eta_next_stop
                        ? new Date(selectedLiveRider.eta_next_stop).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] px-2" style={{ color: 'var(--text-tertiary)' }}>All stops done or heading to depot</p>
              )}
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Last Known Location
              </p>
              {selectedLiveRider.latest_location ? (
                <p className="text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {selectedLiveRider.latest_location.latitude.toFixed(5)},&nbsp;
                  {selectedLiveRider.latest_location.longitude.toFixed(5)}
                </p>
              ) : (
                <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No location data</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
