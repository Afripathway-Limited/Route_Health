'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, TrendingUp, Route, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { get, getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SummaryData {
  total_routes: number;
  completed_routes: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  disputed_tasks: number;
  completion_rate: number;
  avg_delay_minutes: number;
  dispute_rate: number;
  total_distance_km: number;
}

interface DailyPoint {
  date: string;
  day_label: string;
  completed: number;
  failed: number;
  disputed: number;
  total: number;
  routes_created: number;
}

interface RiderData {
  id: number;
  name: string;
  vehicle_type: string;
  route_count: number;
  total_stops: number;
  on_time_rate: number;
  avg_delay_minutes: number;
}

interface FacilityData {
  id: number;
  name: string;
  city: string;
  pickup_count: number;
  avg_delay_minutes: number;
  dispute_count: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const RANGES = [
  { label: '7D', value: '7d', days: 7 },
  { label: '14D', value: '14d', days: 14 },
  { label: '30D', value: '30d', days: 30 },
];

function getDateRange(range: string) {
  const days = RANGES.find(r => r.value === range)?.days ?? 7;
  const to = new Date();
  const from = new Date(Date.now() - (days - 1) * 86400000);
  const prevTo = new Date(from.getTime() - 86400000);
  const prevFrom = new Date(from.getTime() - days * 86400000);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    prevFrom: prevFrom.toISOString().split('T')[0],
    prevTo: prevTo.toISOString().split('T')[0],
  };
}

function fmtDelta(curr: number, prev: number, suffix = '') {
  if (prev === 0) return null;
  const d = curr - prev;
  const sign = d >= 0 ? '+' : '';
  return `${sign}${d.toFixed(1)}${suffix} vs prev`;
}

function avgOnTime(riders: RiderData[]) {
  if (riders.length === 0) return 0;
  const totalStops = riders.reduce((s, r) => s + r.total_stops, 0);
  if (totalStops === 0) return riders.reduce((s, r) => s + r.on_time_rate, 0) / riders.length;
  return riders.reduce((s, r) => s + r.on_time_rate * r.total_stops, 0) / totalStops;
}

// ─── UI pieces ─────────────────────────────────────────────────────────────────

const CHART_TOOLTIP = {
  contentStyle: {
    background: 'var(--bg-elevated)', borderRadius: 10,
    color: 'var(--text-primary)', fontSize: 12,
    boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-subtle)',
  },
  cursor: { fill: 'var(--bg-hover)' },
};

