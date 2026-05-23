'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { ClipboardList, Route, AlertTriangle, CheckCircle2, Clock, Navigation, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { get, patch, getErrorMessage } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import type { DailyStat, AnomalyAlert } from '@/types';
import toast from 'react-hot-toast';

const CHART_TOOLTIP = {
  contentStyle: {
    background: 'var(--bg-elevated)', borderRadius: 10,
    color: 'var(--text-primary)', fontSize: 12,
    boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-subtle)',
  },
  cursor: { fill: 'var(--bg-hover)' },
};

interface DashboardStats {
  pending_tasks: number;
  tasks_assigned_today: number;
  routes_in_progress: number;
  routes_completed_today: number;
  overdue_stops: number;
  failed_stops_today: number;
  active_alerts: number;
}

export default function DispatcherDashboard() {
  const { user } = useAuth();
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [daily, setDaily]   = useState<DailyStat[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [statsData, dailyData, alertsData] = await Promise.all([
        get<DashboardStats>('/analytics/dispatcher-dashboard'),
        get<DailyStat[]>('/analytics/daily'),
        get<AnomalyAlert[]>('/anomalies'),
      ]);
      setStats(statsData as DashboardStats);
      setDaily(Array.isArray(dailyData) ? dailyData : []);
      setAlerts((Array.isArray(alertsData) ? alertsData : []).slice(0, 3));
    } catch {
      // best-effort; stats may stay null and cards show 0
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const dismissAlert = async (alert: AnomalyAlert) => {
    try {
      await patch(`/anomalies/${alert.id}/dismiss`, {});
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const d = stats ?? {
    pending_tasks: 0, tasks_assigned_today: 0, routes_in_progress: 0,
    routes_completed_today: 0, overdue_stops: 0, failed_stops_today: 0, active_alerts: 0,
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });

  const avgCompletionPct = daily.length > 0
    ? Math.round(daily.reduce((acc, d) => acc + (d.total > 0 ? (d.completed / d.total) * 100 : 0), 0) / daily.length)
    : 0;

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Dispatch Center
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {dateStr} · {user?.organization?.name ?? ''}
        </p>
      </div>

      {/* Alert strip */}
      {alerts.length > 0 && (
        <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--warning-border)', background: 'var(--warning-subtle)' }}>
          {alerts.map((a, i) => (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3"
              style={{ borderBottom: i < alerts.length - 1 ? '1px solid var(--warning-border)' : 'none' }}>
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5"
                style={{ color: a.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }} />
              <p className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>
                <span className="font-semibold">{a.alert_type.replace(/_/g, ' ')}</span>
                {' — '}{a.description}
                {a.rider_name && <span className="text-[12px] ml-1" style={{ color: 'var(--text-tertiary)' }}>({a.rider_name})</span>}
              </p>
              <button onClick={() => dismissAlert(a)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard title="Pending Tasks"   value={loading ? '—' : d.pending_tasks}          icon={ClipboardList}  color="gray"    />
        <StatCard title="Dispatched"      value={loading ? '—' : d.tasks_assigned_today}   icon={Navigation}     color="brand"   />
        <StatCard title="Routes Active"   value={loading ? '—' : d.routes_in_progress}     icon={Route}          color="purple"  />
        <StatCard title="Completed"       value={loading ? '—' : d.routes_completed_today} icon={CheckCircle2}   color="success" />
        <StatCard title="Overdue Stops"   value={loading ? '—' : d.overdue_stops}          icon={Clock}          color="warning" alert={d.overdue_stops > 0} />
        <StatCard title="Failed Stops"    value={loading ? '—' : d.failed_stops_today}     icon={AlertTriangle}  color="danger"  alert={d.failed_stops_today > 0} />
      </div>

      {/* Quick actions + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick actions */}
        <div className="lg:col-span-1 grid grid-cols-1 gap-3">
          {[
            { label: 'Plan Routes',    desc: "Optimize today's dispatch",         href: '/dispatcher/route-planning', icon: Route,        color: 'var(--success)', subtle: 'var(--success-subtle)' },
            { label: 'Live Tracking',  desc: 'Monitor fleet in real time',        href: '/dispatcher/live-tracking',  icon: Navigation,   color: 'var(--brand)',   subtle: 'var(--brand-subtle)' },
            { label: 'Task Queue',     desc: `${d.pending_tasks} tasks waiting`,  href: '/dispatcher/tasks',          icon: ClipboardList, color: 'var(--purple)', subtle: 'var(--purple-subtle)' },
          ].map(action => (
            <Link key={action.label} href={action.href} style={{ display: 'block' }}>
              <div className="flex items-center gap-3 p-4 rounded-[12px] transition-all duration-200 cursor-pointer"
                style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', borderLeft: `3px solid ${action.color}` }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'; }}>
                <div className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: action.subtle }}>
                  <action.icon size={16} style={{ color: action.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{action.label}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{action.desc}</p>
                </div>
                <ArrowRight size={14} style={{ color: action.color }} />
              </div>
            </Link>
          ))}
        </div>

        {/* 7-day chart */}
        <div className="lg:col-span-2 rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>7-Day Completion Rate</h3>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Completed stops per day</p>
            </div>
            {avgCompletionPct > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
                {avgCompletionPct}% avg
              </div>
            )}
          </div>
          {daily.length === 0 && !loading ? (
            <div className="flex items-center justify-center h-[180px]">
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No data for last 7 days</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={daily} barGap={4} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="day_label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="completed" name="Completed" fill="var(--success)" radius={[4,4,0,0]} />
                <Bar dataKey="failed" name="Failed" fill="var(--danger)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
