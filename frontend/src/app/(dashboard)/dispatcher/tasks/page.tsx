'use client';

import { useState } from 'react';
import { Search, Plus, ClipboardList, ChevronDown, ChevronRight, X, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { FAB } from '@/components/ui/FAB';
import { MOCK_TASKS_NORM as MOCK_TASKS, MOCK_FACILITIES } from '@/lib/mock-data';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  planned: 'gray', assigned: 'brand', in_progress: 'brand',
  completed: 'success', failed: 'danger', disputed: 'danger',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'danger', standard: 'brand',
};

interface TaskForm {
  facility_id: number | null;
  type: 'pickup' | 'delivery';
  scheduled_date: string;
  time_window_start: string;
  time_window_end: string;
  priority: 'standard' | 'urgent';
  notes: string;
}

export default function TasksPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [form, setForm] = useState<TaskForm>({
    facility_id: null, type: 'pickup', scheduled_date: new Date().toISOString().split('T')[0],
    time_window_start: '08:00', time_window_end: '10:00', priority: 'standard', notes: '',
  });

  const filtered = tasks.filter(t => {
    const fac = MOCK_FACILITIES.find(f => f.id === t.facility_id);
    const matchSearch = !search ||
      (fac?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      String(t.id).includes(search);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchFacility = facilityFilter === 'all' || String(t.facility_id) === facilityFilter;
    return matchSearch && matchStatus && matchFacility;
  });

  const handleSave = () => {
    if (!form.facility_id) { toast.error('Please select a facility'); return; }
    const fac = MOCK_FACILITIES.find(f => f.id === form.facility_id);
    const newTask = {
      id: Date.now(), ...form, status: 'planned' as const,
      facility_name: fac?.name ?? '', facility_city: fac?.city ?? '',
      organization_id: 1, route_id: null, notes: form.notes || null,
      created_by: 1,
    };
    setTasks(prev => [newTask as any, ...prev]);
    toast.success('Task created');
    setDrawerOpen(false);
    setForm({ facility_id: null, type: 'pickup', scheduled_date: new Date().toISOString().split('T')[0], time_window_start: '08:00', time_window_end: '10:00', priority: 'standard', notes: '' });
  };

  const handleDelete = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Task deleted');
    if (expandedId === id) setExpandedId(null);
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
            {tasks.filter(t => t.status === 'planned').length} unassigned · {tasks.length} total today
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
          <option value="planned">Planned</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select value={facilityFilter} onChange={e => setFacilityFilter(e.target.value)} className="rh-select" style={{ width: 180 }}>
          <option value="all">All facilities</option>
          {MOCK_FACILITIES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* Desktop table */}
      <div className="data-table rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['', 'Task ID', 'Facility', 'Time Window', 'Type', 'Priority', 'Status', 'Rider', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const fac = MOCK_FACILITIES.find(f => f.id === t.facility_id);
              const isExpanded = expandedId === t.id;
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
                        <MapPin size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{fac?.name ?? '—'}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{fac?.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        <Clock size={11} />
                        {t.time_window_start} – {t.time_window_end}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge color={t.type === 'pickup' ? 'brand' : 'purple'}>
                        {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge color={PRIORITY_COLORS[t.priority] as any}>
                        {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge color={STATUS_COLORS[t.status] as any}>
                        {t.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                      {(t as any).rider_name ?? <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => handleDelete(t.id)}
                        className="w-6 h-6 rounded flex items-center justify-center transition-all"
                        style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--danger-subtle)'; el.style.color = 'var(--danger)'; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'none'; el.style.color = 'var(--text-tertiary)'; }}>
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${t.id}-expanded`} style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <td colSpan={9} className="px-8 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Facility</p>
                            <p style={{ color: 'var(--text-primary)' }}>{fac?.name}</p>
                            <p style={{ color: 'var(--text-tertiary)' }}>{fac?.address_line_1}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Contact</p>
                            <p style={{ color: 'var(--text-primary)' }}>{fac?.contact_name}</p>
                            <p style={{ color: 'var(--text-tertiary)' }}>{fac?.contact_phone}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Scheduled</p>
                            <p style={{ color: 'var(--text-primary)' }}>{t.scheduled_date}</p>
                            <p style={{ color: 'var(--text-tertiary)' }}>{t.time_window_start} – {t.time_window_end}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Notes</p>
                            <p style={{ color: 'var(--text-secondary)' }}>{(t as any).notes ?? 'None'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
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
        {filtered.map(t => {
          const fac = MOCK_FACILITIES.find(f => f.id === t.facility_id);
          return (
            <div key={t.id} className="rounded-[12px] p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{fac?.name}</p>
                </div>
                <Badge color={STATUS_COLORS[t.status] as any}>{t.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{t.time_window_start} – {t.time_window_end}</span>
                <Badge color={PRIORITY_COLORS[t.priority] as any}>{t.priority}</Badge>
                <Badge color={t.type === 'pickup' ? 'brand' : 'purple'}>{t.type}</Badge>
              </div>
            </div>
          );
        })}
      </div>

      <FAB onClick={() => setDrawerOpen(true)} label="Create Task"><Plus size={22} /></FAB>

      {/* Create Task Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Create Task">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Facility *</label>
            <select value={form.facility_id ?? ''} onChange={e => setForm(p => ({ ...p, facility_id: e.target.value ? Number(e.target.value) : null }))} className="rh-select">
              <option value="">Select a facility</option>
              {MOCK_FACILITIES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
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
            <Button onClick={handleSave} className="flex-1">Create Task</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
