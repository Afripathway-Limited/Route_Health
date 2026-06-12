'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Search, Plus, ClipboardList, ChevronDown, ChevronRight, X, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { FAB } from '@/components/ui/FAB';
import { get, post, del, getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

const LocationPickerMap = dynamic(() => import('@/components/maps/LocationPickerMap'), { ssr: false });

const STATUS_COLORS: Record<string, string> = {
  planned: 'gray', assigned: 'brand', in_progress: 'brand',
  completed: 'success', failed: 'danger', disputed: 'danger',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'danger', standard: 'brand',
};

interface TaskForm {
  pickup_name: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_name: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  type: 'pickup' | 'delivery';
  scheduled_date: string;
  time_window_start: string;
  time_window_end: string;
  priority: 'standard' | 'urgent';
  notes: string;
}

interface Task {
  id: number;
  facility_id?: number;
  pickup_name?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_name?: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  type: string;
  scheduled_date: string;
  time_window_start: string;
  time_window_end: string;
  priority: string;
  status: string;
  organization_id?: number;
  route_id: number | null;
  notes: string | null;
  created_by?: number;
  rider_id: number | null;
  rider_name: string | null;
  [key: string]: unknown;
}

interface Facility {
  id: number;
  name: string;
  address_line_1: string;
  city: string;
  latitude: number;
  longitude: number;
  facility_type: string;
  is_active: boolean;
}

const BLANK_FORM: TaskForm = {
  pickup_name: '', pickup_lat: null, pickup_lng: null,
  dropoff_name: '', dropoff_lat: null, dropoff_lng: null,
  type: 'pickup',
  scheduled_date: new Date().toISOString().split('T')[0],
  time_window_start: '08:00', time_window_end: '10:00',
  priority: 'standard', notes: '',
};

export default function TasksPage() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState<TaskForm>({ ...BLANK_FORM });

  const loadTasks = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await get<Task[]>(`/tasks?date=${today}`);
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    get<Facility[]>('/facilities').then(data => setFacilities(Array.isArray(data) ? data : [])).catch(() => {});
  }, [loadTasks]);

  const pickupLabel = (t: Task) => t.pickup_name ?? '—';
  const pickupCity = (t: Task) => {
    if (t.pickup_lat && t.pickup_lng) return `${(t.pickup_lat as number).toFixed(4)}, ${(t.pickup_lng as number).toFixed(4)}`;
    return '';
  };

  const filtered = tasks.filter(t => {
    const label = pickupLabel(t).toLowerCase();
    const matchSearch = !search || label.includes(search.toLowerCase()) || String(t.id).includes(search);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async () => {
    if (!form.pickup_name.trim() && form.pickup_lat === null) {
      toast.error('Please enter or pick a pickup location');
      return;
    }
    setSaving(true);
    try {
      await post('/tasks', {
        pickup_name: form.pickup_name || null,
        pickup_lat: form.pickup_lat,
        pickup_lng: form.pickup_lng,
        dropoff_name: form.dropoff_name || null,
        dropoff_lat: form.dropoff_lat,
        dropoff_lng: form.dropoff_lng,
        type: form.type,
        scheduled_date: form.scheduled_date,
        time_window_start: form.time_window_start,
        time_window_end: form.time_window_end,
        priority: form.priority,
        notes: form.notes || null,
      });
      await loadTasks();
      toast.success('Task created — on air');
      setDrawerOpen(false);
      setForm({ ...BLANK_FORM, scheduled_date: new Date().toISOString().split('T')[0] });
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await del(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted');
      if (expandedId === id) setExpandedId(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 40, background: 'var(--bg-subtle)',
    border: '1.5px solid var(--border-strong)', borderRadius: 10,
    fontSize: 13, color: 'var(--text-primary)', outline: 'none',
    padding: '0 12px', boxSizing: 'border-box',
  };

  return (
    <div className="p-4 lg:p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Tasks
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {tasks.filter(t => ['planned', 'assigned', 'in_progress'].includes(t.status)).length} on air · {tasks.length} total today
          </p>
        </div>
        <div className="hidden md:block">
          <Button onClick={() => setDrawerOpen(true)}><Plus size={14} /> Create Task</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rh-select" style={{ width: 150 }}>
          <option value="all">All statuses</option>
          <option value="planned">On Air</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="data-table rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['', 'ID', 'Pickup', 'Drop-off', 'Window', 'Priority', 'Status', 'Rider', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const isExpanded = expandedId === t.id;
              const isUnassigned = t.status === 'planned';
              const label = pickupLabel(t);
              const city = pickupCity(t);
              return (
                <>
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isExpanded ? 'var(--bg-subtle)' : 'transparent'; }}>
                    <td className="pl-4 py-3.5 w-8">
                      <button onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="px-2 py-3.5 text-[12px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      #{String(t.id).slice(-4)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <MapPin size={13} style={{ color: '#4F6EF7', flexShrink: 0 }} />
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {t.dropoff_name ? (
                        <div className="flex items-center gap-2">
                          <MapPin size={13} style={{ color: '#059669', flexShrink: 0 }} />
                          <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{t.dropoff_name as string}</p>
                        </div>
                      ) : (
                        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        <Clock size={11} />
                        {t.time_window_start} – {t.time_window_end}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge color={PRIORITY_COLORS[t.priority] as any}>
                        {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      {isUnassigned ? (
                        <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--warning-subtle)', color: 'var(--warning)', border: '1px solid var(--warning-border)' }}>
                          On Air
                        </span>
                      ) : (
                        <Badge color={STATUS_COLORS[t.status] as any}>
                          {t.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {t.rider_name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => handleDelete(t.id)}
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--danger-subtle)'; el.style.color = 'var(--danger)'; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'none'; el.style.color = 'var(--text-tertiary)'; }}>
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${t.id}-exp`} style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <td colSpan={9} className="px-8 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Pickup</p>
                            <p style={{ color: 'var(--text-primary)' }}>{pickupLabel(t)}</p>
                            {t.pickup_lat && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{(t.pickup_lat as number).toFixed(6)}, {(t.pickup_lng as number).toFixed(6)}</p>}
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Drop-off</p>
                            <p style={{ color: 'var(--text-primary)' }}>{(t.dropoff_name as string) ?? '—'}</p>
                            {t.dropoff_lat && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{(t.dropoff_lat as number).toFixed(6)}, {(t.dropoff_lng as number).toFixed(6)}</p>}
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Scheduled</p>
                            <p style={{ color: 'var(--text-primary)' }}>{t.scheduled_date}</p>
                            <p style={{ color: 'var(--text-tertiary)' }}>{t.time_window_start} – {t.time_window_end}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Notes</p>
                            <p style={{ color: 'var(--text-secondary)' }}>{(t.notes as string) ?? 'None'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {loading && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <ClipboardList size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No tasks found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards space-y-3">
        {filtered.map(t => (
          <div key={t.id} className="rounded-[12px] p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: '#4F6EF7' }} />
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{pickupLabel(t)}</p>
              </div>
              {t.status === 'planned'
                ? <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--warning-subtle)', color: 'var(--warning)', border: '1px solid var(--warning-border)' }}>On Air</span>
                : <Badge color={STATUS_COLORS[t.status] as any}>{t.status.replace(/_/g, ' ')}</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{t.time_window_start} – {t.time_window_end}</span>
              <Badge color={PRIORITY_COLORS[t.priority] as any}>{t.priority}</Badge>
            </div>
            {t.rider_name && (
              <p className="text-[12px] mt-2" style={{ color: 'var(--text-secondary)' }}>Rider: {t.rider_name}</p>
            )}
          </div>
        ))}
      </div>

      <FAB onClick={() => setDrawerOpen(true)} label="Create Task"><Plus size={22} /></FAB>

      {/* ── Create Task Drawer ─────────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Create Task" width="w-[500px]">
        <div className="space-y-5">
          {/* ── Pickup location ────────────────────────────────────────────── */}
          <div className="space-y-2">
            {facilities.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  Pickup Location
                </label>
                <select
                  className="rh-select"
                  defaultValue=""
                  onChange={e => {
                    const f = facilities.find(f => f.id === Number(e.target.value));
                    if (f) setForm(p => ({
                      ...p,
                      pickup_name: f.name + (f.address_line_1 ? ', ' + f.address_line_1 : ''),
                      pickup_lat: Number(f.latitude),
                      pickup_lng: Number(f.longitude),
                    }));
                  }}>
                  <option value="">— Select facility (optional) —</option>
                  {facilities.filter(f => f.is_active).map(f => (
                    <option key={f.id} value={f.id}>{f.name} · {f.city}</option>
                  ))}
                </select>
              </div>
            )}
            <LocationPickerMap
              label="Pickup Location *"
              pinColor="#4F6EF7"
              lat={form.pickup_lat}
              lng={form.pickup_lng}
              name={form.pickup_name}
              onChangeName={v => setForm(p => ({ ...p, pickup_name: v }))}
              onChangeCoords={(lat, lng) => setForm(p => ({ ...p, pickup_lat: lat, pickup_lng: lng }))}
              placeholder="e.g. Aga Khan Hospital, Nairobi"
              required
            />
          </div>

          {/* ── Drop-off location ──────────────────────────────────────────── */}
          <div className="space-y-2">
            {facilities.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  Drop-off Location
                </label>
                <select
                  className="rh-select"
                  defaultValue=""
                  onChange={e => {
                    const f = facilities.find(f => f.id === Number(e.target.value));
                    if (f) setForm(p => ({
                      ...p,
                      dropoff_name: f.name + (f.address_line_1 ? ', ' + f.address_line_1 : ''),
                      dropoff_lat: Number(f.latitude),
                      dropoff_lng: Number(f.longitude),
                    }));
                  }}>
                  <option value="">— Select facility (optional) —</option>
                  {facilities.filter(f => f.is_active).map(f => (
                    <option key={f.id} value={f.id}>{f.name} · {f.city}</option>
                  ))}
                </select>
              </div>
            )}
            <LocationPickerMap
              label="Drop-off Location"
              pinColor="#059669"
              lat={form.dropoff_lat}
              lng={form.dropoff_lng}
              name={form.dropoff_name}
              onChangeName={v => setForm(p => ({ ...p, dropoff_name: v }))}
              onChangeCoords={(lat, lng) => setForm(p => ({ ...p, dropoff_lat: lat, dropoff_lng: lng }))}
              placeholder="e.g. PathCare Main Lab, Westlands"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="rh-select">
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as any }))} className="rh-select">
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Scheduled Date</label>
            <Input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>From</label>
              <Input type="time" value={form.time_window_start} onChange={e => setForm(p => ({ ...p, time_window_start: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>To</label>
              <Input type="time" value={form.time_window_end} onChange={e => setForm(p => ({ ...p, time_window_end: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Notes</label>
            <textarea
              rows={3} placeholder="Optional notes…" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              style={{ width: '100%', background: 'var(--bg-subtle)', border: '1.5px solid var(--border-strong)', borderRadius: 10, fontSize: 13, color: 'var(--text-primary)', outline: 'none', padding: '10px 12px', boxSizing: 'border-box', resize: 'none' }}
            />
          </div>

          <div className="pt-1 flex gap-3">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1" disabled={saving}>{saving ? 'Creating…' : 'Create Task'}</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
