'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { DollarSign, TrendingUp, Building2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatDate } from '@/lib/utils';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#131C30', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F9FAFB', fontSize: '12px' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

export default function RevenuePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-revenue'],
    queryFn: () => get<any>('/super-admin/revenue'),
  });

  const revenue = (data as any)?.data ?? data ?? {};

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[--text-1]">Revenue</h1>
        <p className="text-sm text-[--text-3] mt-1">Platform-wide subscription revenue overview</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Monthly Recurring Revenue" value={isLoading ? '—' : `$${(revenue.mrr ?? 0).toLocaleString()}`} icon={DollarSign} color="emerald" />
        <StatCard title="Annual Recurring Revenue" value={isLoading ? '—' : `$${(revenue.arr ?? 0).toLocaleString()}`} icon={TrendingUp} color="blue" />
        <StatCard title="Active Paying Orgs" value={isLoading ? '—' : (revenue.active_paying_orgs ?? 0)} icon={Building2} color="purple" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-[--border]">
          <h2 className="text-base font-semibold text-[--text-1]">MRR Growth (Last 12 Months)</h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="h-[220px] bg-[--bg-elevated] rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenue.mrr_history ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`$${v ?? 0}`, 'MRR']} />
                <Line type="monotone" dataKey="mrr" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="bg-[--bg-surface] rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-6 py-4 border-b border-[--border]">
          <h2 className="text-base font-semibold text-[--text-1]">Organization Billing</h2>
        </div>
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[--bg-elevated] text-[--text-2] text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Organization</th>
                <th className="px-6 py-3 text-left">Plan</th>
                <th className="px-6 py-3 text-right">Monthly Value</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Next Billing</th>
              </tr>
            </thead>
            <tbody>
              {(revenue.organizations ?? []).map((org: any) => (
                <tr key={org.id} className="border-t border-[--border] hover:bg-[--bg-hover] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-white">{org.name}</td>
                  <td className="px-6 py-4 text-sm text-[--text-2]">{org.plan ?? '—'}</td>
                  <td className="px-6 py-4 text-right text-sm text-white font-medium">${org.monthly_value?.toFixed(2) ?? '—'}</td>
                  <td className="px-6 py-4"><Badge status={org.status} label={org.status} /></td>
                  <td className="px-6 py-4 text-sm text-[--text-3]">{org.next_billing ? formatDate(org.next_billing) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
