'use client';

import { useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { ClipboardList, Route, AlertTriangle, CheckCircle2, Clock, Navigation, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { MOCK_DISPATCHER_DASHBOARD, MOCK_ALERTS, MOCK_ANALYTICS_COMPAT as MOCK_ANALYTICS } from '@/lib/mock-data';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

const CHART_TOOLTIP = {
  contentStyle: {
    background: 'var(--bg-elevated)', borderRadius: 10,
    color: 'var(--text-primary)', fontSize: 12,
    boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-subtle)',
  },
  cursor: { fill: 'var(--bg-hover)' },
};

export default function DispatcherDashboard() {
  const { user } = useAuth();
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  const d = MOCK_DISPATCHER_DASHBOARD;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });
  const activeAlerts = MOCK_ALERTS.filter(a => !dismissedAlerts.includes(a.id)).slice(0, 2);

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Dispatch Center
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {dateStr} · {user?.organization?.name ?? 'PathCare Diagnostics Kenya'}
        </p>
      </div>

      {/* Alert strip */}
      {activeAlerts.length > 0 && (
        <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--warning-border)', background: 'var(--warning-subtle)' }}>
          {activeAlerts.map(a => (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3"
              style={{ borderBottom: activeAlerts.indexOf(a) < activeAlerts.length - 1 ? '1px solid var(--warning-border)' : 'none' }}>
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
              <p className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>
                <span className="font-semibold">{a.alert_type.replace(/_/g, ' ')}</span>
                {' — '}{a.description}
              </p>
              <button onClick={() => setDismissedAlerts(prev => [...prev, a.id])}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard title="Pending Tasks"   value={d.pending_tasks}          icon={ClipboardList}  color="gray"    />
        <StatCard title="Dispatched"      value={d.tasks_assigned_today}   icon={Navigation}     color="brand"   />
        <StatCard title="Routes Active"   value={d.routes_in_progress}     icon={Route}          color="purple"  />
        <StatCard title="Completed"       value={d.routes_completed_today} icon={CheckCircle2}   color="success" />
        <StatCard title="Overdue Stops"   value={d.overdue_stops}          icon={Clock}          color="warning" alert={d.overdue_stops > 0} />
        <StatCard title="Failed Stops"    value={d.failed_stops_today}     icon={AlertTriangle}  color="danger"  alert={d.failed_stops_today > 0} />
      </div>

      {/* Quick actions + Mini chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick actions */}
        <div className="lg:col-span-1 grid grid-cols-1 gap-3">
          {[
            { label: 'Plan Routes', desc: "Optimize today's dispatch", href: '/dispatcher/route-planning', icon: Route, color: 'var(--success)', subtle: 'var(--success-subtle)' },
            { label: 'Live Tracking', desc: 'Monitor fleet in real time', href: '/dispatcher/live-tracking', icon: Navigation, color: 'var(--brand)', subtle: 'var(--brand-subtle)' },
            { label: 'Task Queue', desc: `${d.pending_tasks} tasks waiting`, href: '/dispatcher/tasks', icon: ClipboardList, color: 'var(--purple)', subtle: 'var(--purple-subtle)' },
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold"
              style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
              94% avg
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
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
      </div>
    </div>
  );
}
