'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, Clock, AlertTriangle, Download, MapPin, Truck } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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
  { label: 'Today', value: 'today', days: 0 },
  { label: '7 days', value: '7d', days: 7 },
  { label: '30 days', value: '30d', days: 30 },
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

function getDateRange(value: string) {
  const to = new Date().toISOString().split('T')[0];
  const from = value === 'today'
    ? to
    : new Date(Date.now() - (value === '7d' ? 6 : 29) * 86400000).toISOString().split('T')[0];
  return { from, to };
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState('7d');
  const { from, to } = getDateRange(range);

  const { data: summary } = useQuery({
    queryKey: ['analytics-summary', from, to],
    queryFn: () => get<any>(`/analytics/summary?from=${from}&to=${to}`),
  });

  const { data: daily = [] } = useQuery({
    queryKey: ['analytics-daily', from, to],
    queryFn: () => get<any[]>(`/analytics/daily?from=${from}&to=${to}`),
  });

  const { data: riders = [] } = useQuery({
    queryKey: ['analytics-riders', from, to],
    queryFn: () => get<any[]>(`/analytics/riders?from=${from}&to=${to}`),
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['analytics-facilities', from, to],
    queryFn: () => get<any[]>(`/analytics/facilities?from=${from}&to=${to}`),
  });

  const tatData = daily.map((d: any) => ({ day_label: d.day_label, avg_tat: 0 }));

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const url = `/analytics/export?format=${format}&from=${from}&to=${to}`;
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('rh_token') : null;
      const res = await fetch(`${API_BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `routehealth-analytics-${from}-${to}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
    } catch {
      toast.error('Export failed. Please try again.');
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Analytics
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {user?.organization?.name} · {new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}
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
          <button onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-all"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
            <Download size={13} /> CSV
          </button>
          <button onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-all"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
            <Download size={13} /> PDF
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Total Routes"  value={summary?.total_routes ?? 0}                             icon={BarChart3}      color="var(--brand)"   subtleColor="var(--brand-subtle)" />
        <KpiCard label="Total Tasks"   value={summary?.total_tasks ?? 0}                              icon={TrendingUp}     color="var(--success)" subtleColor="var(--success-subtle)" />
        <KpiCard label="Completion"    value={`${summary?.completion_rate ?? 0}%`}                    icon={TrendingUp}     color="var(--success)" subtleColor="var(--success-subtle)" />
        <KpiCard label="Avg Delay"     value={`${summary?.avg_delay_minutes ?? 0} min`}               icon={Clock}          color="var(--warning)" subtleColor="var(--warning-subtle)" />
        <KpiCard label="Dispute Rate"  value={`${summary?.dispute_rate ?? 0}%`} sub={`${summary?.disputed_tasks ?? 0} disputes`} icon={AlertTriangle} color="var(--danger)" subtleColor="var(--danger-subtle)" />
        <KpiCard label="Distance"      value={`${(summary?.total_distance_km ?? 0).toLocaleString()} km`} sub="this period" icon={MapPin}      color="var(--purple)" subtleColor="var(--purple-subtle)" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Completions</h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Completed vs failed stops</p>
          </div>
          {daily.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={daily} barGap={4} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="day_label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="completed" name="Completed" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed"    name="Failed"    fill="var(--danger)"  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Routes Created Per Day</h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Daily dispatch volume</p>
          </div>
          {daily.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="day_label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip {...CHART_TOOLTIP} />
                <Line type="monotone" dataKey="routes_created" name="Routes" stroke="var(--brand)" strokeWidth={2} dot={{ r: 3, fill: 'var(--brand)' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
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
          {riders.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No rider data for this period</p>
            </div>
          ) : (
            <div>
              {riders.map((r: any, i: number) => {
                const color = r.on_time_rate >= 90 ? 'var(--success)' : r.on_time_rate >= 75 ? 'var(--warning)' : 'var(--danger)';
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                    style={{ borderBottom: i < riders.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                      {r.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.total_stops ?? 0} stops</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${r.on_time_rate ?? 0}%`, background: color }} />
                      </div>
                      <span className="text-[13px] font-semibold w-10 text-right" style={{ color }}>{r.on_time_rate ?? 0}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} /> Most Delayed Facilities
            </h3>
          </div>
          {facilities.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No facility data for this period</p>
            </div>
          ) : (
            <div>
              {facilities.slice(0, 5).map((f: any, i: number) => {
                const delay = f.avg_delay_minutes ?? 0;
                const color = delay >= 15 ? 'var(--danger)' : delay >= 8 ? 'var(--warning)' : 'var(--success)';
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                    style={{ borderBottom: i < Math.min(facilities.length, 5) - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-subtle)' }}>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--text-tertiary)' }}>{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{f.total_stops ?? 0} stops</p>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color }}>
                      {delay > 0 ? `+${delay} min` : 'On time'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
