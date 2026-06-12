'use client';

import { useState } from 'react';
import { Building2, Users, ClipboardCheck, Activity, Plus, Eye, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';

const PLAN_COLORS: Record<string, string> = {
  starter: 'gray', professional: 'brand', enterprise: 'warning',
};

interface PlatformStats {
  active_organizations: number;
  suspended_organizations: number;
  total_riders: number;
  tasks_today: number;
  platform_uptime: string;
}

interface OrgRow {
  id: number;
  name: string;
  country: string;
  admin_email: string;
  rider_count: number;
  tasks_this_month: number;
  subscription_plan: string;
  status: string;
}

export default function SuperAdminDashboard() {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ name: '', country: '', admin_name: '', admin_email: '', admin_phone: '', plan: 'starter' });

  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ['platform-stats'],
    queryFn: () => get<PlatformStats>('/platform/stats'),
    refetchInterval: 60_000,
  });

  const { data: orgs = [], isLoading: orgsLoading } = useQuery<OrgRow[]>({
    queryKey: ['organizations'],
    queryFn: () => get<OrgRow[]>('/organizations'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => post('/organizations', data),
    onSuccess: () => {
      toast.success(`Organization "${form.name}" created`);
      setDrawerOpen(false);
      setForm({ name: '', country: '', admin_name: '', admin_email: '', admin_phone: '', plan: 'starter' });
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['platform-stats'] });
    },
    onError: () => toast.error('Failed to create organization'),
  });

  const handleCreate = () => {
    if (!form.name || !form.admin_email) { toast.error('Name and admin email are required'); return; }
    createMutation.mutate(form);
  };

  const s = stats ?? { active_organizations: 0, suspended_organizations: 0, total_riders: 0, tasks_today: 0, platform_uptime: '—' };

  const statCards = [
    { label: 'Active Orgs',   value: s.active_organizations, color: 'var(--success)', icon: Building2 },
    { label: 'Total Riders',  value: s.total_riders,          color: 'var(--brand)',   icon: Users },
    { label: 'Tasks Today',   value: s.tasks_today,           color: 'var(--warning)', icon: ClipboardCheck },
    { label: 'Uptime',        value: s.platform_uptime,       color: 'var(--success)', icon: Activity },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)', outline: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13,
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Platform Overview
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {s.active_organizations} active · {s.suspended_organizations} suspended
          </p>
        </div>
        <button onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all"
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Plus size={15} /> New Organization
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="rounded-[14px] p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <p className="text-[28px] font-bold leading-none" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Organizations table */}
      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Organizations</h2>
          <Link href="/super-admin/organizations"
            className="text-[12px] font-medium flex items-center gap-1"
            style={{ color: 'var(--brand)', textDecoration: 'none' }}>
            View all <ChevronRight size={13} />
          </Link>
        </div>
        {orgsLoading ? (
          <div className="py-12 text-center">
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          </div>
        ) : orgs.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No organizations yet</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Create the first organization to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Organization', 'Country', 'Riders', 'Tasks / mo', 'Plan', 'Status', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--text-tertiary)', background: 'var(--bg-subtle)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.slice(0, 5).map((org, i) => (
                  <tr key={org.id} className="transition-colors"
                    style={{ borderBottom: i < Math.min(orgs.length, 5) - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{org.admin_email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{org.country}</td>
                    <td className="px-5 py-3.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{org.rider_count ?? 0}</td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{(org.tasks_this_month ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={PLAN_COLORS[org.subscription_plan] as any}>{org.subscription_plan}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={org.status === 'active' ? 'success' : 'danger'}>{org.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/super-admin/organizations`}
                        className="flex items-center gap-1.5 text-[12px] font-medium"
                        style={{ color: 'var(--brand)', textDecoration: 'none' }}>
                        <Eye size={12} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Org Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[440px] flex flex-col"
            style={{ background: 'var(--bg-surface)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>New Organization</h3>
              <button onClick={() => setDrawerOpen(false)} className="text-[13px] px-3 py-1.5 rounded-[8px]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: 'Organization Name', key: 'name',        placeholder: 'e.g. PathCare Diagnostics' },
                { label: 'Country',           key: 'country',     placeholder: 'e.g. Kenya' },
                { label: 'Admin Full Name',   key: 'admin_name',  placeholder: 'John Doe' },
                { label: 'Admin Email',       key: 'admin_email', placeholder: 'admin@example.com' },
                { label: 'Admin Phone',       key: 'admin_phone', placeholder: '+254700000000' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    {f.label}
                  </label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  Subscription Plan
                </label>
                <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} style={inputStyle}>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={handleCreate} disabled={createMutation.isPending}
                className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold"
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer', opacity: createMutation.isPending ? 0.7 : 1 }}>
                {createMutation.isPending ? 'Creating…' : 'Create Organization'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
