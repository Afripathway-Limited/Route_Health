'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Check, Users, Building2, ClipboardList, Zap, X, Minus, ToggleLeft, ToggleRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { get, post, put, del, getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: number;
  name: string;
  display_name: string;
  price_usd_monthly: number;
  price_usd_annual: number;
  max_riders: number;
  max_facilities: number;
  max_tasks_per_month: number;
  max_dispatchers: number;
  features: string[];
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
}

const PLAN_ACCENT: Record<string, { border: string; badge: string; bg: string }> = {
  starter:      { border: 'var(--info)',    badge: 'info',    bg: 'var(--info-subtle)'    },
  professional: { border: 'var(--brand)',   badge: 'brand',   bg: 'var(--brand-subtle)'   },
  enterprise:   { border: 'var(--success)', badge: 'success', bg: 'var(--success-subtle)' },
};

const DEFAULT_PLAN: Omit<Plan, 'id'> = {
  name: '', display_name: '', price_usd_monthly: 0, price_usd_annual: 0,
  max_riders: 10, max_facilities: 20, max_tasks_per_month: 500, max_dispatchers: 2,
  features: [], is_active: true, is_public: true, sort_order: 0,
};

const fmt = (v: number) => v === -1 ? '∞' : v.toLocaleString();

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PackagesPage() {
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [form, setForm]             = useState<Omit<Plan, 'id'>>({ ...DEFAULT_PLAN });
  const [featureInput, setFeatureInput] = useState('');
  const [saving, setSaving]         = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const data = await get<Plan[]>('/super-admin/plans');
      setPlans(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)', outline: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 13,
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...DEFAULT_PLAN });
    setFeatureInput('');
    setDrawerOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditId(p.id);
    setForm({ name: p.name, display_name: p.display_name, price_usd_monthly: p.price_usd_monthly,
      price_usd_annual: p.price_usd_annual, max_riders: p.max_riders, max_facilities: p.max_facilities,
      max_tasks_per_month: p.max_tasks_per_month, max_dispatchers: p.max_dispatchers, features: [...p.features],
      is_active: p.is_active, is_public: p.is_public, sort_order: p.sort_order });
    setFeatureInput('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setEditId(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.display_name.trim()) { toast.error('Plan key and display name are required'); return; }
    setSaving(true);
    try {
      if (editId !== null) {
        await put(`/super-admin/plans/${editId}`, form);
        toast.success('Plan updated');
      } else {
        await post('/super-admin/plans', form);
        toast.success('Plan created');
      }
      await loadPlans();
      closeDrawer();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const plan = plans.find(p => p.id === id);
    try {
      await del(`/super-admin/plans/${id}`);
      setPlans(prev => prev.filter(p => p.id !== id));
      toast.success(`${plan?.display_name} deleted`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const addFeature = () => {
    const v = featureInput.trim();
    if (v && !form.features.includes(v)) {
      setForm(f => ({ ...f, features: [...f.features, v] }));
      setFeatureInput('');
    }
  };

  const removeFeature = (feat: string) =>
    setForm(f => ({ ...f, features: f.features.filter(x => x !== feat) }));

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Subscription Plans</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Manage pricing tiers and feature limits for organisations</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} className="mr-1.5" />Create Plan</Button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {plans.map(plan => {
          const accent = PLAN_ACCENT[plan.name] ?? { border: 'var(--border-subtle)', badge: 'gray', bg: 'var(--bg-subtle)' };
          return (
            <div key={plan.id} className="rounded-[18px] flex flex-col overflow-hidden"
              style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)', borderTop: `3px solid ${accent.border}` }}>

              {/* Card header */}
              <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{plan.display_name}</span>
                    <Badge color={accent.badge as any}>{plan.name}</Badge>
                    {!plan.is_active && <Badge color="gray">Inactive</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(plan)}
                      className="w-7 h-7 rounded-[7px] flex items-center justify-center"
                      style={{ background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}>
                      <Edit2 size={13} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button onClick={() => handleDelete(plan.id)}
                      className="w-7 h-7 rounded-[7px] flex items-center justify-center"
                      style={{ background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}>
                      <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                    </button>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[32px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>${plan.price_usd_monthly}</span>
                  <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>/mo</span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  ${plan.price_usd_annual}/yr · save {Math.round((1 - plan.price_usd_annual / (plan.price_usd_monthly * 12)) * 100)}%
                </p>
              </div>

              {/* Limits grid */}
              <div className="px-5 py-4 grid grid-cols-2 gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {[
                  { icon: Users,       label: 'Riders',       value: fmt(plan.max_riders)           },
                  { icon: Building2,   label: 'Facilities',   value: fmt(plan.max_facilities)       },
                  { icon: ClipboardList, label: 'Tasks/mo',   value: fmt(plan.max_tasks_per_month)  },
                  { icon: Zap,         label: 'Dispatchers',  value: fmt(plan.max_dispatchers)      },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2 rounded-[9px] px-3 py-2"
                    style={{ background: accent.bg }}>
                    <Icon size={12} style={{ color: accent.border, flexShrink: 0 }} />
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                    <span className="text-[12px] font-semibold ml-auto" style={{ color: 'var(--text-primary)' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="px-5 py-4 flex-1">
                <ul className="space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                      <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={closeDrawer} />
          <div className="relative ml-auto flex flex-col"
            style={{ width: 'min(560px, 100vw)', height: '100%', background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xl)', overflowY: 'auto' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {editId !== null ? 'Edit Plan' : 'Create Plan'}
              </h2>
              <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-5">

              {/* Identity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Plan Key *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    disabled={editId !== null}
                    placeholder="e.g. starter" style={{ ...inputStyle, opacity: editId !== null ? 0.5 : 1 }} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Display Name *</label>
                  <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                    placeholder="e.g. Starter" style={inputStyle} />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Monthly Price (USD)</label>
                  <input type="number" value={form.price_usd_monthly} onChange={e => setForm(f => ({ ...f, price_usd_monthly: +e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Annual Price (USD)</label>
                  <input type="number" value={form.price_usd_annual} onChange={e => setForm(f => ({ ...f, price_usd_annual: +e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>

              {/* Limits */}
              <div>
                <label className="block text-[12px] font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Limits (use -1 for unlimited)</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'max_riders' as const,          label: 'Max Riders'      },
                    { key: 'max_facilities' as const,       label: 'Max Facilities'  },
                    { key: 'max_tasks_per_month' as const,  label: 'Tasks / Month'   },
                    { key: 'max_dispatchers' as const,      label: 'Dispatchers'     },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
                      <input type="number" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: +e.target.value }))} style={inputStyle} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Features</label>
                <div className="flex gap-2 mb-3">
                  <input value={featureInput} onChange={e => setFeatureInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                    placeholder="Type a feature and press Enter…" style={{ ...inputStyle, flex: 1 }} />
                  <button type="button" onClick={addFeature}
                    className="px-3 rounded-[10px] text-[12px] font-medium flex-shrink-0"
                    style={{ background: 'var(--brand-subtle)', color: 'var(--brand)', border: '1px solid var(--brand-border)', cursor: 'pointer' }}>
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.features.map(f => (
                    <span key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: 'var(--success-subtle)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>
                      {f}
                      <button type="button" onClick={() => removeFeature(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                {[
                  { key: 'is_active' as const, label: 'Active', sub: 'Orgs can be assigned this plan' },
                  { key: 'is_public' as const, label: 'Public', sub: 'Visible on the public pricing page' },
                ].map(({ key, label, sub }) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-[10px]"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}>
                      {form[key]
                        ? <ToggleRight size={24} style={{ color: 'var(--success)' }} />
                        : <ToggleLeft  size={24} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={closeDrawer}
                className="px-4 py-2 rounded-[9px] text-[13px] font-medium"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <Button onClick={handleSave} disabled={saving}>
                <Check size={14} className="mr-1.5" />{saving ? 'Saving…' : editId !== null ? 'Save Changes' : 'Create Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
