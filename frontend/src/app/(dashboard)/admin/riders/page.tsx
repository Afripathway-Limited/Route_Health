'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Truck, Bike, Car, MapPin, Radio,
  CheckCircle2, XCircle, Plus, Pencil, X, Eye, EyeOff, LogIn,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { get, post, put, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const VEHICLE_ICONS: Record<string, React.ElementType> = {
  motorbike: Truck, bicycle: Bike, car: Car, van: Truck,
};
const STATUS_COLORS: Record<string, string> = {
  on_route: 'brand', free: 'success', busy: 'warning', unavailable: 'gray',
};
const STATUS_LABELS: Record<string, string> = {
  on_route: 'On Route', free: 'Available', busy: 'Busy', unavailable: 'Unavailable',
};

interface OrgRider {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  vehicle_type: string;
  coverage_city: string;
  coverage_lat: number | null;
  coverage_lng: number | null;
  coverage_radius_km: number;
  availability_status: string;
  is_active: boolean;
  has_login: boolean;
  tasks_this_month: number;
  on_time_rate: number;
}

interface RiderForm {
  name: string;
  phone: string;
  vehicle_type: string;
  email: string;
  password: string;
}

const EMPTY_FORM: RiderForm = {
  name: '', phone: '', vehicle_type: 'motorbike', email: '', password: '',
};

const inputStyle: React.CSSProperties = {
  width: '100%', height: 42, background: 'var(--bg-subtle)',
  border: '1.5px solid var(--border-strong)', borderRadius: 10,
  fontSize: 13, color: 'var(--text-primary)', outline: 'none',
  padding: '0 12px', boxSizing: 'border-box',
};

export default function RidersPage() {
  const { user } = useAuth();
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgRiders, setOrgRiders]   = useState<OrgRider[]>([]);
  const [loading, setLoading]       = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRider, setEditRider]   = useState<OrgRider | null>(null);
  const [form, setForm]             = useState<RiderForm>(EMPTY_FORM);
  const [showPass, setShowPass]     = useState(false);
  const [saving, setSaving]         = useState(false);

  const loadRiders = useCallback(async () => {
    try {
      const data = await get<OrgRider[]>('/riders');
      setOrgRiders(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRiders(); }, [loadRiders]);

  const openAdd = () => {
    setEditRider(null);
    setForm(EMPTY_FORM);
    setShowPass(false);
    setDrawerOpen(true);
  };

  const openEdit = (r: OrgRider) => {
    setEditRider(r);
    setForm({ name: r.name, phone: r.phone, vehicle_type: r.vehicle_type, email: r.email ?? '', password: '' });
    setShowPass(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setEditRider(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Enter a valid email address'); return;
    }
    if (!editRider && form.email && !form.password) {
      toast.error('Password is required when setting an email'); return;
    }
    if (form.password && form.password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: form.name,
        phone: form.phone,
        vehicle_type: form.vehicle_type,
      };
      if (form.email) payload.email = form.email;
      if (form.password) payload.password = form.password;

      if (editRider) {
        await put(`/riders/${editRider.id}`, payload);
        toast.success('Rider updated');
      } else {
        await post('/riders', payload);
        toast.success('Rider added');
      }
      closeDrawer();
      loadRiders();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const filtered = orgRiders.filter(r => {
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search) ||
      (r.coverage_city ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.email ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.availability_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 lg:p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Riders
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {orgRiders.filter(r => r.availability_status === 'free').length} available ·{' '}
            {orgRiders.length} total
            {user?.organization?.service_city && (
              <span> · <MapPin size={11} className="inline mb-0.5" /> {user.organization.service_city} ({user.organization.service_radius_km} km)</span>
            )}
          </p>
        </div>
        <Button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Add Rider
        </Button>
      </div>

      {user?.organization?.service_city && (
        <div className="mb-5 px-4 py-3 rounded-[10px] flex items-center gap-3 text-[13px]"
          style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)' }}>
          <Radio size={15} style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <span style={{ color: 'var(--brand)' }}>
            Showing riders whose coverage overlaps with <strong>{user.organization.service_city}</strong> within <strong>{user.organization.service_radius_km} km</strong>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" placeholder="Search riders…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rh-select" style={{ width: 160 }}>
          <option value="all">All statuses</option>
          <option value="free">Available</option>
          <option value="on_route">On Route</option>
          <option value="busy">Busy</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="data-table rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}><div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Rider', 'Vehicle', 'Coverage Area', 'Status', 'Login', 'Tasks / mo.', 'On-time', 'Active', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const VehicleIcon = VEHICLE_ICONS[r.vehicle_type] || Truck;
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
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      <VehicleIcon size={13} />
                      {r.vehicle_type.charAt(0).toUpperCase() + r.vehicle_type.slice(1)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                      <div>
                        <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{r.coverage_city || '—'}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.coverage_radius_km} km radius</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge color={STATUS_COLORS[r.availability_status] as any}>
                      {STATUS_LABELS[r.availability_status] ?? r.availability_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    {r.has_login ? (
                      <div className="flex items-center gap-1.5">
                        <LogIn size={13} style={{ color: 'var(--success)' }} />
                        <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{r.email ?? '—'}</span>
                      </div>
                    ) : (
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No login</span>
                    )}
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
                    {r.is_active
                      ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      : <XCircle size={16} style={{ color: 'var(--text-muted)' }} />}
                  </td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => openEdit(r)}
                      className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-[7px] transition-colors"
                      style={{ color: 'var(--brand)', background: 'var(--brand-subtle)', border: 'none', cursor: 'pointer' }}>
                      <Pencil size={12} /> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
            {loading && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <Truck size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No riders found</p>
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Try adjusting your filters or add a new rider</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards space-y-3">
        {filtered.map(r => {
          const rateColor = r.on_time_rate >= 90 ? 'var(--success)' : r.on_time_rate >= 75 ? 'var(--warning)' : 'var(--danger)';
          return (
            <div key={r.id} className="rounded-[12px] p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                  style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{r.phone}</p>
                  {r.email && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.email}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge color={STATUS_COLORS[r.availability_status] as any}>{STATUS_LABELS[r.availability_status]}</Badge>
                  <span className="text-[12px] font-bold" style={{ color: rateColor }}>{r.on_time_rate}%</span>
                  <button onClick={() => openEdit(r)}
                    className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[6px]"
                    style={{ color: 'var(--brand)', background: 'var(--brand-subtle)', border: 'none', cursor: 'pointer' }}>
                    <Pencil size={11} /> Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-[18px] overflow-hidden"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-modal)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {editRider ? 'Edit Rider' : 'Add Rider'}
              </h2>
              <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 160px)' }}>
              {/* Name */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Full Name *
                </label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. David Kamau" style={inputStyle} />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Phone *
                </label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+254 7XX XXX XXX" style={inputStyle} />
              </div>

              {/* Vehicle type */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Vehicle Type *
                </label>
                <select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
                  className="rh-select" style={{ width: '100%', height: 42 }}>
                  <option value="motorbike">Motorbike</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="car">Car</option>
                  <option value="van">Van</option>
                </select>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 4 }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  Login Credentials
                </p>
                <p className="text-[12px] mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  {editRider
                    ? editRider.has_login
                      ? 'Update the rider\'s email or set a new password.'
                      : 'Add an email + password so this rider can log in to the app.'
                    : 'Provide email and password so the rider can log in immediately.'}
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Email {editRider && !editRider.has_login ? '' : editRider ? '(optional to change)' : '*'}
                </label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="rider@example.com" style={inputStyle} />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Password {editRider ? '(leave blank to keep current)' : ''}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editRider ? 'New password (optional)' : 'Min. 8 characters'}
                    style={{ ...inputStyle, paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <Button variant="secondary" onClick={closeDrawer} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving…' : editRider ? 'Save Changes' : 'Add Rider'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
