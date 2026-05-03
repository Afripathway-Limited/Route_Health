'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Search, Filter, ChevronDown, ChevronRight, Shield, Clock } from 'lucide-react';
import { formatDateTime, cn } from '@/lib/utils';

interface AuditEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  user: { id: number; name: string; email: string } | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLOR: Record<string, string> = {
  'task.reassigned': 'text-blue-400 bg-blue-500/10',
  'facility.created': 'text-emerald-400 bg-emerald-500/10',
  'facility.updated': 'text-amber-400 bg-amber-500/10',
  'facility.deleted': 'text-red-400 bg-red-500/10',
  'rider.created': 'text-emerald-400 bg-emerald-500/10',
  'rider.updated': 'text-amber-400 bg-amber-500/10',
  'rider.deleted': 'text-red-400 bg-red-500/10',
  'user.invited': 'text-purple-400 bg-purple-500/10',
  'user.deactivated': 'text-red-400 bg-red-500/10',
  'user.activated': 'text-emerald-400 bg-emerald-500/10',
  'route.dispatched': 'text-blue-400 bg-blue-500/10',
  'settings.updated': 'text-amber-400 bg-amber-500/10',
};

function DiffView({ old: oldVal, next: newVal }: { old: any; next: any }) {
  if (!oldVal && !newVal) return null;

  const allKeys = Array.from(new Set([
    ...Object.keys(oldVal ?? {}),
    ...Object.keys(newVal ?? {}),
  ])).filter((k) => !['created_at', 'updated_at'].includes(k));

  const changed = allKeys.filter((k) => {
    const o = JSON.stringify(oldVal?.[k]);
    const n = JSON.stringify(newVal?.[k]);
    return o !== n;
  });

  if (changed.length === 0) {
    return <p className="text-xs text-gray-600 italic">No field changes recorded</p>;
  }

  return (
    <div className="space-y-1.5">
      {changed.map((key) => (
        <div key={key} className="flex items-start gap-3 text-xs">
          <span className="text-gray-600 font-mono w-40 shrink-0 pt-0.5 truncate">{key}</span>
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {oldVal?.[key] !== undefined && (
              <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-mono truncate max-w-48">
                {JSON.stringify(oldVal[key])}
              </span>
            )}
            {oldVal?.[key] !== undefined && newVal?.[key] !== undefined && (
              <ChevronRight size={12} className="text-gray-600 shrink-0 mt-0.5" />
            )}
            {newVal?.[key] !== undefined && (
              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono truncate max-w-48">
                {JSON.stringify(newVal[key])}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', search, action],
    queryFn: () => get<{ data: AuditEntry[]; meta: any }>('/audit-logs', {
      params: { search: search || undefined, action: action || undefined },
    }),
  });

  const logs = data?.data ?? [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10">
            <Shield size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[--text-1]">Audit Log</h1>
            <p className="text-gray-500 text-sm mt-0.5">All tracked actions in your organization</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user or entity..."
            className="w-full pl-9 pr-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-sm text-[--text-1] placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filter by action..."
            className="pl-9 pr-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-sm text-[--text-1] placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </Card>

      {/* Log table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-[--border]">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex gap-4">
                <div className="w-32 h-4 bg-[--bg-elevated] rounded animate-pulse" />
                <div className="flex-1 h-4 bg-[--bg-elevated] rounded animate-pulse" />
                <div className="w-40 h-4 bg-[--bg-elevated] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Shield size={40} className="text-gray-700 mb-4" />
            <p className="text-gray-500 font-medium">No audit entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-[--border]">
            {logs.map((entry) => {
              const isOpen = expanded === entry.id;
              const colorClass = ACTION_COLOR[entry.action] ?? 'text-gray-400 bg-gray-500/10';
              const hasDiff = entry.old_values || entry.new_values;

              return (
                <div key={entry.id}>
                  <button
                    onClick={() => hasDiff && setExpanded(isOpen ? null : entry.id)}
                    className={cn(
                      'w-full flex items-center gap-4 px-6 py-4 text-left transition-colors',
                      hasDiff ? 'hover:bg-[--bg-elevated] cursor-pointer' : 'cursor-default',
                      isOpen && 'bg-[--bg-elevated]'
                    )}
                  >
                    {/* Action badge */}
                    <span className={cn('text-xs font-mono px-2.5 py-1 rounded-full font-medium whitespace-nowrap', colorClass)}>
                      {entry.action}
                    </span>

                    {/* Entity */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[--text-1] truncate">
                        {entry.entity_type}
                        {entry.entity_id ? ` #${entry.entity_id}` : ''}
                      </p>
                    </div>

                    {/* User */}
                    <div className="text-right min-w-32">
                      <p className="text-sm text-gray-400 truncate">{entry.user?.name ?? 'System'}</p>
                      {entry.ip_address && (
                        <p className="text-xs text-gray-600">{entry.ip_address}</p>
                      )}
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap min-w-36">
                      <Clock size={11} />
                      {formatDateTime(entry.created_at)}
                    </div>

                    {hasDiff && (
                      <ChevronDown
                        size={14}
                        className={cn('text-gray-600 shrink-0 transition-transform', isOpen && 'rotate-180')}
                      />
                    )}
                  </button>

                  {/* Diff expanded */}
                  {isOpen && hasDiff && (
                    <div className="px-6 py-4 bg-[--bg-elevated] border-t border-[--border]">
                      <DiffView old={entry.old_values} next={entry.new_values} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {data?.meta && (
        <p className="text-xs text-gray-600 text-center">
          {data.meta.total} total entries · Page {data.meta.current_page} of {data.meta.last_page}
        </p>
      )}
    </div>
  );
}
