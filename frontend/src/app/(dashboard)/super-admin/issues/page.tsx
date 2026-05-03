'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { MessageSquare, ChevronRight, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime, cn } from '@/lib/utils';

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export default function IssuesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter, priorityFilter],
    queryFn: () => get<any>('/super-admin/tickets', { status: statusFilter || undefined, priority: priorityFilter || undefined }),
    refetchInterval: 30000,
  });

  const tickets = (data as any)?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => patch(`/super-admin/tickets/${id}`, d),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      if (selected?.id === id) setSelected((s: any) => ({ ...s, ...(arguments[1] as any) }));
      toast.success('Updated');
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message, is_internal }: any) => post(`/super-admin/tickets/${id}/messages`, { message, is_internal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-detail', selected?.id] });
      setReply('');
      toast.success('Reply sent');
    },
  });

  const { data: detailData } = useQuery({
    queryKey: ['ticket-detail', selected?.id],
    queryFn: () => get<any>(`/support/tickets/${selected.id}`),
    enabled: !!selected,
  });

  const detail = (detailData as any)?.data ?? null;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[--text-1]">Support Issues</h1>
        <p className="text-sm text-[--text-3] mt-1">Manage support tickets from all organizations</p>
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[--bg-elevated] border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-1] focus:outline-none focus:border-emerald-500">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="bg-[--bg-elevated] border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-1] focus:outline-none focus:border-emerald-500">
          <option value="">All Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="flex gap-6" style={{ height: 'calc(100vh - 280px)' }}>
        {/* Ticket list */}
        <div className="w-96 flex-shrink-0 bg-[--bg-surface] rounded-2xl overflow-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
          {isLoading ? <TableSkeleton rows={5} cols={1} /> : !tickets.length ? (
            <EmptyState icon={MessageSquare} title="No tickets" description="No support tickets match your filters" />
          ) : tickets.map((t: any) => (
            <div
              key={t.id}
              onClick={() => setSelected(t)}
              className={cn('flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-[--border] transition-colors', selected?.id === t.id ? 'bg-emerald-500/10' : 'hover:bg-[--bg-hover]')}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[--text-3]">#{t.id} · {t.organization?.name}</span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded border', PRIORITY_STYLES[t.priority])}>{t.priority}</span>
                </div>
                <p className="text-sm font-medium text-white truncate">{t.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge status={t.status} label={t.status.replace('_', ' ')} />
                  <span className="text-xs text-[--text-3]">{t.category}</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-[--text-3] mt-1 flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="flex-1 bg-[--bg-surface] rounded-2xl flex flex-col overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="px-6 py-4 border-b border-[--border] flex items-center justify-between">
              <div>
                <p className="text-xs text-[--text-3]">#{selected.id} · {selected.organization?.name} · {selected.user?.name}</p>
                <h2 className="text-base font-semibold text-white mt-0.5">{selected.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selected.status}
                  onChange={(e) => { setSelected((s: any) => ({ ...s, status: e.target.value })); updateMutation.mutate({ id: selected.id, status: e.target.value }); }}
                  className="bg-[--bg-elevated] border border-[--border] rounded-lg px-3 py-1.5 text-sm text-[--text-1] focus:outline-none focus:border-emerald-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="bg-[--bg-elevated] rounded-xl p-4 text-sm text-[--text-2] leading-relaxed">
                {detail?.description ?? selected.description}
              </div>

              {(detail?.messages ?? []).filter((m: any) => !m.is_internal).map((msg: any) => {
                const isAdmin = msg.user?.roles?.includes('super_admin');
                return (
                  <div key={msg.id} className={cn('flex', isAdmin ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-xs rounded-2xl px-4 py-3 text-sm', isAdmin ? 'bg-emerald-500/20 text-emerald-100' : 'bg-[--bg-elevated] text-[--text-2]')}>
                      <p className="text-xs font-medium mb-1 opacity-70">{msg.user?.name}</p>
                      <p>{msg.message}</p>
                      <p className="text-xs opacity-50 mt-1">{formatDateTime(msg.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-[--border] space-y-2">
              <label className="flex items-center gap-2 text-xs text-[--text-3]">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded" />
                Internal note (not visible to user)
              </label>
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  rows={2}
                  className="flex-1 bg-[--bg-elevated] border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-1] placeholder:text-[--text-3] focus:outline-none focus:border-emerald-500 resize-none"
                />
                <Button onClick={() => replyMutation.mutate({ id: selected.id, message: reply, is_internal: isInternal })} loading={replyMutation.isPending} disabled={!reply.trim()}>
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[--text-3] text-sm">
            Select a ticket to view details
          </div>
        )}
      </div>
    </div>
  );
}
