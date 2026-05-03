'use client';

import { useState } from 'react';
import { Search, Plus, Truck, Bike, Car, BarChart2, CheckCircle2, AlertTriangle, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { FAB } from '@/components/ui/FAB';
import { MOCK_RIDERS_NORM as MOCK_RIDERS, MOCK_FACILITIES } from '@/lib/mock-data';
import toast from 'react-hot-toast';

const VEHICLE_ICONS: Record<string, React.ElementType> = {
  motorbike: Truck,
  bicycle: Bike,
  car: Car,
  van: Truck,
};

const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  on_route: 'brand',
  inactive: 'gray',
};

interface RiderForm {
  name: string;
  phone: string;
  vehicle_type: string;
  home_facility_id: number | null;
}

export default function RidersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [perfRider, setPerfRider] = useState<typeof MOCK_RIDERS[0] | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [riders, setRiders] = useState<any[]>([...MOCK_RIDERS]);
  const [form, setForm] = useState<RiderForm>({ name: '', phone: '', vehicle_type: 'motorbike', home_facility_id: null });

  const filtered = riders.filter(r => {
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search);
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && r.is_active && r.status !== 'on_route') ||
      (statusFilter === 'inactive' && !r.is_active) ||
      (statusFilter === 'on-route' && r.status === 'on_route');
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', phone: '', vehicle_type: 'motorbike', home_facility_id: null });
    setDrawerOpen(true);
  };

  const openEdit = (r: typeof MOCK_RIDERS[0]) => {
    setEditing(r);
    setForm({ name: r.name, phone: r.phone, vehicle_type: r.vehicle_type, home_facility_id: r.home_facility_id });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.phone) {
      toast.error('Name and phone are required');
      return;
    }
    if (editing) {
      setRiders(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } : r));
      toast.success('Rider updated');
    } else {
      const newRider = {
        ...form, id: Date.now(), user_id: null, organization_id: 1,
        photo_url: null, is_active: true, status: 'active' as const,
        tasks_this_month: 0, on_time_rate: 0,
      };
      setRiders(prev => [newRider as any, ...prev]);
      toast.success('Rider added');
    }
    setDrawerOpen(false);
  };

  const toggleStatus = (id: number) => {
    setRiders(prev => prev.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
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
            Riders
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {riders.filter(r => r.is_active).length} active · {riders.length} total
          </p>
        </div>
        <div className="hidden md:block">
          <Button onClick={openAdd}><Plus size={14} /> Add Rider</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" placeholder="Search riders…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rh-select" style={{ width: 160 }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="on-route">On route</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="data-table rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Rider', 'Phone', 'Vehicle', 'Home Base', 'Status', 'Tasks / mo.', 'On-time Rate', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const VehicleIcon = VEHICLE_ICONS[r.vehicle_type] || Truck;
              const homeFacility = MOCK_FACILITIES.find(f => f.id === r.home_facility_id);
              const rateColor = r.on_time_rate >= 90 ? 'var(--success)' : r.on_time_rate >= 75 ? 'var(--warning)' : 'var(--danger)';
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                        style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                        {r.name.charAt(0)}
                      </div>
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{r.phone}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      <VehicleIcon size={13} />
                      {r.vehicle_type.charAt(0).toUpperCase() + r.vehicle_type.slice(1)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    {homeFacility?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => toggleStatus(r.id)}
                      className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full transition-all"
                      style={{
                        background: r.is_active ? 'var(--success-subtle)' : 'var(--bg-subtle)',
                        color: r.is_active ? 'var(--success)' : 'var(--text-tertiary)',
                        border: `1px solid ${r.is_active ? 'var(--success-border)' : 'var(--border-subtle)'}`,
                      }}>
                      {r.is_active ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                      {r.status === 'on_route' ? 'On Route' : r.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{r.tasks_this_month}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)', maxWidth: 60 }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${r.on_time_rate}%`, background: rateColor }} />
                      </div>
                      <span className="text-[12px] font-medium" style={{ color: rateColor }}>{r.on_time_rate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(r)}
                        className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all"
                        style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--bg-hover)'; el.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'none'; el.style.color = 'var(--text-tertiary)'; }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setPerfRider(r)}
                        className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all"
                        style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--bg-hover)'; el.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'none'; el.style.color = 'var(--text-tertiary)'; }}>
                        <BarChart2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Truck size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No riders found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards space-y-3">
        {filtered.map(r => {
          const rateColor = r.on_time_rate >= 90 ? 'var(--success)' : r.on_time_rate >= 75 ? 'var(--warning)' : 'var(--danger)';
          return (
            <div key={r.id} className="rounded-[12px] p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                  style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{r.phone} · {r.vehicle_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold" style={{ color: rateColor }}>{r.on_time_rate}%</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>on-time</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => openEdit(r)} className="flex-1 text-[12px] font-medium py-1.5 rounded-[8px] transition-all"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                  Edit
                </button>
                <button onClick={() => setPerfRider(r)} className="flex-1 text-[12px] font-medium py-1.5 rounded-[8px] transition-all"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                  Performance
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <FAB onClick={openAdd} label="Add Rider"><Plus size={22} /></FAB>

      {/* Add / Edit Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? `Edit — ${editing.name}` : 'Add Rider'}>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full name *</label>
            <Input placeholder="e.g. David Kamau" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Phone *</label>
            <Input placeholder="+254 700 000000" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Vehicle type</label>
            <select value={form.vehicle_type} onChange={e => setForm(p => ({ ...p, vehicle_type: e.target.value }))} className="rh-select">
              <option value="motorbike">Motorbike</option>
              <option value="bicycle">Bicycle</option>
              <option value="car">Car</option>
              <option value="van">Van</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Home facility</label>
            <select value={form.home_facility_id ?? ''} onChange={e => setForm(p => ({ ...p, home_facility_id: e.target.value ? Number(e.target.value) : null }))} className="rh-select">
              <option value="">None</option>
              {MOCK_FACILITIES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="pt-2 flex gap-3">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1">{editing ? 'Save Changes' : 'Add Rider'}</Button>
          </div>
        </div>
      </Drawer>

      {/* Performance Drawer */}
      <Drawer open={!!perfRider} onClose={() => setPerfRider(null)} title={`Performance — ${perfRider?.name ?? ''}`}>
        {perfRider && (() => {
          const rate = perfRider.on_time_rate;
          const rateColor = rate >= 90 ? 'var(--success)' : rate >= 75 ? 'var(--warning)' : 'var(--danger)';
          const circumference = 2 * Math.PI * 36;
          const strokeDash = circumference - (rate / 100) * circumference;
          return (
            <div className="space-y-5">
              <div className="flex flex-col items-center py-4">
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="36" fill="none" stroke="var(--bg-subtle)" strokeWidth="8" />
                  <circle cx="48" cy="48" r="36" fill="none" stroke={rateColor} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDash}
                    transform="rotate(-90 48 48)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                </svg>
                <p className="text-[28px] font-bold -mt-2" style={{ color: rateColor }}>{rate}%</p>
                <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>On-time rate</p>
              </div>
              {[
                { label: 'Tasks this month', value: perfRider.tasks_this_month },
                { label: 'Vehicle', value: perfRider.vehicle_type },
                { label: 'Status', value: perfRider.is_active ? 'Active' : 'Inactive' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-3 px-4 rounded-[10px]"
                  style={{ background: 'var(--bg-subtle)' }}>
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}
