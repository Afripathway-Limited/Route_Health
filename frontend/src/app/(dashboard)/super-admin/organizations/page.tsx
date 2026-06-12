'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Search, Building2, PauseCircle, PlayCircle, X, MapPin, Minus, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { get, post, put, patch, getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const CoverageMap = dynamic(() => import('@/components/maps/CoverageMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center rounded-[12px]" style={{ background: 'var(--bg-subtle)' }}>
      <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Loading map…</p>
    </div>
  ),
});

const PLAN_COLORS: Record<string, string> = {
  starter: 'gray', professional: 'brand', enterprise: 'warning',
};

const CITY_PRESETS = [
  { label: 'Nairobi, Kenya',              lat: -1.2921, lng: 36.8219 },
  { label: 'Mombasa, Kenya',              lat: -4.0435, lng: 39.6682 },
  { label: 'Kisumu, Kenya',               lat: -0.1022, lng: 34.7617 },
  { label: 'Dar es Salaam, Tanzania',     lat: -6.8160, lng: 39.2803 },
  { label: 'Arusha, Tanzania',            lat: -3.3869, lng: 36.6830 },
  { label: 'Kampala, Uganda',             lat:  0.3163, lng: 32.5822 },
  { label: 'Kigali, Rwanda',              lat: -1.9441, lng: 30.0619 },
  { label: 'Lagos, Nigeria',              lat:  6.5244, lng:  3.3792 },
  { label: 'Abuja, Nigeria',              lat:  9.0765, lng:  7.3986 },
  { label: 'Accra, Ghana',                lat:  5.6037, lng: -0.1870 },
  { label: 'Addis Ababa, Ethiopia',       lat:  9.0320, lng: 38.7469 },
  { label: 'Johannesburg, South Africa',  lat: -26.2041, lng: 28.0473 },
  { label: 'Cape Town, South Africa',     lat: -33.9249, lng: 18.4241 },
  { label: 'Lusaka, Zambia',              lat: -15.3875, lng: 28.3228 },
  { label: 'Harare, Zimbabwe',            lat: -17.8292, lng: 31.0522 },
  { label: 'Nairobi CBD, Kenya',          lat: -1.2864, lng: 36.8172 },
  { label: 'Westlands, Nairobi',          lat: -1.2641, lng: 36.8042 },
  { label: 'Kinondoni, Dar es Salaam',    lat: -6.7924, lng: 39.2083 },
];

interface OrgRow {
  id: number;
  name: string;
  country: string;
  status: string;
  subscription_plan: string;
  admin_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  rider_count: number;
  tasks_this_month: number;
  service_city: string | null;
  service_lat: number | null;
  service_lng: number | null;
  service_radius_km: number | null;
  created_at: string;
}

const DEFAULT_FORM = {
  name: '', country: '', admin_name: '', admin_email: '', admin_phone: '', admin_password: '',
  subscription_plan: 'starter',
  service_city: 'Nairobi, Kenya', service_lat: -1.2921, service_lng: 36.8219, service_radius_km: 30,
};

