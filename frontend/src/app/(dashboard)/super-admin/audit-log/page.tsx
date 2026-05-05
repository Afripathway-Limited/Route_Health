'use client';

import { useState } from 'react';
import { Search, FileText, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MOCK_AUDIT_LOG, MOCK_ORGANIZATIONS } from '@/lib/mock-data';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'purple', org_admin: 'brand', dispatcher: 'info', lab_manager: 'success',
};
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', org_admin: 'Org Admin', dispatcher: 'Dispatcher', lab_manager: 'Lab Manager',
};

const ACTION_LABELS: Record<string, string> = {
  'org.created': 'Organisation created',        'org.suspended': 'Organisation suspended',
  'rider.created': 'Rider added',               'user.invited': 'User invited',
  'user.deactivated': 'User deactivated',       'route.dispatched': 'Route dispatched',
  'receipt.disputed': 'Receipt disputed',       'task.bulk_uploaded': 'Tasks bulk uploaded',
  'platform.settings': 'Platform settings updated', 'facility.created': 'Facility created',
  'settings.branding': 'Branding updated',
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === 'danger')  return <AlertCircle size={14} style={{ color: 'var(--danger)',  flexShrink: 0 }} />;
  if (severity === 'warning') return <AlertTriangle size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />;
  return <Info size={14} style={{ color: 'var(--info)', flexShrink: 0 }} />;
};

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const filtered = MOCK_AUDIT_LOG.filter(e => {
    const matchSearch = e.actor.toLowerCase().includes(search.toLowerCase()) ||
      e.target.toLowerCase().includes(search.toLowerCase()) ||
      ACTION_LABELS[e.action]?.toLowerCase().includes(search.toLowerCase());
    const matchOrg = orgFilter === 'all' || e.org === MOCK_ORGANIZATIONS.find(o => String(o.id) === orgFilter)?.name || (orgFilter === 'platform' && !e.org);
    const matchSev = severityFilter === 'all' || e.severity === severityFilter;
    return matchSearch && matchOrg && matchSev;
  });

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Audit Log</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>All platform activity — who did what and when</p>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events, actors, targets…"
            className="w-full pl-9 pr-4 py-2.5 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)}
          className="px-3 py-2.5 rounded-[10px] text-[13px]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none', minWidth: 180 }}>
          <option value="all">All Organisations</option>
          <option value="platform">Platform Only</option>
          {MOCK_ORGANIZATIONS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
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
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>No events match your filters.</p>
          </div>
        ) : (
          <div>
            {filtered.map((event, i) => (
              <div key={event.id}
                className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div className="mt-0.5 flex-shrink-0">
                  <SeverityIcon severity={event.severity} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-0.5">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {ACTION_LABELS[event.action] ?? event.action}
                    </span>
                    <Badge color={ROLE_COLORS[event.actor_role] as any}>{ROLE_LABELS[event.actor_role] ?? event.actor_role}</Badge>
                    {event.severity === 'danger' && <Badge color="danger">Critical</Badge>}
                    {event.severity === 'warning' && <Badge color="warning">Warning</Badge>}
                  </div>
                  <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--brand)' }}>{event.actor}</span>
                    {event.org && <> · <span style={{ color: 'var(--text-muted)' }}>{event.org}</span></>}
                  </p>
                  <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>{event.target}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(event.ts).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(event.ts).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
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
