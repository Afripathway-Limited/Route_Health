'use client';

import { useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import {
  ClipboardList, CheckCircle2, Loader2, AlertTriangle,
  AlertCircle, MapPin, UserPlus, Navigation, X, Route,
  TrendingUp, Sparkles,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { get, patch, getErrorMessage } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const CHART_TOOLTIP = {
  contentStyle: {
    background: 'var(--bg-elevated)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 12,
    boxShadow: 'var(--shadow-dropdown)',
    border: '1px solid var(--border-subtle)',
  },
  cursor: { fill: 'var(--bg-hover)' },
};

interface DashboardStats {
  total_tasks_today: number;
  routes_dispatched: number;
  routes_completed: number;
  routes_in_progress: number;
  failed_stops: number;
  disputed_deliveries: number;
}

interface DailyPoint {
  date: string;
  day_label: string;
  completed: number;
  failed: number;
}

interface Alert {
  id: number;
  alert_type: string;
  severity: string;
  description: string;
  triggered_at: string;
}

interface Insight {
  type: string;
  title: string;
  description: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: () => get<DashboardStats>('/analytics/admin-dashboard'),
    refetchInterval: 60_000,
  });

  const { data: weekly = [] } = useQuery<DailyPoint[]>({
    queryKey: ['analytics-daily-7d'],
    queryFn: () => get<DailyPoint[]>('/analytics/daily'),
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['anomalies'],
    queryFn: () => get<Alert[]>('/anomalies'),
    refetchInterval: 30_000,
  });

  const { data: insights } = useQuery<{ highlights: Insight[]; actions: Insight[] }>({
    queryKey: ['insights'],
    queryFn: async () => {
      const raw = await get<Insight[]>('/analytics/insights');
      return {
        highlights: raw.filter(i => i.type === 'success'),
        actions: raw.filter(i => i.type === 'warning' || i.type === 'danger'),
      };
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => patch(`/anomalies/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['anomalies'] }),
  });

  const d: DashboardStats = stats ?? {
    total_tasks_today: 0, routes_dispatched: 0, routes_completed: 0,
    routes_in_progress: 0, failed_stops: 0, disputed_deliveries: 0,
  };

  const activeAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

  const handleDismiss = (id: number) => {
    setDismissedAlerts(prev => [...prev, id]);
    dismissMutation.mutate(id);
  };

  const handleDismissAll = () => {
    setDismissedAlerts(alerts.map(a => a.id));
    alerts.forEach(a => dismissMutation.mutate(a.id));
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 animate-fade-up">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[20px] lg:text-[24px] font-bold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
          >
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-[13px] lg:text-[14px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {dateStr} · {user?.organization?.name ?? ''}
          </p>
        </div>
        <div
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium"
          style={{ background: 'var(--success-subtle)', color: 'var(--success)', border: '1px solid var(--success-border)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
          All systems operational
        </div>
      </div>

      {/* Stats — 2 col mobile, 3 col tablet, 6 col desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
        <StatCard title="Tasks Today"   value={d.total_tasks_today}    icon={ClipboardList}  color="gray" />
        <StatCard title="Dispatched"    value={d.routes_dispatched}    icon={Navigation}     color="brand" />
        <StatCard title="Completed"     value={d.routes_completed}     icon={CheckCircle2}   color="success" />
        <StatCard title="In Progress"   value={d.routes_in_progress}   icon={Loader2}        color="purple" />
        <StatCard title="Failed Stops"  value={d.failed_stops}         icon={AlertTriangle}  color="warning" alert={d.failed_stops > 0} />
        <StatCard title="Disputed"      value={d.disputed_deliveries}  icon={AlertCircle}    color="danger"  alert={d.disputed_deliveries > 0} />
      </div>

      {/* Charts + Alerts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {/* 7-day chart */}
        <div className="rounded-[14px] p-6" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>7-Day Performance</h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Completed vs failed stops</p>
            </div>
            <div className="flex gap-4 text-[12px]">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--success)' }} /> Completed
              </span>
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--danger)' }} /> Failed
              </span>
            </div>
          </div>
          {weekly.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No data for the last 7 days</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekly} barGap={4} barSize={10}>
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

        {/* Live alerts */}
        <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Live Alerts</h2>
              {activeAlerts.length > 0 && (
                <span className="text-[10px] font-bold rounded-full px-2 py-0.5"
                  style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}>
                  {activeAlerts.length}
                </span>
              )}
            </div>
            {activeAlerts.length > 0 && (
              <button onClick={handleDismissAll}
                className="text-[12px] font-medium transition-colors"
                style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Dismiss all
              </button>
            )}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
            {activeAlerts.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-3" style={{ background: 'var(--success-subtle)' }}>
                  <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
                </div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No active alerts</p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>All routes are running smoothly</p>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div key={alert.id}
                  className="px-5 py-3.5 flex gap-3 transition-colors"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <div className="w-[3px] rounded-full flex-shrink-0 self-stretch"
                    style={{ background: alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }} />
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5"
                    style={{ color: alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-snug" style={{ color: 'var(--text-primary)' }}>{alert.description}</p>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(alert.triggered_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} · {alert.alert_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <button onClick={() => handleDismiss(alert.id)}
                    className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
                    style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Insights strip */}
      <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
              <TrendingUp size={11} /> Today's highlights
            </p>
            {(insights?.highlights ?? []).length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No highlights yet today.</p>
            ) : (
              <ul className="space-y-2">
                {(insights?.highlights ?? []).map((h, i) => (
                  <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--success)' }} />
                    {h.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--purple)' }}>
              <Sparkles size={11} /> Action items
            </p>
            {(insights?.actions ?? []).length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No action items right now.</p>
            ) : (
              <ul className="space-y-2">
                {(insights?.actions ?? []).map((s, i) => (
                  <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--purple)' }} />
                    {s.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions-grid">
        {[
          { label: 'Add Facility',  desc: 'Register a new clinic or lab',   href: '/admin/facilities',          icon: MapPin,    accentColor: 'var(--info)',    accentSubtle: 'var(--info-subtle)' },
          { label: 'Add Rider',     desc: 'Onboard a new rider to the fleet',href: '/admin/riders',              icon: UserPlus,  accentColor: 'var(--purple)',  accentSubtle: 'var(--purple-subtle)' },
          { label: 'Plan Routes',   desc: "Start today's dispatch",          href: '/dispatcher/route-planning', icon: Route,     accentColor: 'var(--success)', accentSubtle: 'var(--success-subtle)' },
        ].map((action) => (
          <Link key={action.label} href={action.href} style={{ minWidth: 'min(280px, 85vw)', display: 'block' }}>
            <div
              className="flex items-center gap-4 p-5 rounded-[14px] transition-all duration-200 cursor-pointer h-full"
              style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', borderLeft: `3px solid ${action.accentColor}` }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'var(--shadow-md)'; el.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'var(--shadow-card)'; el.style.transform = ''; }}
            >
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: action.accentSubtle }}>
                <action.icon size={18} style={{ color: action.accentColor }} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{action.label}</p>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{action.desc}</p>
              </div>
              <span className="text-[18px]" style={{ color: action.accentColor }}>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