export default function OrganizationsPage() {
  const [orgs, setOrgs]             = useState<OrgRow[]>([]);
  const [countries, setCountries]   = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editOrg, setEditOrg]       = useState<OrgRow | null>(null);
  const [form, setForm]             = useState({ ...DEFAULT_FORM });
  const [saving, setSaving]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Country combobox state
  const [countryQuery, setCountryQuery]   = useState('');
  const [showCountrySug, setShowCountrySug] = useState(false);

  // City combobox state
  const [cityQuery, setCityQuery]         = useState('');
  const [showCitySug, setShowCitySug]     = useState(false);

  const loadOrgs = useCallback(async () => {
    try {
      const data = await get<OrgRow[]>('/super-admin/organizations');
      setOrgs(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrgs();
    get<{ id: number; name: string }[]>('/countries').then(data => {
      setCountries((Array.isArray(data) ? data : []).map(c => c.name));
    }).catch(() => {});
  }, [loadOrgs]);

  const countryMatches = useMemo(() =>
    countryQuery.length === 0
      ? countries.slice(0, 8)
      : countries.filter(c => c.toLowerCase().includes(countryQuery.toLowerCase())).slice(0, 10),
    [countryQuery, countries]);

  const cityMatches = useMemo(() =>
    cityQuery.length === 0
      ? CITY_PRESETS.slice(0, 6)
      : CITY_PRESETS.filter(c => c.label.toLowerCase().includes(cityQuery.toLowerCase())),
    [cityQuery]);

  const filtered = useMemo(() =>
    orgs.filter(o => {
      const ms = !search || o.name.toLowerCase().includes(search.toLowerCase()) || (o.admin_email ?? '').toLowerCase().includes(search.toLowerCase());
      const mst = statusFilter === 'all' || o.status === statusFilter;
      return ms && mst;
    }), [orgs, search, statusFilter]);

  const openCreate = () => {
    setEditOrg(null);
    setForm({ ...DEFAULT_FORM });
    setCountryQuery('');
    setCityQuery('Nairobi, Kenya');
    setShowPassword(false);
    setDrawerOpen(true);
  };

  const openEdit = (org: OrgRow) => {
    setEditOrg(org);
    setForm({
      name: org.name, country: org.country,
      admin_name: org.admin_name ?? '', admin_email: org.admin_email ?? '', admin_phone: '',
      admin_password: '',
      subscription_plan: org.subscription_plan,
      service_city: (org as any).service_city ?? 'Nairobi, Kenya',
      service_lat:  (org as any).service_lat  ?? -1.2921,
      service_lng:  (org as any).service_lng  ?? 36.8219,
      service_radius_km: (org as any).service_radius_km ?? 30,
    });
    setCountryQuery(org.country ?? '');
    setCityQuery((org as any).service_city ?? 'Nairobi, Kenya');
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.admin_email) { toast.error('Name and admin email are required'); return; }
    setSaving(true);
    try {
      if (editOrg) {
        await put(`/super-admin/organizations/${editOrg.id}`, form);
        toast.success('Organization updated');
      } else {
        await post('/super-admin/organizations', form);
        toast.success(`${form.name} created`);
      }
      await loadOrgs();
      setDrawerOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: number, current: string) => {
    const action = current === 'active' ? 'suspend' : 'activate';
    try {
      await patch(`/super-admin/organizations/${id}/${action}`);
      setOrgs(prev => prev.map(o => o.id === id ? { ...o, status: action === 'suspend' ? 'suspended' : 'active' } : o));
      toast.success(`Organization ${action === 'suspend' ? 'suspended' : 'activated'}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const selectCity = (c: typeof CITY_PRESETS[0]) => {
    setForm(f => ({ ...f, service_city: c.label, service_lat: c.lat, service_lng: c.lng }));
    setCityQuery(c.label);
    setShowCitySug(false);
  };

  const onMapPinMove = useCallback((lat: number, lng: number) => {
    setForm(f => ({ ...f, service_lat: lat, service_lng: lng }));
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-strong)',
    color: 'var(--text-primary)', outline: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13,
    boxSizing: 'border-box',
  };

  const smallInputStyle: React.CSSProperties = {
    height: 30, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
    borderRadius: 7, fontSize: 11, color: 'var(--text-tertiary)', outline: 'none',
    padding: '0 8px', boxSizing: 'border-box', width: '100%', cursor: 'default', opacity: 0.8,
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Organizations</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {orgs.filter(o => o.status === 'active').length} active · {orgs.filter(o => o.status === 'suspended').length} suspended
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold"
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Plus size={15} /> New Organization
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations..."
            className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 rounded-[10px] text-[13px]"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Building2 size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No organizations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Organization', 'Service Area', 'Country', 'Admin', 'Riders', 'Tasks / mo', 'Plan', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--text-tertiary)', background: 'var(--bg-subtle)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((org, i) => (
                  <tr key={org.id} className="transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {(org as any).service_city ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={11} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                          <div>
                            <p className="text-[12px]" style={{ color: 'var(--text-primary)' }}>{(org as any).service_city}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{(org as any).service_radius_km} km radius</p>
                          </div>
                        </div>
                      ) : <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{org.country}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{org.admin_name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{org.admin_email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{org.rider_count}</td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{org.tasks_this_month.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={PLAN_COLORS[org.subscription_plan] as any}>{org.subscription_plan}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={org.status === 'active' ? 'success' : 'danger'}>{org.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(org)}
                          className="px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button onClick={() => toggleStatus(org.id, org.status)}
                          className="w-7 h-7 rounded-[7px] flex items-center justify-center"
                          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', cursor: 'pointer', color: org.status === 'active' ? 'var(--warning)' : 'var(--success)' }}>
                          {org.status === 'active' ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-y-auto"
            style={{ width: 'min(600px, 100vw)', background: 'var(--bg-surface)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {editOrg ? 'Edit Organization' : 'New Organization'}
                </h3>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Set the organization's service area to auto-match nearby riders
                </p>
              </div>
              <button onClick={() => setDrawerOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 p-5 space-y-5">

              {/* Organization Name */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Organization Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. PathCare Diagnostics" style={inputStyle} />
              </div>

              {/* Country — searchable combobox */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Country</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    value={countryQuery}
                    onChange={e => { setCountryQuery(e.target.value); setForm(p => ({ ...p, country: e.target.value })); setShowCountrySug(true); }}
                    onFocus={() => setShowCountrySug(true)}
                    onBlur={() => setTimeout(() => setShowCountrySug(false), 150)}
                    placeholder="Type to search countries…"
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                  {showCountrySug && countryMatches.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 rounded-[10px] overflow-hidden"
                      style={{
                        top: '100%',
                        zIndex: 999,
                        background: 'var(--bg-elevated)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                        border: '1px solid var(--border-subtle)',
                        maxHeight: 220,
                        overflowY: 'auto',
                      }}>
                      {countryMatches.map(c => (
                        <button key={c} type="button"
                          onMouseDown={() => {
                            setCountryQuery(c);
                            setForm(p => ({ ...p, country: c }));
                            setShowCountrySug(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px]"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Admin info */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Admin Full Name',  key: 'admin_name',  placeholder: 'John Doe',          span: false },
                  { label: 'Admin Phone',      key: 'admin_phone', placeholder: '+254700000000',     span: false },
                  { label: 'Admin Email *',    key: 'admin_email', placeholder: 'admin@example.com', span: true  },
                ].map(f => (
                  <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                    <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} style={inputStyle} />
                  </div>
                ))}

                {/* Password — only shown when creating a new org */}
                {!editOrg && (
                  <div className="col-span-2">
                    <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Admin Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.admin_password}
                        onChange={e => setForm(p => ({ ...p, admin_password: e.target.value }))}
                        placeholder="Min 8 characters"
                        style={{ ...inputStyle, paddingRight: 40 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 0 }}>
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      This will be the admin's initial login password
                    </p>
                  </div>
                )}
              </div>

              {/* Plan */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Subscription Plan</label>
                <select value={form.subscription_plan} onChange={e => setForm(p => ({ ...p, subscription_plan: e.target.value }))} style={inputStyle}>
                  <option value="starter">Starter — $50/mo</option>
                  <option value="professional">Professional — $120/mo</option>
                  <option value="enterprise">Enterprise — $250/mo</option>
                </select>
              </div>

              {/* ── Service Area ─────────────────────────────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} style={{ color: 'var(--brand)' }} />
                  <h4 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Service Area</h4>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                    {form.service_radius_km} km radius
                  </span>
                </div>
                <p className="text-[12px] mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  Only riders whose coverage area overlaps with this zone will be visible to this organization.
                </p>

                {/* City search — z-index higher than map */}
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    value={cityQuery}
                    onChange={e => { setCityQuery(e.target.value); setShowCitySug(true); }}
                    onFocus={() => setShowCitySug(true)}
                    onBlur={() => setTimeout(() => setShowCitySug(false), 150)}
                    placeholder="Search city…"
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                  {showCitySug && cityMatches.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 rounded-[10px] overflow-hidden"
                      style={{
                        top: '100%',
                        zIndex: 999,
                        background: 'var(--bg-elevated)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                        border: '1px solid var(--border-subtle)',
                      }}>
                      {cityMatches.map(c => (
                        <button key={c.label} type="button"
                          onMouseDown={() => selectCity(c)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px]"
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

                {/* Map — isolation: isolate so Leaflet z-indices stay contained */}
                <div
                  className="rounded-[12px] overflow-hidden"
                  style={{ height: 240, border: '1px solid var(--border-subtle)', isolation: 'isolate', position: 'relative' }}>
                  <CoverageMap
                    lat={form.service_lat} lng={form.service_lng}
                    radius={form.service_radius_km} onPinMove={onMapPinMove}
                  />
                </div>

                {/* Lat / Lng readout */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Latitude</p>
                    <input
                      disabled readOnly
                      value={form.service_lat !== null ? form.service_lat.toFixed(6) : ''}
                      placeholder="—"
                      style={smallInputStyle}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Longitude</p>
                    <input
                      disabled readOnly
                      value={form.service_lng !== null ? form.service_lng.toFixed(6) : ''}
                      placeholder="—"
                      style={smallInputStyle}
                    />
                  </div>
                </div>

                {/* Radius slider */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Service Radius</label>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--brand)' }}>{form.service_radius_km} km</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setForm(f => ({ ...f, service_radius_km: Math.max(5, f.service_radius_km - 5) }))}
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                      <Minus size={12} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <input type="range" min={5} max={200} step={5}
                      value={form.service_radius_km}
                      onChange={e => setForm(f => ({ ...f, service_radius_km: +e.target.value }))}
                      style={{ flex: 1, accentColor: 'var(--brand)', cursor: 'pointer' }} />
                    <button type="button" onClick={() => setForm(f => ({ ...f, service_radius_km: Math.min(200, f.service_radius_km + 5) }))}
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                      <Plus size={12} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={handleSave}
                className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold"
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {saving ? 'Saving…' : editOrg ? 'Save Changes' : 'Create Organization'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
