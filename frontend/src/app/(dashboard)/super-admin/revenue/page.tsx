'use client';

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Building2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] px-3 py-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 12 }}>
      <p style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="font-semibold" style={{ color: 'var(--brand)' }}>${payload[0].value?.toLocaleString()}</p>
    </div>
  );
};

interface RevenueData {
  mrr: number;
  arr: number;
  active_paying_orgs: number;
  mrr_history: { month: string; mrr: number }[];
  organizations: {
    id: number; name: string; plan: string;
    monthly_value: number; status: string;
    next_billing: string | null; billing_cycle: string;
  }[];
}

export default function RevenuePage() {
  const { data, isLoading } = useQuery<RevenueData>({
    queryKey: ['revenue'],
    queryFn: () => get<RevenueData>('/revenue'),
  });

  const d: RevenueData = data ?? {
    mrr: 0, arr: 0, active_paying_orgs: 0,
    mrr_history: [], organizations: [],
  };

  const stats = [
    { label: 'Monthly Recurring Revenue', value: `$${d.mrr.toLocaleString()}`,        sub: 'Current MRR',                    icon: DollarSign,   color: 'var(--brand)' },
    { label: 'Annual Run Rate',            value: `$${d.arr.toLocaleString()}`,        sub: 'Based on current MRR',           icon: TrendingUp,   color: 'var(--success)' },
    { label: 'Active Subscriptions',       value: String(d.active_paying_orgs),        sub: 'Paying organisations',           icon: Building2,    color: 'var(--info)' },
    { label: 'Total Organisations',        value: String(d.organizations.length),      sub: 'With subscription records',      icon: AlertTriangle, color: 'var(--warning)' },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Revenue & Billing
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          Subscription revenue and billing overview across all organisations
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
              <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon size={15} style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-[26px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* MRR trend chart */}
      <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)' }}>
        <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>MRR Trend (Last 12 Months)</h2>
        {d.mrr_history.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No billing history yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.mrr_history} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--brand)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="mrr" stroke="var(--brand)" strokeWidth={2} fill="url(#mrrGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Billing table */}
      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Subscription Details</h2>
        </div>
        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          </div>
        ) : d.organizations.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>No subscription data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Organisation', 'Plan', 'Monthly Value', 'Billing Cycle', 'Status', 'Next Billing'].map((h, i) => (
                    <th key={i} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.organizations.map((org, i) => (
                  <tr key={org.id}
                    style={{ borderBottom: i < d.organizations.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    className="transition-colors hover:bg-[var(--bg-subtle)]">
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={org.plan?.toLowerCase() === 'enterprise' ? 'purple' : org.plan?.toLowerCase() === 'professional' ? 'brand' : 'gray'}>
                        {org.plan ?? 'Free'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {org.monthly_value ? `$${org.monthly_value}/mo` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] capitalize" style={{ color: 'var(--text-secondary)' }}>
                        {org.billing_cycle ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={org.status === 'active' ? 'success' : org.status === 'trialing' ? 'info' : 'danger'}>
                        {org.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        {org.next_billing ? new Date(org.next_billing).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
