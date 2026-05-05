'use client';

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, DollarSign, Building2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MOCK_REVENUE, MOCK_ORGANIZATIONS } from '@/lib/mock-data';

const PLAN_COLORS: Record<string, string> = { Starter: '#6B7280', Professional: '#10B981', Enterprise: '#8B5CF6' };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] px-3 py-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 12 }}>
      <p style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="font-semibold" style={{ color: 'var(--brand)' }}>${payload[0].value.toLocaleString()}</p>
    </div>
  );
};

export default function RevenuePage() {
  const stats = [
    { label: 'Monthly Recurring Revenue', value: `$${MOCK_REVENUE.mrr.toLocaleString()}`, sub: `+${MOCK_REVENUE.mrr_growth}% this month`, icon: DollarSign, color: 'var(--brand)' },
    { label: 'Annual Run Rate',            value: `$${MOCK_REVENUE.arr.toLocaleString()}`, sub: 'Based on current MRR',               icon: TrendingUp, color: 'var(--success)' },
    { label: 'Active Subscriptions',       value: String(MOCK_REVENUE.active_subscriptions), sub: '3 paying organisations',           icon: Building2,  color: 'var(--info)' },
    { label: 'Churned This Month',         value: String(MOCK_REVENUE.churned_this_month),   sub: 'SaniLab Rwanda suspended',         icon: AlertTriangle, color: 'var(--warning)' },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Revenue & Billing</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Subscription revenue and billing overview across all organisations</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR trend chart */}
        <div className="lg:col-span-2 rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)' }}>
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>MRR Growth</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MOCK_REVENUE.monthly_trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="mrr" stroke="var(--brand)" strokeWidth={2} fill="url(#mrrGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan breakdown */}
        <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)' }}>
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Revenue by Plan</h2>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={MOCK_REVENUE.by_plan} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="plan" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {MOCK_REVENUE.by_plan.map(p => <Cell key={p.plan} fill={PLAN_COLORS[p.plan] ?? 'var(--brand)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {MOCK_REVENUE.by_plan.map(p => (
              <div key={p.plan} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PLAN_COLORS[p.plan] }} />
                  <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{p.plan}</span>
                </div>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>${p.total}/mo</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Billing table */}
      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Subscription Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Organisation', 'Plan', 'Monthly Value', 'Status', 'Since'].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_ORGANIZATIONS.map((org, i) => {
                const planData = MOCK_REVENUE.by_plan.find(p => p.plan.toLowerCase() === org.subscription_plan.toLowerCase());
                return (
                  <tr key={org.id} style={{ borderBottom: i < MOCK_ORGANIZATIONS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    className="transition-colors hover:bg-[var(--bg-subtle)]">
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{org.country}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={org.subscription_plan === 'enterprise' ? 'purple' : org.subscription_plan === 'professional' ? 'brand' : 'gray'}>
                        {org.subscription_plan.charAt(0).toUpperCase() + org.subscription_plan.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] font-semibold" style={{ color: org.status === 'active' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {org.status === 'active' ? `$${planData?.monthly ?? 0}/mo` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={org.status === 'active' ? 'success' : 'danger'}>{org.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(org.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
