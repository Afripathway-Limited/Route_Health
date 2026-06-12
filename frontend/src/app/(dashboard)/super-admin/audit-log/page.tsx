'use client';

import { useState } from 'react';
import { Search, FileText, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'purple', org_admin: 'brand', dispatcher: 'info', lab_manager: 'success',
};
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', org_admin: 'Org Admin', dispatcher: 'Dispatcher', lab_manager: 'Lab Manager',
};

interface AuditEvent {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  user: { id: number; name: string; email: string } | null;
  user_id: number;
  organization_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const SeverityIcon = ({ action }: { action: string }) => {
  if (action.includes('suspend') || action.includes('disput') || action.includes('fail'))
    return <AlertCircle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />;
  if (action.includes('deactivat') || action.includes('delete') || action.includes('remov'))
    return <AlertTriangle size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />;
  return <Info size={14} style={{ color: 'var(--info)', flexShrink: 0 }} />;
};

function formatAction(action: string): string {
  return action.replace(/\./g, ' › ').replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function AuditLogPage() {
  const [search, setSearch]               = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const { data: events = [], isLoading } = useQuery<AuditEvent[]>({
    queryKey: ['audit-logs'],
    queryFn: () => get<AuditEvent[]>('/audit-logs'),
    refetchInterval: 30_000,
  });

  const filtered = events.filter(e => {
    const actor = e.user?.name ?? '';
    const target = `${e.entity_type} #${e.entity_id ?? ''}`;
    const matchSearch = !search ||
      actor.toLowerCase().includes(search.toLowerCase()) ||
      target.toLowerCase().includes(search.toLowerCase()) ||
      formatAction(e.action).toLowerCase().includes(search.toLowerCase());
    const action = e.action;
    const isCritical = action.includes('suspend') || action.includes('disput') || action.includes('fail');
    const isWarning  = action.includes('deactivat') || action.includes('delete') || action.includes('remov');
    const matchSev =
      severityFilter === 'all' ||
      (severityFilter === 'danger'  && isCritical) ||
      (severityFilter === 'warning' && isWarning)  ||
      (severityFilter === 'info'    && !isCritical && !isWarning);
    return matchSearch && matchSev;
  });

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Audit Log
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            All platform activity — who did what and when
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[8px]"
          style={{ background: 'var(--success-subtle)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
          Live feed
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search events, actors, targets…"
            className="w-full pl-9 pr-4 py-2.5 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
          className="px-3 py-2.5 rounded-[10px] text-[13px]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none', minWidth: 140 }}>
          <option value="all">All Severities</option>
          <option value="danger">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)' }}>
        {isLoading ? (
          <div className="py-16 text-center">
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Loading audit log…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
              {events.length === 0 ? 'No audit events recorded yet.' : 'No events match your filters.'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((event, i) => (
              <div key={event.id}
                className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div className="mt-0.5 flex-shrink-0">
                  <SeverityIcon action={event.action} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-0.5">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatAction(event.action)}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                      {event.entity_type}
                    </span>
                  </div>
                  <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--brand)' }}>{event.user?.name ?? 'System'}</span>
                    {event.ip_address && <> · <span style={{ color: 'var(--text-muted)' }}>{event.ip_address}</span></>}
                  </p>
                  {event.entity_id && (
                    <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {event.entity_type} #{event.entity_id}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(event.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(event.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