function StatCard({
  label, value, sub, icon: Icon, color, subtle, loading,
}: {
  label: string; value: string; sub?: string | null;
  icon: React.ElementType; color: string; subtle: string; loading?: boolean;
}) {
  return (
    <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
          {loading ? (
            <div className="h-8 w-20 mt-1 rounded-[6px] animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
          ) : (
            <p className="text-[28px] font-bold mt-1" style={{ color, letterSpacing: '-0.02em' }}>{value}</p>
          )}
          {sub && !loading && (
            <p className="text-[12px] mt-1" style={{ color: sub.startsWith('+') ? 'var(--success)' : sub.startsWith('−') || sub.startsWith('-') ? 'var(--danger)' : 'var(--text-tertiary)' }}>
              {sub}
            </p>
          )}
        </div>
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: subtle }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="h-[200px] rounded-[10px] animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function DispatcherAnalyticsPage() {
  const [range, setRange]           = useState('7d');
  const [loading, setLoading]       = useState(true);
  const [summary, setSummary]       = useState<SummaryData | null>(null);
  const [prevSummary, setPrevSummary] = useState<SummaryData | null>(null);
  const [daily, setDaily]           = useState<DailyPoint[]>([]);
  const [riders, setRiders]         = useState<RiderData[]>([]);
  const [facilities, setFacilities] = useState<FacilityData[]>([]);

  const load = useCallback(async (r: string) => {
    setLoading(true);
    const { from, to, prevFrom, prevTo } = getDateRange(r);
    try {
      const [sum, prev, dly, rid, fac] = await Promise.all([
        get<SummaryData>(`/analytics/summary?from=${from}&to=${to}`),
        get<SummaryData>(`/analytics/summary?from=${prevFrom}&to=${prevTo}`),
        get<DailyPoint[]>(`/analytics/daily?from=${from}&to=${to}`),
        get<RiderData[]>(`/analytics/riders?from=${from}&to=${to}`),
        get<FacilityData[]>(`/analytics/facilities?from=${from}&to=${to}`),
      ]);
      setSummary(sum as SummaryData);
      setPrevSummary(prev as SummaryData);
      setDaily(Array.isArray(dly) ? dly as DailyPoint[] : []);
      setRiders(Array.isArray(rid) ? rid as RiderData[] : []);
      setFacilities(Array.isArray(fac) ? fac as FacilityData[] : []);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range, load]);

  // ── Derived KPIs ─────────────────────────────────────────────────────────
  const onTimeRate = Math.round(avgOnTime(riders) * 10) / 10;
  const prevOnTimeRate = prevSummary ? 0 : 0; // no per-rider prev data; shown without delta

  const now = new Date();
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Analytics
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Dispatcher view · {monthLabel}
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

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Completion Rate"
          value={summary ? `${summary.completion_rate}%` : '—'}
          sub={summary && prevSummary ? fmtDelta(summary.completion_rate, prevSummary.completion_rate, '%') : null}
          icon={CheckCircle2}
          color="var(--success)" subtle="var(--success-subtle)" loading={loading}
        />
        <StatCard
          label="Avg Delay"
          value={summary ? `${summary.avg_delay_minutes} min` : '—'}
          sub={summary && prevSummary
            ? fmtDelta(summary.avg_delay_minutes, prevSummary.avg_delay_minutes, ' min')
            : null}
          icon={Clock}
          color="var(--brand)" subtle="var(--brand-subtle)" loading={loading}
        />
        <StatCard
          label="Routes Run"
          value={summary ? String(summary.total_routes) : '—'}
          sub={summary ? `${summary.total_distance_km} km total` : null}
          icon={Route}
          color="var(--purple)" subtle="var(--purple-subtle)" loading={loading}
        />
        <StatCard
          label="On-Time Rate"
          value={loading ? '—' : `${onTimeRate}%`}
          sub={summary ? `${riders.length} rider${riders.length !== 1 ? 's' : ''} active` : null}
          icon={TrendingUp}
          color="var(--warning)" subtle="var(--warning-subtle)" loading={loading}
        />
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Task Completions bar chart */}
        <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Task Completions</h3>
            {summary && !loading && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
                {summary.completed_tasks} completed
              </span>
            )}
          </div>
          {loading ? <SkeletonChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={daily} barGap={4} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="day_label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="completed" name="Completed" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="var(--danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Routes Dispatched per Day line chart */}
        <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Routes Dispatched per Day</h3>
            {summary && !loading && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                {summary.total_routes} total
              </span>
            )}
          </div>
          {loading ? <SkeletonChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="day_label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Line type="monotone" dataKey="routes_created" name="Routes" stroke="var(--brand)" strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--brand)', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'var(--brand)' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Rider performance + Disputed facilities ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Rider performance table */}
        <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Rider Performance</h3>
            {!loading && riders.length > 0 && (
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{riders.length} riders</span>
            )}
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-[8px] animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
              ))}
            </div>
          ) : riders.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No rider data for this period</p>
            </div>
          ) : (
            riders.map((r, i) => {
              const color = r.on_time_rate >= 90 ? 'var(--success)' : r.on_time_rate >= 75 ? 'var(--warning)' : 'var(--danger)';
              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: i < riders.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {r.total_stops} stops · {r.route_count} route{r.route_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${r.on_time_rate}%`, background: color }} />
                    </div>
                    <span className="text-[12px] font-semibold w-10 text-right" style={{ color }}>{r.on_time_rate}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Disputed / delayed facilities */}
        <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Facilities by Dispute Count</h3>
            {!loading && summary && summary.disputed_tasks > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'var(--danger-subtle)', color: 'var(--danger)' }}>
                {summary.disputed_tasks} disputed
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-[8px] animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
              ))}
            </div>
          ) : facilities.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No facility data for this period</p>
            </div>
          ) : (
            facilities
              .slice()
              .sort((a, b) => b.dispute_count - a.dispute_count)
              .slice(0, 7)
              .map((f, i, arr) => (
                <div key={f.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <span className="text-[12px] font-bold w-5 text-center flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {f.city} · {f.pickup_count} pickup{f.pickup_count !== 1 ? 's' : ''}
                      {f.avg_delay_minutes > 0 && ` · ${f.avg_delay_minutes}min avg delay`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {f.dispute_count > 0 && <AlertTriangle size={11} style={{ color: 'var(--danger)' }} />}
                    <span className="text-[13px] font-semibold"
                      style={{ color: f.dispute_count > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {f.dispute_count > 0 ? `${f.dispute_count} dispute${f.dispute_count !== 1 ? 's' : ''}` : 'No disputes'}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* ── Summary strip ────────────────────────────────────────────────────── */}
      {!loading && summary && (
        <div className="rounded-[14px] p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Tasks', value: String(summary.total_tasks) },
              { label: 'Completed', value: String(summary.completed_tasks), color: 'var(--success)' },
              { label: 'Failed', value: String(summary.failed_tasks), color: summary.failed_tasks > 0 ? 'var(--danger)' : undefined },
              { label: 'Total Distance', value: `${summary.total_distance_km} km` },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
                <p className="text-[20px] font-bold mt-0.5" style={{ color: item.color ?? 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
