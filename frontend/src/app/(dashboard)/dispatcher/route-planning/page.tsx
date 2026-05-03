'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Route, Zap, Send, ChevronDown, ChevronRight, Clock, MapPin, CheckCircle2, Truck } from 'lucide-react';
import { MOCK_TASKS_NORM as MOCK_TASKS, MOCK_RIDERS_NORM as MOCK_RIDERS, MOCK_FACILITIES } from '@/lib/mock-data';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const RoutePlanningMap = dynamic(() => import('@/components/maps/RoutePlanningMap'), { ssr: false });

const RIDER_COLORS = ['#4F6EF7', '#059669', '#F59E0B', '#8B5CF6', '#EC4899'];

interface OptimizedStop {
  sequence: number;
  facility_name: string;
  city: string;
  eta: string;
  task_id: number;
}
interface RiderRoute {
  rider_id: number;
  rider_name: string;
  vehicle_type: string;
  color: string;
  stops: OptimizedStop[];
  total_distance_km: number;
  duration_min: number;
}

function buildMockOptimization(riderIds: number[], taskIds: number[]): RiderRoute[] {
  const selectedRiders = MOCK_RIDERS.filter(r => riderIds.includes(r.id));
  const selectedTasks = MOCK_TASKS.filter(t => taskIds.includes(t.id) && t.status === 'planned');

  const result: RiderRoute[] = [];
  let taskIndex = 0;

  selectedRiders.forEach((rider, ri) => {
    const chunk = selectedTasks.slice(taskIndex, taskIndex + Math.ceil(selectedTasks.length / selectedRiders.length));
    taskIndex += chunk.length;

    let baseHour = 8;
    const stops: OptimizedStop[] = chunk.map((task, si) => {
      const fac = MOCK_FACILITIES.find(f => f.id === task.facility_id);
      const eta = `${String(baseHour).padStart(2, '0')}:${si % 2 === 0 ? '15' : '45'}`;
      baseHour += si % 3 === 2 ? 1 : 0;
      return { sequence: si + 1, facility_name: fac?.name ?? '—', city: fac?.city ?? 'Nairobi', eta, task_id: task.id };
    });

    result.push({
      rider_id: rider.id,
      rider_name: rider.name,
      vehicle_type: rider.vehicle_type,
      color: RIDER_COLORS[ri % RIDER_COLORS.length],
      stops,
      total_distance_km: parseFloat((8 + ri * 3.2 + chunk.length * 1.5).toFixed(1)),
      duration_min: 90 + ri * 15 + chunk.length * 12,
    });
  });

  return result;
}

