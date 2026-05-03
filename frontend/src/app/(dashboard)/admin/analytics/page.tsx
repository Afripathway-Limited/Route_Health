'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, Clock, AlertTriangle, Download, MapPin, Truck } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { MOCK_ANALYTICS_COMPAT as MOCK_ANALYTICS } from '@/lib/mock-data';
import toast from 'react-hot-toast';

const CHART_TOOLTIP = {
  contentStyle: {
    background: 'var(--bg-elevated)', borderRadius: 10,
    color: 'var(--text-primary)', fontSize: 12,
    boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-subtle)',
  },
  cursor: { fill: 'var(--bg-hover)' },
};

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
];

function KpiCard({ label, value, sub, icon: Icon, color, subtleColor }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; subtleColor: string;
}) {
  return (
    <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
          <p className="text-[28px] font-bold mt-1 leading-none" style={{ color, letterSpacing: '-0.02em' }}>{value}</p>
          {sub && <p className="text-[12px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: subtleColor }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState('7d');

  const delayedFacilities = [
    { name: 'Kibera Community Health', avg_delay: 18, stops: 22 },
    { name: 'Eastleigh Health Centre', avg_delay: 12, stops: 18 },
    { name: 'KNH Outpatient', avg_delay: 9,  stops: 30 },
    { name: 'MP Shah Hospital', avg_delay: 6, stops: 25 },
    { name: 'Karen Hospital', avg_delay: 4,  stops: 16 },
  ];

  const tatData = MOCK_ANALYTICS.weekly.map(d => ({
    day_label: d.day_label,
    avg_tat: 42 + Math.floor(d.completed * 0.3),
  }));

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Analytics
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            PathCare Diagnostics Kenya · May 2026
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-[10px] overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            {DATE_RANGES.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                className="px-3 py-1.5 text-[12px] font-medium transition-all"
                style={{
                  background: range === r.value ? 'var(--brand)' : 'var(--bg-surface)',
                  color: range === r.value ? '#fff' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer',
                }}>
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => toast.success('CSV export ready')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-all"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Total Routes" value="47" icon={BarChart3} color="var(--brand)" subtleColor="var(--brand-subtle)" />
        <KpiCard label="Total Tasks" value="312" icon={TrendingUp} color="var(--success)" subtleColor="var(--success-subtle)" />
        <KpiCard label="Completion" value="94%" sub="+2% vs last week" icon={TrendingUp} color="var(--success)" subtleColor="var(--success-subtle)" />
        <KpiCard label="Avg Delay" value="8 min" sub="−3 min vs last week" icon={Clock} color="var(--warning)" subtleColor="var(--warning-subtle)" />
        <KpiCard label="Dispute Rate" value="0.6%" sub="3 disputes" icon={AlertTriangle} color="var(--danger)" subtleColor="var(--danger-subtle)" />
        <KpiCard label="Distance" value="1,840 km" sub="this period" icon={MapPin} color="var(--purple)" subtleColor="var(--purple-subtle)" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Completions</h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Completed vs failed stops</p>
          </div>
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
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Average TAT (minutes)</h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Turnaround time per day</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={tatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="day_label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip {...CHART_TOOLTIP} />
              <Line type="monotone" dataKey="avg_tat" name="Avg TAT (min)" stroke="var(--brand)" strokeWidth={2} dot={{ r: 3, fill: 'var(--brand)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rider performance + Delayed facilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Truck size={14} style={{ color: 'var(--text-tertiary)' }} /> Rider On-Time Rate
            </h3>
          </div>
          <div>
            {MOCK_ANALYTICS.riderPerformance.map((r, i) => {
              const color = r.on_time_rate >= 90 ? 'var(--success)' : r.on_time_rate >= 75 ? 'var(--warning)' : 'var(--danger)';
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: i < MOCK_ANALYTICS.riderPerformance.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.tasks_completed} tasks</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${r.on_time_rate}%`, background: color }} />
                    </div>
                    <span className="text-[13px] font-semibold w-10 text-right" style={{ color }}>{r.on_time_rate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} /> Most Delayed Facilities
            </h3>
          </div>
          <div>
            {delayedFacilities.map((f, i) => {
              const color = f.avg_delay >= 15 ? 'var(--danger)' : f.avg_delay >= 8 ? 'var(--warning)' : 'var(--success)';
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: i < delayedFacilities.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-subtle)' }}>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--text-tertiary)' }}>{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{f.stops} stops</p>
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color }}>+{f.avg_delay} min</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
