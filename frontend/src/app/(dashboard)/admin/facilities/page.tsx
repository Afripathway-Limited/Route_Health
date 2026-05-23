'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, MapPin, Pencil, History, CheckCircle2, Clock, AlertCircle, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { FAB } from '@/components/ui/FAB';
import { get, post, put, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';

const LocationPickerMap = dynamic(() => import('@/components/maps/LocationPickerMap'), { ssr: false });

type FacilityType = 'lab' | 'clinic' | 'hospital' | 'pharmacy';

const TYPE_COLORS: Record<FacilityType, string> = {
  lab:      'brand',
  clinic:   'success',
  hospital: 'warning',
  pharmacy: 'purple',
};

const HISTORY = [
  { date: 'Today, 08:14',        rider: 'David Kamau',   status: 'completed', delay: 0 },
  { date: 'Yesterday, 08:32',    rider: 'Sarah Wanjiku', status: 'completed', delay: 5 },
  { date: 'Mon 28 Apr, 07:58',   rider: 'David Kamau',   status: 'completed', delay: -2 },
  { date: 'Fri 25 Apr, 09:04',   rider: 'James Otieno',  status: 'failed',    delay: null },
  { date: 'Thu 24 Apr, 08:21',   rider: 'David Kamau',   status: 'completed', delay: 8 },
];

interface FacilityForm {
  name: string;
  address_line_1: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  facility_type: FacilityType;
  contact_name: string;
  contact_phone: string;
}

export default function FacilitiesPage() {
  const { user } = useAuth();
  const orgCountry = user?.organization?.country ?? '';

  const blankForm = useCallback((): FacilityForm => ({
    name: '', address_line_1: '', city: '', country: orgCountry,
    latitude: null, longitude: null,
    facility_type: 'clinic', contact_name: '', contact_phone: '',
  }), [orgCountry]);

  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyFacility, setHistoryFacility] = useState<any | null>(null);
  const [editing, setEditing]       = useState<any | null>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState<FacilityForm>(blankForm());

  const loadFacilities = useCallback(async () => {
    try {
      const data = await get<any[]>('/facilities');
      setFacilities(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load facilities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFacilities(); }, [loadFacilities]);

  const filtered = facilities.filter(f => {
    const matchSearch = !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.city.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || f.facility_type === typeFilter;
    return matchSearch && matchType;
  });

  const openAdd = () => {
    setEditing(null);
    setForm(blankForm());
    setDrawerOpen(true);
  };

  const openEdit = (f: any) => {
    setEditing(f);
    setForm({
      name: f.name,
      address_line_1: f.address_line_1 ?? '',
      city: f.city ?? '',
      country: f.country ?? orgCountry,
      latitude: f.latitude  ? Number(f.latitude)  : null,
      longitude: f.longitude ? Number(f.longitude) : null,
      facility_type: f.facility_type as FacilityType,
      contact_name: f.contact_name ?? '',
      contact_phone: f.contact_phone ?? '',
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.address_line_1 || !form.contact_name || !form.contact_phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!form.latitude || !form.longitude) {
      toast.error('Please pick the facility location on the map');
      return;
    }
    if (!form.country) {
      toast.error('Country is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await put(`/facilities/${editing.id}`, form);
        toast.success('Facility updated');
      } else {
        await post('/facilities', form);
        toast.success('Facility created');
      }
      await loadFacilities();
      setDrawerOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: number) => {
    const facility = facilities.find(f => f.id === id);
    if (!facility) return;
    try {
      await put(`/facilities/${id}`, { is_active: !facility.is_active });
      setFacilities(prev => prev.map(f => f.id === id ? { ...f, is_active: !f.is_active } : f));
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

  const labelStyle: React.CSSProperties = { color: 'var(--text-secondary)' };

  return (
    <div className="p-4 lg:p-8 animate-fade-up">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Facilities
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {facilities.filter(f => f.is_active).length} active · {facilities.length} total
          </p>
        </div>
        <div className="hidden md:block">
          <Button onClick={openAdd}><Plus size={14} /> Add Facility</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search facilities…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rh-select" style={{ width: 160 }}>
          <option value="all">All types</option>
          <option value="lab">Lab</option>
          <option value="clinic">Clinic</option>
          <option value="hospital">Hospital</option>
          <option value="pharmacy">Pharmacy</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="data-table rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Facility', 'Location', 'Contact', 'Type', 'Pickups / mo.', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--brand-subtle)' }}>
                      <MapPin size={14} style={{ color: 'var(--brand)' }} />
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{f.address_line_1}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{f.city}, {f.country}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{f.contact_name}</p>
                  <p className="text-[12px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                    <Phone size={10} /> {f.contact_phone}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <Badge color={TYPE_COLORS[f.facility_type as FacilityType] as any}>
                    {f.facility_type.charAt(0).toUpperCase() + f.facility_type.slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {f.pickups_this_month ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <button onClick={() => toggleStatus(f.id)}
                    className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full transition-all"
                    style={{
                      background: f.is_active ? 'var(--success-subtle)' : 'var(--bg-subtle)',
                      color: f.is_active ? 'var(--success)' : 'var(--text-tertiary)',
                      border: `1px solid ${f.is_active ? 'var(--success-border)' : 'var(--border-subtle)'}`,
                    }}>
                    {f.is_active ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                    {f.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(f)}
                      className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all"
                      style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--bg-hover)'; el.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'none'; el.style.color = 'var(--text-tertiary)'; }}
                      title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setHistoryFacility(f)}
                      className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all"
                      style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--bg-hover)'; el.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'none'; el.style.color = 'var(--text-tertiary)'; }}
                      title="Pickup history">
                      <History size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <MapPin size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No facilities found</p>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Try adjusting your search or filter</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards space-y-3">
        {filtered.map(f => (
          <div key={f.id} className="rounded-[12px] p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--brand-subtle)' }}>
                  <MapPin size={15} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{f.city}, {f.country}</p>
                </div>
              </div>
              <Badge color={TYPE_COLORS[f.facility_type as FacilityType] as any}>{f.facility_type}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{f.contact_name} · {f.contact_phone}</span>
              <div className="flex gap-2">
                <button onClick={() => openEdit(f)} className="text-[12px] font-medium px-2.5 py-1 rounded-[7px]"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => setHistoryFacility(f)} className="text-[12px] font-medium px-2.5 py-1 rounded-[7px]"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>History</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAB mobile */}
      <FAB onClick={openAdd} label="Add Facility"><Plus size={22} /></FAB>

      {/* ─── Add / Edit Drawer ──────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit — ${editing.name}` : 'Add Facility'}
      >
        <div className="space-y-4">
          {/* Facility name */}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={labelStyle}>Facility name *</label>
            <Input
              placeholder="e.g. Westlands Medical Centre"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Address + inline map picker (sets lat/lng) */}
          <LocationPickerMap
            label="Address *"
            lat={form.latitude}
            lng={form.longitude}
            name={form.address_line_1}
            onChangeName={v => setForm(p => ({ ...p, address_line_1: v }))}
            onChangeCoords={(lat, lng) => setForm(p => ({ ...p, latitude: lat, longitude: lng }))}
            placeholder="Street address — tap 📍 to pin on map"
            required
          />

          {/* City + Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={labelStyle}>City *</label>
              <Input
                placeholder="Nairobi"
                value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={labelStyle}>Country *</label>
              <input
                value={form.country}
                onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                placeholder="Kenya"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={labelStyle}>Type</label>
            <select
              value={form.facility_type}
              onChange={e => setForm(p => ({ ...p, facility_type: e.target.value as FacilityType }))}
              className="rh-select"
            >
              <option value="clinic">Clinic</option>
              <option value="lab">Lab</option>
              <option value="hospital">Hospital</option>
              <option value="pharmacy">Pharmacy</option>
            </select>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={labelStyle}>Contact name *</label>
            <Input
              placeholder="Full name"
              value={form.contact_name}
              onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={labelStyle}>Contact phone *</label>
            <Input
              placeholder="+254 700 000000"
              value={form.contact_phone}
              onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))}
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Facility'}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* ─── History Drawer ─────────────────────────────────────────────────── */}
      <Drawer
        open={!!historyFacility}
        onClose={() => setHistoryFacility(null)}
        title={`Pickup History — ${historyFacility?.name ?? ''}`}
      >
        <div className="space-y-3">
          {HISTORY.map((h, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={h.status === 'completed'
                  ? { background: 'var(--success-subtle)', color: 'var(--success)' }
                  : { background: 'var(--danger-subtle)', color: 'var(--danger)' }}
              >
                {h.status === 'completed' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{h.rider}</p>
                  {h.delay !== null && (
                    <span className="text-[11px] font-medium"
                      style={{ color: h.delay <= 0 ? 'var(--success)' : h.delay <= 10 ? 'var(--warning)' : 'var(--danger)' }}>
                      {h.delay <= 0 ? `${Math.abs(h.delay)}m early` : `+${h.delay}m`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock size={10} style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{h.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