export default function RoutePlanningPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRiderIds, setSelectedRiderIds] = useState<Set<number>>(new Set(MOCK_RIDERS.filter(r => r.is_active).map(r => r.id)));
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set(MOCK_TASKS.filter(t => t.status === 'planned').map(t => t.id)));
  const [result, setResult] = useState<RiderRoute[] | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [expandedRider, setExpandedRider] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const activeRiders = MOCK_RIDERS.filter(r => r.is_active);
  const unassignedTasks = MOCK_TASKS.filter(t => t.status === 'planned');

  const toggleRider = (id: number) => {
    setSelectedRiderIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const toggleTask = (id: number) => {
    setSelectedTaskIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const handleOptimize = async () => {
    if (selectedRiderIds.size === 0) { toast.error('Select at least one rider'); return; }
    if (selectedTaskIds.size === 0) { toast.error('Select at least one task'); return; }
    setOptimizing(true);
    await new Promise(r => setTimeout(r, 1800));
    setResult(buildMockOptimization(Array.from(selectedRiderIds), Array.from(selectedTaskIds)));
    setExpandedRider(Array.from(selectedRiderIds)[0]);
    setOptimizing(false);
    toast.success('Routes optimized!');
  };

  const handleDispatch = () => {
    setDispatched(true);
    setConfirmOpen(false);
    toast.success('Routes dispatched — riders notified via WhatsApp');
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Left panel */}
      <div className="w-full lg:w-[400px] xl:w-[440px] flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>

        {/* Header */}
        <div className="p-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h1 className="text-[18px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Route Planning</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {selectedRiderIds.size} rider{selectedRiderIds.size !== 1 ? 's' : ''} · {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Date
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', height: 40, background: 'var(--bg-subtle)', border: '1.5px solid var(--border-strong)', borderRadius: 10, fontSize: 13, color: 'var(--text-primary)', outline: 'none', padding: '0 12px', boxSizing: 'border-box' }} />
          </div>

          {!result ? (
            <>
              {/* Riders */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Riders ({selectedRiderIds.size}/{activeRiders.length})
                  </label>
                  <button onClick={() => {
                    if (selectedRiderIds.size === activeRiders.length) setSelectedRiderIds(new Set());
                    else setSelectedRiderIds(new Set(activeRiders.map(r => r.id)));
                  }} style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                    {selectedRiderIds.size === activeRiders.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {activeRiders.map(r => (
                    <label key={r.id} className="flex items-center gap-3 p-2.5 rounded-[9px] cursor-pointer transition-all"
                      style={{ background: selectedRiderIds.has(r.id) ? 'var(--brand-subtle)' : 'var(--bg-subtle)' }}>
                      <input type="checkbox" checked={selectedRiderIds.has(r.id)} onChange={() => toggleRider(r.id)} style={{ accentColor: 'var(--brand)' }} />
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: 'var(--brand)', color: '#fff' }}>{r.name.charAt(0)}</div>
                      <div className="flex-1">
                        <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.vehicle_type}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Tasks ({selectedTaskIds.size}/{unassignedTasks.length})
                  </label>
                  <button onClick={() => {
                    if (selectedTaskIds.size === unassignedTasks.length) setSelectedTaskIds(new Set());
                    else setSelectedTaskIds(new Set(unassignedTasks.map(t => t.id)));
                  }} style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                    {selectedTaskIds.size === unassignedTasks.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {unassignedTasks.map(t => {
                    const fac = MOCK_FACILITIES.find(f => f.id === t.facility_id);
                    return (
                      <label key={t.id} className="flex items-center gap-3 p-2.5 rounded-[9px] cursor-pointer transition-all"
                        style={{ background: selectedTaskIds.has(t.id) ? 'var(--brand-subtle)' : 'var(--bg-subtle)' }}>
                        <input type="checkbox" checked={selectedTaskIds.has(t.id)} onChange={() => toggleTask(t.id)} style={{ accentColor: 'var(--brand)' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{fac?.name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                            {t.time_window_start}–{t.time_window_end}
                            {t.priority === 'urgent' && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>URGENT</span>}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Results */
            <div className="space-y-3">
              {result.map(r => (
                <div key={r.rider_id} className="rounded-[12px] overflow-hidden"
                  style={{ border: `1.5px solid ${r.color}30`, background: 'var(--bg-subtle)' }}>
                  <button
                    onClick={() => setExpandedRider(expandedRider === r.rider_id ? null : r.rider_id)}
                    className="w-full flex items-center gap-3 p-3.5 transition-all"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-white"
                      style={{ background: r.color }}>{r.rider_name.charAt(0)}</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{r.rider_name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {r.stops.length} stops · {r.total_distance_km} km · ~{r.duration_min} min
                      </p>
                    </div>
                    {expandedRider === r.rider_id ? <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
                  </button>
                  {expandedRider === r.rider_id && (
                    <div className="pb-2 px-3 space-y-1">
                      {r.stops.map(s => (
                        <div key={s.sequence} className="flex items-center gap-2 py-1.5 px-2 rounded-[8px]"
                          style={{ background: 'var(--bg-surface)' }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-white"
                            style={{ background: r.color }}>{s.sequence}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.facility_name}</p>
                          </div>
                          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{s.eta}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button onClick={() => { setResult(null); setDispatched(false); }}
                className="w-full text-[12px] font-medium py-2 rounded-[9px] transition-all"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                ← Reconfigure
              </button>
            </div>
          )}
        </div>

        {/* Footer button */}
        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {!result ? (
            <Button onClick={handleOptimize} loading={optimizing} className="w-full">
              <Zap size={14} /> {optimizing ? 'Optimizing…' : 'Optimize Routes'}
            </Button>
          ) : dispatched ? (
            <div className="flex items-center justify-center gap-2 py-3 rounded-[10px]"
              style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
              <CheckCircle2 size={16} /> Routes dispatched
            </div>
          ) : (
            <Button onClick={() => setConfirmOpen(true)} className="w-full"
              style={{ background: 'var(--success)', color: '#fff' }}>
              <Send size={14} /> Dispatch All Routes
            </Button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative" style={{ background: 'var(--bg-page)' }}>
        {(() => { const M = RoutePlanningMap as any; return <M
          routes={result ? result.map((r: any) => ({
            rider_id: r.rider_id,
            rider_name: r.rider_name,
            color: r.color,
            stops: r.stops.map((s: any) => {
              const task = MOCK_TASKS.find(t => t.id === s.task_id);
              const fac = task ? MOCK_FACILITIES.find(f => f.id === (task as any).facility_id) : null;
              return {
                sequence: s.sequence,
                facility_name: s.facility_name,
                latitude: fac?.latitude ?? -1.286 + (s.sequence * 0.01),
                longitude: fac?.longitude ?? 36.817 + (s.sequence * 0.01),
                eta: s.eta,
              };
            }),
          })) : []}
        />; })()}
      </div>

      {/* Confirm Dispatch Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-[16px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-modal)' }}>
            <div className="p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>Confirm Dispatch</h3>
              <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                WhatsApp notifications will be sent to all {result?.length} riders.
              </p>
            </div>
            <div className="p-4 space-y-2">
              {result?.map(r => (
                <div key={r.rider_id} className="flex items-center justify-between py-2 px-3 rounded-[9px]" style={{ background: 'var(--bg-subtle)' }}>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{r.rider_name}</span>
                  <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{r.stops.length} stops</span>
                </div>
              ))}
            </div>
            <div className="p-4 flex gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleDispatch} className="flex-1" style={{ background: 'var(--success)', color: '#fff' }}>
                <Send size={14} /> Confirm Dispatch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
