'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, TrendingUp, Route } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MOCK_ANALYTICS_COMPAT as MOCK_ANALYTICS } from '@/lib/mock-data';

const CHART_TOOLTIP = {
  contentStyle: {
    background: 'var(--bg-elevated)', borderRadius: 10,
    color: 'var(--text-primary)', fontSize: 12,
    boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-subtle)',
  },
  cursor: { fill: 'var(--bg-hover)' },
};

const RANGES = [
  { label: '7D', value: '7d' },
  { label: '14D', value: '14d' },
  { label: '30D', value: '30d' },
];

function StatCard({ label, value, sub, icon: Icon, color, subtle }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; subtle: string;
}) {
  return (
    <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
          <p className="text-[28px] font-bold mt-1" style={{ color, letterSpacing: '-0.02em' }}>{value}</p>
          {sub && <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: subtle }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function DispatcherAnalyticsPage() {
  const [range, setRange] = useState('7d');

  const tatData = MOCK_ANALYTICS.weekly.map(d => ({
    day_label: d.day_label,
    avg_tat: 42 + Math.floor(d.completed * 0.3),
  }));

  const topDisputed = [
    { name: 'Kibera Community Health', disputes: 3 },
    { name: 'Eastleigh Health Centre', disputes: 2 },
    { name: 'KNH Outpatient', disputes: 1 },
    { name: 'Karen Hospital', disputes: 1 },
    { name: 'MP Shah Hospital', disputes: 0 },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Analytics
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Dispatcher view · May 2026
          </p>
        </div>
        <div className="flex rounded-[10px] overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)}
              className="px-4 py-1.5 text-[12px] font-medium transition-all"
              style={{
                background: range === r.value ? 'var(--brand)' : 'var(--bg-surface)',
                color: range === r.value ? '#fff' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer',
              }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Completion Rate" value="94%" sub="+2% vs prev" icon={CheckCircle2} color="var(--success)" subtle="var(--success-subtle)" />
        <StatCard label="Avg TAT" value="48 min" sub="−6 min vs prev" icon={Clock} color="var(--brand)" subtle="var(--brand-subtle)" />
        <StatCard label="Routes Run" value="47" icon={Route} color="var(--purple)" subtle="var(--purple-subtle)" />
        <StatCard label="On-Time Rate" value="94%" icon={TrendingUp} color="var(--warning)" subtle="var(--warning-subtle)" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Task Completions</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_ANALYTICS.weekly} barGap={4} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="day_label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="completed" name="Completed" fill="var(--success)" radius={[4,4,0,0]} />
              <Bar dataKey="failed" name="Failed" fill="var(--danger)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Avg TAT per Day (min)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={tatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="day_label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip {...CHART_TOOLTIP} />
              <Line type="monotone" dataKey="avg_tat" name="TAT (min)" stroke="var(--brand)" strokeWidth={2} dot={{ r: 3, fill: 'var(--brand)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rider performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Rider Performance</h3>
          </div>
          {MOCK_ANALYTICS.riderPerformance.map((r, i) => {
            const color = r.on_time_rate >= 90 ? 'var(--success)' : r.on_time_rate >= 75 ? 'var(--warning)' : 'var(--danger)';
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.tasks_completed} tasks</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${r.on_time_rate}%`, background: color }} />
                  </div>
                  <span className="text-[12px] font-semibold" style={{ color }}>{r.on_time_rate}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top disputed */}
        <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Disputed Facilities</h3>
          </div>
          {topDisputed.map((f, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
              style={{ borderBottom: i < topDisputed.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <span className="text-[12px] font-bold w-5 text-center" style={{ color: 'var(--text-tertiary)' }}>{i + 1}</span>
              <p className="flex-1 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{f.name}</p>
              <span className="text-[13px] font-semibold" style={{ color: f.disputes > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {f.disputes} dispute{f.disputes !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
