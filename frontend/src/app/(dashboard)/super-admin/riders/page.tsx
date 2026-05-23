'use client';

import { useState, useCallback, useEffect } from 'react';
import { Truck, Plus, Search, MapPin, Edit2, ToggleLeft, ToggleRight, X, Check, Minus, Mail, Clock, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { get, post, put, getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const CoverageMap = dynamic(() => import('@/components/maps/CoverageMap'), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center rounded-[12px]" style={{ background: 'var(--bg-subtle)' }}>
    <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Loading map…</p>
  </div>
) });

// ─── Types ────────────────────────────────────────────────────────────────────

type Availability = 'free' | 'on_route' | 'busy' | 'unavailable';
type VehicleType  = 'motorbike' | 'bicycle' | 'car' | 'van';

interface SArider {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  vehicle_type: VehicleType;
  coverage_city: string;
  coverage_lat: number;
  coverage_lng: number;
  coverage_radius_km: number;
  availability_status: Availability;
  is_active: boolean;
  invitation_pending: boolean;
  tasks_this_month: number;
  on_time_rate: number;
  org_name: string | null;
}

// ─── Config maps ─────────────────────────────────────────────────────────────

const AVAIL_CONFIG: Record<Availability, { label: string; color: string; dot: string }> = {
  free:        { label: 'Free',        color: 'success', dot: 'var(--success)' },
  on_route:    { label: 'On Route',    color: 'brand',   dot: 'var(--brand)'   },
  busy:        { label: 'Busy',        color: 'warning', dot: 'var(--warning)' },
  unavailable: { label: 'Unavailable', color: 'gray',    dot: 'var(--text-muted)' },
};

const VEHICLE_ICONS: Record<VehicleType, string> = {
  motorbike: '🏍️', bicycle: '🚲', car: '🚗', van: '🚐',
};

const VEHICLE_OPTIONS: VehicleType[] = ['motorbike', 'bicycle', 'car', 'van'];
const AVAIL_OPTIONS: Availability[]  = ['free', 'on_route', 'busy', 'unavailable'];

// ─── African city presets for location search ─────────────────────────────────

const CITY_PRESETS = [
  { label: 'Nairobi CBD, Kenya',           lat: -1.2921, lng: 36.8219 },
  { label: 'Westlands, Nairobi',           lat: -1.2641, lng: 36.8042 },
  { label: 'Parklands, Nairobi',           lat: -1.2634, lng: 36.8172 },
  { label: 'Karen, Nairobi',               lat: -1.3289, lng: 36.7116 },
  { label: 'Eastleigh, Nairobi',           lat: -1.2715, lng: 36.8508 },
  { label: 'Upper Hill, Nairobi',          lat: -1.2920, lng: 36.8170 },
  { label: 'Kilimani, Nairobi',            lat: -1.2921, lng: 36.7895 },
  { label: 'Mombasa CBD, Kenya',           lat: -4.0435, lng: 39.6682 },
  { label: 'Dar es Salaam CBD, Tanzania',  lat: -6.8160, lng: 39.2803 },
  { label: 'Kinondoni, Dar es Salaam',     lat: -6.7924, lng: 39.2083 },
  { label: 'Kampala Central, Uganda',      lat:  0.3163, lng: 32.5822 },
  { label: 'Nakasero, Kampala',            lat:  0.3317, lng: 32.5817 },
  { label: 'Lagos Island, Nigeria',        lat:  6.4541, lng: 3.3947  },
  { label: 'Victoria Island, Lagos',       lat:  6.4281, lng: 3.4219  },
  { label: 'Accra CBD, Ghana',             lat:  5.5502, lng: -0.2174 },
  { label: 'Kigali CBD, Rwanda',           lat: -1.9441, lng: 30.0619 },
];

// ─── Default form state ───────────────────────────────────────────────────────

