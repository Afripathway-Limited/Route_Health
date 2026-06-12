'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Send, CheckCircle2, AlertCircle, ChevronRight, ArrowLeft,
  Bike, Car, Truck, MapPin, Clock, Route,
} from 'lucide-react';
import { get, post, getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import type { Facility } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import type { RouteStop } from '@/components/maps/RouteAlternativesMap';

const RoutePlanningMap = dynamic(() => import('@/components/maps/RoutePlanningMap'), { ssr: false });
const RouteAlternativesMap = dynamic(() => import('@/components/maps/RouteAlternativesMap'), { ssr: false });

const VEHICLE_ICONS: Record<string, React.ElementType> = {
  motorbike: Truck, bicycle: Bike, car: Car, van: Truck,
};

interface PlanRider {
  id: number;
  name: string;
  vehicle_type: string;
  is_active: boolean;
  availability_status: string;
  coverage_lat: number | null;
  coverage_lng: number | null;
  coverage_city: string | null;
}

interface PlanTask {
  id: number;
  facility: { id: number; name: string; city: string; latitude?: number; longitude?: number } | null;
  pickup_name: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  time_window_start: string;
  time_window_end: string;
  priority: string;
  status: string;
}

type Step = 1 | 2 | 3;

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

function formatDistance(meters: number) {
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function RoutePlanningPage() {
  const { user } = useAuth();

  // ── Shared state ──────────────────────────────────────────────────────────
  const [step, setStep]             = useState<Step>(1);
  const [date, setDate]             = useState(new Date().toISOString().split('T')[0]);
  const [depotId, setDepotId]       = useState<number | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading]       = useState(true);

  // ── Step 1: tasks ─────────────────────────────────────────────────────────
  const [tasks, setTasks]                   = useState<PlanTask[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());

  // ── Step 2: rider ─────────────────────────────────────────────────────────
  const [riders, setRiders]             = useState<PlanRider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);

  // ── Step 3: route alternatives ────────────────────────────────────────────
  const [directionsRoutes, setDirectionsRoutes] = useState<google.maps.DirectionsRoute[]>([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routesLoaded, setRoutesLoaded]   = useState(false);   // false = still loading, true = response arrived
  const [routeAttempt, setRouteAttempt]   = useState(0);        // increments to force RouteAlternativesMap remount on retry
  const [dispatching, setDispatching]   = useState(false);
  const [dispatched, setDispatched]     = useState(false);

  // ── Load facilities + riders ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [riderData, facilityData] = await Promise.all([
        get<PlanRider[]>('/riders'),
        get<Facility[]>('/facilities'),
      ]);
      setRiders((Array.isArray(riderData) ? riderData : []).filter(r => r.is_active));
      const active = Array.isArray(facilityData) ? facilityData.filter(f => f.is_active) : [];
      setFacilities(active);
      if (active.length > 0) setDepotId(prev => prev ?? active[0].id);
    } catch {
      toast.error('Failed to load riders / facilities');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const data = await get<PlanTask[]>(`/tasks?date=${date}&status=planned`);
      const planned = Array.isArray(data) ? data : [];
      setTasks(planned);
      setSelectedTaskIds(new Set(planned.map(t => t.id)));
    } catch {
      toast.error('Failed to load tasks');
    }
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const taskLabel = (t: PlanTask) => t.facility?.name ?? t.pickup_name ?? '—';
  const taskCity  = (t: PlanTask) => t.facility?.city ?? '';

  const getTaskCoords = (t: PlanTask): { lat: number; lng: number } | null => {
    if (t.pickup_lat && t.pickup_lng) return { lat: t.pickup_lat, lng: t.pickup_lng };
    if (t.facility?.latitude && t.facility?.longitude)
      return { lat: t.facility.latitude, lng: t.facility.longitude };
    return null;
  };

  const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
  const selectedRider = riders.find(r => r.id === selectedRiderId) ?? null;
  const depot = facilities.find(f => f.id === depotId) ?? null;

  // Build stops for DirectionsService (from selected tasks with coords)
  const routeStops: RouteStop[] = selectedTasks
    .map(t => {
      const c = getTaskCoords(t);
      if (!c) return null;
      return { taskId: t.id, label: taskLabel(t), lat: c.lat, lng: c.lng };
    })
    .filter((s): s is RouteStop => s !== null);

  const depotCoords = depot
    ? { lat: Number(depot.latitude), lng: Number(depot.longitude), label: depot.name }
    : null;

  const orgServiceArea = user?.organization?.service_lat && user?.organization?.service_lng
    ? { lat: user.organization.service_lat, lng: user.organization.service_lng, radius_km: user.organization.service_radius_km ?? 30 }
    : null;

  // ── Step navigation ───────────────────────────────────────────────────────
  const goToStep2 = () => {
    if (selectedTaskIds.size === 0) { toast.error('Select at least one task'); return; }
    if (!depotId) { toast.error('Select a depot facility'); return; }
    setStep(2);
  };

  const goToStep3 = () => {
    if (!selectedRiderId) { toast.error('Select a rider'); return; }
    if (routeStops.length === 0) { toast.error('No task locations available — ensure tasks have coordinates'); return; }
    if (!depotCoords) { toast.error('Depot facility has no coordinates'); return; }
    setDirectionsRoutes([]);
    setSelectedRouteIdx(0);
    setRoutesLoaded(false);
    setRouteAttempt(a => a + 1);
    setStep(3);
  };

  // ── Dispatch helpers ──────────────────────────────────────────────────────
  const buildStops = (legDurations: number[]) => {
    const baseMs = new Date(`${date}T08:00:00`).getTime();
    let cumulativeSec = 0;
    return routeStops.map((s, i) => {
      cumulativeSec += legDurations[i] ?? 0;
      return {
        task_id: s.taskId,
        sequence: i + 1,
        planned_arrival: new Date(baseMs + cumulativeSec * 1000).toISOString(),
        planned_departure: new Date(baseMs + cumulativeSec * 1000 + 1800000).toISOString(),
      };
    });
  };

  const dispatchRoute = async (stops: ReturnType<typeof buildStops>) => {
    setDispatching(true);
    try {
      await post('/routes/dispatch', {
        date,
        depot_facility_id: depotId,
        routes: [{ rider_id: selectedRiderId, stops }],
      });
      setDispatched(true);
      toast.success('Route dispatched — rider notified');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDispatching(false);
    }
  };

  const handleDispatch = async () => {
    if (!selectedRiderId || !depotId || !directionsRoutes[selectedRouteIdx]) return;
    const route = directionsRoutes[selectedRouteIdx];
    const stops = buildStops(route.legs.map(l => l.duration?.value ?? 0));
    await dispatchRoute(stops);
  };

  // Dispatch without Directions API — evenly space stops 30 min apart
  const handleDirectDispatch = async () => {
    if (!selectedRiderId || !depotId) return;
    const stops = buildStops(routeStops.map(() => 1800)); // 30 min per leg
    await dispatchRoute(stops);
  };

  // ── Step indicator pill ───────────────────────────────────────────────────
  const StepDot = ({ n }: { n: Step }) => (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{
          background: step === n ? 'var(--brand)' : step > n ? 'var(--success)' : 'var(--bg-elevated)',
          color: step >= n ? '#fff' : 'var(--text-tertiary)',
        }}>
        {step > n ? '✓' : n}
      </div>
      <span className="text-[11px] font-medium hidden sm:inline"
        style={{ color: step === n ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
        {n === 1 ? 'Tasks' : n === 2 ? 'Rider' : 'Route'}
      </span>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>

        {/* Header + step indicator */}
        <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Route Planning</h1>
            <div className="flex items-center gap-2">
              <StepDot n={1} />
              <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
              <StepDot n={2} />
              <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
              <StepDot n={3} />
            </div>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            {step === 1 && `Select tasks for ${date}`}
            {step === 2 && 'Choose an available rider'}
            {step === 3 && (dispatched ? 'Route dispatched' : 'Pick a route and dispatch')}
          </p>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── Step 1: Date + Depot + Tasks ─────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Date</label>
                  <input type="date" value={date}
                    onChange={e => { setDate(e.target.value); setSelectedTaskIds(new Set()); }}
                    style={{ width: '100%', height: 38, background: 'var(--bg-subtle)', border: '1.5px solid var(--border-strong)', borderRadius: 9, fontSize: 13, color: 'var(--text-primary)', outline: 'none', padding: '0 10px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Depot *</label>
                  <select value={depotId ?? ''} onChange={e => setDepotId(Number(e.target.value))} className="rh-select" style={{ height: 38 }}>
                    <option value="">— Select depot —</option>
                    {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Unassigned Tasks ({selectedTaskIds.size}/{tasks.length})
                  </label>
                  <button
                    onClick={() => setSelectedTaskIds(
                      selectedTaskIds.size === tasks.length ? new Set() : new Set(tasks.map(t => t.id)),
                    )}
                    style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                    {selectedTaskIds.size === tasks.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-3 rounded-[9px]" style={{ background: 'var(--bg-subtle)' }}>
                    <AlertCircle size={14} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No unassigned tasks for {date}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {tasks.map(t => (
                      <label key={t.id} className="flex items-center gap-3 p-2.5 rounded-[9px] cursor-pointer transition-all"
                        style={{ background: selectedTaskIds.has(t.id) ? 'var(--brand-subtle)' : 'var(--bg-subtle)', border: `1.5px solid ${selectedTaskIds.has(t.id) ? 'var(--brand-border)' : 'transparent'}` }}>
                        <input type="checkbox" checked={selectedTaskIds.has(t.id)}
                          onChange={() => setSelectedTaskIds(prev => { const s = new Set(prev); s.has(t.id) ? s.delete(t.id) : s.add(t.id); return s; })}
                          style={{ accentColor: 'var(--brand)', flexShrink: 0 }} />
                        <MapPin size={12} style={{ color: '#4F6EF7', flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{taskLabel(t)}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                            {taskCity(t) && `${taskCity(t)} · `}
                            <Clock size={9} style={{ display: 'inline', marginRight: 2 }} />
                            {t.time_window_start}–{t.time_window_end}
                            {t.priority === 'urgent' && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>URGENT</span>}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 2: Rider selection ───────────────────────────────────── */}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-[12px] font-medium"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)' }}>
                <ArrowLeft size={13} /> Back to Tasks
              </button>

              <div className="p-3 rounded-[10px] text-[12px]" style={{ background: 'var(--bg-subtle)' }}>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? 's' : ''} selected
                </p>
                <p style={{ color: 'var(--text-tertiary)' }}>Depot: {depot?.name ?? '—'}</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Available Riders
                </label>
                {loading ? (
                  <p className="text-[12px] py-2" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
                ) : riders.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-3 rounded-[9px]" style={{ background: 'var(--warning-subtle)' }}>
                    <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
                    <p className="text-[12px]" style={{ color: 'var(--warning)' }}>No active riders found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {riders.map(r => {
                      const VehicleIcon = VEHICLE_ICONS[r.vehicle_type] || Truck;
                      const isSelected = selectedRiderId === r.id;
                      return (
                        <label key={r.id}
                          className="flex items-center gap-3 p-3 rounded-[10px] cursor-pointer transition-all"
                          style={{
                            background: isSelected ? 'var(--brand-subtle)' : 'var(--bg-subtle)',
                            border: `1.5px solid ${isSelected ? 'var(--brand-border)' : 'transparent'}`,
                          }}>
                          <input type="radio" name="rider" checked={isSelected}
                            onChange={() => setSelectedRiderId(r.id)}
                            style={{ accentColor: 'var(--brand)', flexShrink: 0 }} />
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                            style={{ background: isSelected ? 'var(--brand)' : 'var(--bg-elevated)', color: isSelected ? '#fff' : 'var(--text-secondary)' }}>
                            {r.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                                <VehicleIcon size={10} /> {r.vehicle_type}
                              </span>
                              {r.coverage_city && (
                                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.coverage_city}</span>
                              )}
                            </div>
                          </div>
                          <Badge color={r.availability_status === 'free' ? 'success' : r.availability_status === 'on_route' ? 'brand' : 'gray'}>
                            {r.availability_status === 'free' ? 'Free' : r.availability_status === 'on_route' ? 'On Route' : 'Busy'}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 3: Route alternatives ────────────────────────────────── */}
          {step === 3 && (
            <>
              {!dispatched && (
                <button onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)' }}>
                  <ArrowLeft size={13} /> Back to Rider
                </button>
              )}

              <div className="p-3 rounded-[10px] text-[12px]" style={{ background: 'var(--bg-subtle)' }}>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selectedRider?.name} · {routeStops.length} stop{routeStops.length !== 1 ? 's' : ''}
                </p>
                <p style={{ color: 'var(--text-tertiary)' }}>
                  {routeStops.map(s => s.label).join(' → ')}
                </p>
              </div>

              {dispatched ? (
                <div className="flex items-center gap-2 px-3 py-3 rounded-[9px]"
                  style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
                  <CheckCircle2 size={16} />
                  <span className="text-[13px] font-semibold">Route dispatched successfully</span>
                </div>
              ) : !routesLoaded ? (
                <div className="py-6 text-center">
                  <Route size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', animation: 'spin 1.5s linear infinite' }} />
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    Loading route options from Google Maps…
                  </p>
                </div>
              ) : directionsRoutes.length === 0 ? (
                <div className="py-5 text-center px-2">
                  <AlertCircle size={22} className="mx-auto mb-2" style={{ color: 'var(--warning)' }} />
                  <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Map routes unavailable
                  </p>
                  <p className="text-[12px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                    Could not calculate route alternatives. The stops may be unreachable, outside
                    coverage, or a network error occurred. You can dispatch with estimated arrival
                    times or retry.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleDirectDispatch}
                      disabled={dispatching}
                      className="w-full text-[13px] font-semibold px-3 py-2.5 rounded-[9px]"
                      style={{ background: 'var(--success)', color: '#fff', border: 'none', cursor: dispatching ? 'not-allowed' : 'pointer', opacity: dispatching ? 0.7 : 1 }}>
                      {dispatching ? 'Dispatching…' : '✓ Dispatch Route Directly'}
                    </button>
                    <button
                      onClick={() => { setRoutesLoaded(false); setDirectionsRoutes([]); setRouteAttempt(a => a + 1); }}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-[8px]"
                      style={{ background: 'var(--brand-subtle)', color: 'var(--brand)', border: '1px solid var(--brand-border)', cursor: 'pointer' }}>
                      Retry with Map
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Route Options ({directionsRoutes.length})
                  </label>
                  <div className="space-y-2">
                    {directionsRoutes.map((route, idx) => {
                      const isSelected = idx === selectedRouteIdx;
                      const totalDuration = route.legs.reduce((s, l) => s + (l.duration?.value ?? 0), 0);
                      const totalDistance = route.legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0);
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedRouteIdx(idx)}
                          className="w-full text-left p-3.5 rounded-[11px] transition-all"
                          style={{
                            background: isSelected ? 'var(--brand-subtle)' : 'var(--bg-subtle)',
                            border: `1.5px solid ${isSelected ? 'var(--brand-border)' : 'var(--border-subtle)'}`,
                            cursor: 'pointer',
                          }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold" style={{ color: isSelected ? 'var(--brand)' : 'var(--text-primary)' }}>
                                Route {idx + 1}
                                {idx === 0 && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>Best</span>}
                              </p>
                              {route.summary && (
                                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                                  via {route.summary}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{formatDuration(totalDuration)}</p>
                              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{formatDistance(totalDistance)}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--brand-border)' }}>
                              {route.legs.map((leg, i) => (
                                <div key={i} className="flex items-center justify-between text-[11px] py-0.5">
                                  <span style={{ color: 'var(--text-secondary)' }}>
                                    {i === 0 ? depot?.name : routeStops[i - 1]?.label} → {routeStops[i]?.label ?? 'Depot'}
                                  </span>
                                  <span style={{ color: 'var(--text-tertiary)' }}>{formatDuration(leg.duration?.value ?? 0)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {step === 1 && (
            <Button onClick={goToStep2} className="w-full" disabled={loading}>
              Select Rider <ChevronRight size={14} />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={goToStep3} className="w-full" disabled={!selectedRiderId}>
              View Route Options <ChevronRight size={14} />
            </Button>
          )}
          {step === 3 && !dispatched && routesLoaded && directionsRoutes.length > 0 && (
            <Button onClick={handleDispatch} disabled={dispatching} className="w-full"
              style={{ background: 'var(--success)', color: '#fff' }}>
              <Send size={14} /> {dispatching ? 'Dispatching…' : 'Dispatch Selected Route'}
            </Button>
          )}
          {step === 3 && dispatched && (
            <Button variant="secondary" className="w-full"
              onClick={() => { setStep(1); setSelectedRiderId(null); setDispatched(false); setDirectionsRoutes([]); setRoutesLoaded(false); loadTasks(); }}>
              Plan Another Route
            </Button>
          )}
        </div>
      </div>

      {/* ── Map panel ──────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative" style={{ background: 'var(--bg-page)' }}>
        {step < 3 ? (
          <RoutePlanningMap
            optimizationResult={null}
            riders={riders}
            orgServiceArea={orgServiceArea}
          />
        ) : depotCoords ? (
          <RouteAlternativesMap
            key={routeAttempt}
            origin={depotCoords}
            stops={routeStops}
            destination={depotCoords}
            selectedRouteIdx={selectedRouteIdx}
            onRoutesLoaded={routes => { setDirectionsRoutes(routes); setRoutesLoaded(true); }}
          />
        ) : null}
      </div>
    </div>
  );
}