const DEFAULT_FORM = {
  name: '', email: '', phone: '', vehicle_type: 'motorbike' as VehicleType,
  coverage_city: 'Westlands, Nairobi', coverage_lat: -1.2641, coverage_lng: 36.8042,
  coverage_radius_km: 20, availability_status: 'free' as Availability, is_active: true,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperAdminRidersPage() {
  const [riders, setRiders]         = useState<SArider[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState<Availability | 'all'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [form, setForm]             = useState({ ...DEFAULT_FORM });
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [cityQuery, setCityQuery]   = useState('');
  const [showCitySug, setShowCitySug] = useState(false);
  const [inviteModal, setInviteModal] = useState<{ url: string; email: string } | null>(null);

  const loadRiders = useCallback(async () => {
    try {
      const data = await get<SArider[]>('/super-admin/riders');
      setRiders(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRiders(); }, [loadRiders]);

  const cityMatches = cityQuery.length > 0
    ? CITY_PRESETS.filter(c => c.label.toLowerCase().includes(cityQuery.toLowerCase()))
    : CITY_PRESETS.slice(0, 6);

  const filtered = riders.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search) || (r.coverage_city ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.availability_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditId(null);
    setForm({ ...DEFAULT_FORM });
    setPassword('');
    setShowPass(false);
    setCityQuery('');
    setDrawerOpen(true);
  };

  const openEdit = (r: SArider) => {
    setEditId(r.id);
    setForm({
      name: r.name, email: r.email ?? '', phone: r.phone, vehicle_type: r.vehicle_type,
      coverage_city: r.coverage_city, coverage_lat: r.coverage_lat, coverage_lng: r.coverage_lng,
      coverage_radius_km: r.coverage_radius_km, availability_status: r.availability_status, is_active: r.is_active,
    });
    setPassword('');
    setShowPass(false);
    setCityQuery(r.coverage_city);
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setEditId(null); setShowCitySug(false); setPassword(''); };

  const handleSave = async () => {
    if (!form.name.trim())  { toast.error('Rider name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
    if (editId === null && !form.email.trim()) { toast.error('Email is required to send invitation'); return; }
    if (password && password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      if (editId !== null) {
        const payload: Record<string, unknown> = { ...form };
        if (password) payload.password = password;
        await put(`/super-admin/riders/${editId}`, payload);
        toast.success('Rider updated');
        await loadRiders();
        closeDrawer();
      } else {
        const res = await post<{ invite_url: string }>('/super-admin/riders', form);
        await loadRiders();
        closeDrawer();
        // Show invite link modal so admin can copy/share if email fails
        const inviteUrl = (res as any)?.invite_url ?? '';
        if (inviteUrl) {
          setInviteModal({ url: inviteUrl, email: form.email });
        } else {
          toast.success('Rider created — invitation sent');
        }
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async (rider: SArider) => {
    try {
      const res = await post<{ invite_url: string }>(`/super-admin/riders/${rider.id}/resend-invitation`, {});
      const inviteUrl = (res as any)?.invite_url ?? '';
      setInviteModal({ url: inviteUrl, email: rider.email ?? '' });
      toast.success('Invitation refreshed');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const toggleActive = async (id: number) => {
    const rider = riders.find(r => r.id === id);
    if (!rider) return;
    try {
      await put(`/super-admin/riders/${id}`, { is_active: !rider.is_active });
      setRiders(prev => prev.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
      toast.success(rider.is_active ? `${rider.name} deactivated` : `${rider.name} activated`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const setCity = (c: typeof CITY_PRESETS[0]) => {
    setForm(f => ({ ...f, coverage_city: c.label, coverage_lat: c.lat, coverage_lng: c.lng }));
    setCityQuery(c.label);
    setShowCitySug(false);
  };

  const onMapPinMove = useCallback((lat: number, lng: number) => {
    setForm(f => ({ ...f, coverage_lat: lat, coverage_lng: lng }));
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total       = riders.length;
  const active      = riders.filter(r => r.is_active).length;
  const onRouteNow  = riders.filter(r => r.availability_status === 'on_route').length;
  const unavailable = riders.filter(r => r.availability_status === 'unavailable').length;

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)', outline: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 13,
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Rider Fleet</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>All riders across the platform · managed by RouteHealth</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} className="mr-1.5" />Add Rider</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Total Riders',  value: total,       color: 'var(--text-primary)',  bg: 'var(--bg-surface)' },
          { label: 'Active',        value: active,      color: 'var(--success)',        bg: 'var(--success-subtle)' },
          { label: 'On Route Today',value: onRouteNow,  color: 'var(--brand)',          bg: 'var(--brand-subtle)' },
          { label: 'Unavailable',   value: unavailable, color: 'var(--text-secondary)', bg: 'var(--bg-surface)' },
        ].map(s => (
          <div key={s.label} className="rounded-[14px] p-4 flex items-center gap-3"
            style={{ background: s.bg, boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-[28px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search riders, phone, city…"
            style={{ ...inputStyle, paddingLeft: 34 }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', ...AVAIL_OPTIONS] as const).map(s => (
            <button key={s} onClick={() => setFilter(s as any)}
              className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all"
              style={{
                background: filterStatus === s ? 'var(--brand)' : 'var(--bg-surface)',
                color:      filterStatus === s ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${filterStatus === s ? 'var(--brand)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}>
              {s === 'all' ? 'All' : AVAIL_CONFIG[s as Availability].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
              {['Rider', 'Vehicle', 'Coverage Area', 'Status', 'Tasks / Month', 'On-Time', 'Assigned Org', 'Active'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No riders match your filters</td></tr>
            )}
            {filtered.map((r, i) => {
              const av = AVAIL_CONFIG[r.availability_status] ?? AVAIL_CONFIG.unavailable;
              return (
                <tr key={r.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {/* Rider */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
                          style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                          {r.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                          style={{ background: av.dot }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                          {r.invitation_pending && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: 'var(--warning-subtle)', color: 'var(--warning)', border: '1px solid var(--warning-border)' }}>
                              <Clock size={9} /> Pending
                            </span>
                          )}
                        </div>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.email ?? r.phone}</p>
                      </div>
                    </div>
                  </td>
                  {/* Vehicle */}
                  <td className="px-4 py-3">
                    <span className="text-[13px]">{VEHICLE_ICONS[r.vehicle_type as VehicleType]} {r.vehicle_type}</span>
                  </td>
                  {/* Coverage */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                      <div>
                        <p className="text-[12px]" style={{ color: 'var(--text-primary)' }}>{r.coverage_city}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.coverage_radius_km} km radius</p>
                      </div>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge color={av.color as any}>{av.label}</Badge>
                  </td>
                  {/* Tasks */}
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-primary)' }}>{r.tasks_this_month}</td>
                  {/* On-time */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${r.on_time_rate}%`, background: r.on_time_rate >= 90 ? 'var(--success)' : r.on_time_rate >= 75 ? 'var(--warning)' : 'var(--danger)' }} />
                      </div>
                      <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{r.on_time_rate}%</span>
                    </div>
                  </td>
                  {/* Org */}
                  <td className="px-4 py-3 text-[12px]" style={{ color: r.org_name ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {r.org_name ?? '— unassigned —'}
                  </td>
                  {/* Active toggle */}
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      {r.is_active
                        ? <ToggleRight size={22} style={{ color: 'var(--success)' }} />
                        : <ToggleLeft  size={22} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {r.invitation_pending && (
                        <button onClick={() => handleResendInvite(r)} title="Resend / show invitation link"
                          className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all"
                          style={{ background: 'var(--warning-subtle)', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--warning)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--warning-subtle)')}>
                          <RefreshCw size={12} style={{ color: 'var(--warning)' }} />
                        </button>
                      )}
                      <button onClick={() => openEdit(r)}
                        className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all"
                        style={{ background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}>
                        <Edit2 size={13} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Create / Edit Drawer ───────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={closeDrawer} />

          {/* Panel */}
          <div className="relative ml-auto flex flex-col"
            style={{ width: 'min(680px, 100vw)', height: '100%', background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xl)', overflowY: 'auto' }}>

            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  {editId !== null ? 'Edit Rider' : 'Add New Rider'}
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {editId !== null ? 'Update rider details and coverage area' : 'Create a new rider and set their coverage area on the map'}
                </p>
              </div>
              <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-5">

              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. David Kamau" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>WhatsApp Phone *</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+254 722 000 000" style={inputStyle} />
                </div>
              </div>

              {/* Email — required for new riders (invitation sent here) */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Email Address {editId === null && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="rider@example.com"
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>
                {editId === null ? (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    An invitation email will be sent to this address. Rider activates account by setting their password.
                  </p>
                ) : (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Update email to change the login address.
                  </p>
                )}
              </div>

              {/* Password — edit mode only */}
              {editId !== null && (
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    New Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      style={{ ...inputStyle, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vehicle type */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Vehicle Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VEHICLE_OPTIONS.map(v => (
                      <button key={v} type="button" onClick={() => setForm(f => ({ ...f, vehicle_type: v }))}
                        className="flex items-center gap-2 px-3 py-2 rounded-[9px] text-[12px] font-medium transition-all"
                        style={{
                          background: form.vehicle_type === v ? 'var(--brand-subtle)' : 'var(--bg-subtle)',
                          border: `1.5px solid ${form.vehicle_type === v ? 'var(--brand-border)' : 'transparent'}`,
                          color: form.vehicle_type === v ? 'var(--brand)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}>
                        <span>{VEHICLE_ICONS[v]}</span> {v}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Availability */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Initial Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAIL_OPTIONS.map(a => {
                      const cfg = AVAIL_CONFIG[a];
                      return (
                        <button key={a} type="button" onClick={() => setForm(f => ({ ...f, availability_status: a }))}
                          className="flex items-center gap-2 px-3 py-2 rounded-[9px] text-[12px] font-medium transition-all"
                          style={{
                            background: form.availability_status === a ? 'var(--bg-elevated)' : 'var(--bg-subtle)',
                            border: `1.5px solid ${form.availability_status === a ? 'var(--border-strong)' : 'transparent'}`,
                            color: 'var(--text-secondary)', cursor: 'pointer',
                          }}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Coverage Area ─────────────────────────────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} style={{ color: 'var(--brand)' }} />
                  <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Coverage Area</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                    {form.coverage_radius_km} km radius
                  </span>
                </div>

                {/* City search */}
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    value={cityQuery}
                    onChange={e => { setCityQuery(e.target.value); setShowCitySug(true); }}
                    onFocus={() => setShowCitySug(true)}
                    placeholder="Search city or area…"
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                  {showCitySug && cityMatches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-[10px] overflow-hidden"
                      style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-subtle)', zIndex: 9999 }}>
                      {cityMatches.map(c => (
                        <button key={c.label} type="button"
                          onMouseDown={() => setCity(c)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] transition-all"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          <MapPin size={11} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Map — isolation:isolate contains Leaflet's high z-indices so dropdowns above stay on top */}
                <div className="rounded-[12px] overflow-hidden" style={{ height: 260, border: '1px solid var(--border-subtle)', isolation: 'isolate' }}>
                  <CoverageMap
                    lat={form.coverage_lat}
                    lng={form.coverage_lng}
                    radius={form.coverage_radius_km}
                    onPinMove={onMapPinMove}
                  />
                </div>

                {/* Radius slider */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Coverage Radius</label>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--brand)' }}>{form.coverage_radius_km} km</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setForm(f => ({ ...f, coverage_radius_km: Math.max(5, f.coverage_radius_km - 5) }))}
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                      <Minus size={12} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <input type="range" min={5} max={100} step={5}
                      value={form.coverage_radius_km}
                      onChange={e => setForm(f => ({ ...f, coverage_radius_km: Number(e.target.value) }))}
                      style={{ flex: 1, accentColor: 'var(--brand)', cursor: 'pointer' }}
                    />
                    <button type="button" onClick={() => setForm(f => ({ ...f, coverage_radius_km: Math.min(100, f.coverage_radius_km + 5) }))}
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                      <Plus size={12} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>5 km</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>50 km</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>100 km</span>
                  </div>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 rounded-[12px]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Active on Platform</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Inactive riders cannot be assigned any routes</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
                  {form.is_active
                    ? <ToggleRight size={28} style={{ color: 'var(--success)' }} />
                    : <ToggleLeft  size={28} style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <button onClick={closeDrawer}
                className="px-4 py-2 rounded-[9px] text-[13px] font-medium"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <Button onClick={handleSave} disabled={saving}>
                <Check size={14} className="mr-1.5" />{saving ? 'Saving…' : editId !== null ? 'Save Changes' : 'Create Rider'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Invite Link Modal ─────────────────────────────────────────────── */}
      <Modal open={!!inviteModal} onClose={() => setInviteModal(null)} title="Invitation Created">
        {inviteModal && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-[10px]" style={{ background: 'var(--success-subtle)', border: '1px solid var(--success-border)' }}>
              <Mail size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--success)' }}>Invitation sent to {inviteModal.email}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  The rider will receive an email with a link to set their password. You can also share the link below manually.
                </p>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Invitation Link (valid 7 days)</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteModal.url}
                  style={{ flex: 1, height: 36, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', padding: '0 10px', outline: 'none' }}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteModal.url); toast.success('Link copied!'); }}
                  className="flex items-center gap-1.5 px-3 rounded-[8px] text-[12px] font-medium"
                  style={{ background: 'var(--brand-subtle)', color: 'var(--brand)', border: '1px solid var(--brand-border)', cursor: 'pointer', flexShrink: 0 }}>
                  <Copy size={12} /> Copy
                </button>
              </div>
            </div>
            <button onClick={() => setInviteModal(null)}
              className="w-full h-10 rounded-[10px] text-[13px] font-semibold"
              style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
