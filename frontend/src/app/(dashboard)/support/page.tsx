'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Plus, MessageSquare, ChevronRight, X, Send, Clock,
  AlertTriangle, CheckCircle2, CircleDot,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  messages?: TicketMessage[];
}

interface TicketMessage {
  id: number;
  message: string;
  user: { id: number; name: string; email: string } | null;
  is_internal: boolean;
  created_at: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  open: <CircleDot size={13} className="text-blue-400" />,
  in_progress: <Clock size={13} className="text-amber-400" />,
  resolved: <CheckCircle2 size={13} className="text-emerald-400" />,
  closed: <CheckCircle2 size={13} className="text-gray-500" />,
};

const PRIORITY_COLOR: Record<string, string> = {
  low: 'text-gray-400 bg-gray-500/10',
  medium: 'text-blue-400 bg-blue-500/10',
  high: 'text-amber-400 bg-amber-500/10',
  critical: 'text-red-400 bg-red-500/10',
};

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', category: 'bug', priority: 'medium' });

  const { mutate, isPending } = useMutation({
    mutationFn: () => post('/support/tickets', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[--bg-surface] rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[--border]">
          <h2 className="text-lg font-semibold text-[--text-1]">Open a Support Ticket</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Brief summary of the issue"
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-sm text-[--text-1] placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-sm text-[--text-1] focus:outline-none focus:border-emerald-500"
              >
                <option value="bug">Bug Report</option>
                <option value="feature_request">Feature Request</option>
                <option value="billing">Billing</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-sm text-[--text-1] focus:outline-none focus:border-emerald-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Please describe the issue in detail..."
              rows={5}
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-sm text-[--text-1] placeholder-gray-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[--border] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <Button
            onClick={() => mutate()}
            loading={isPending}
            disabled={!form.title.trim() || !form.description.trim()}
          >
            Submit Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}

function TicketDetailModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');

  const { data: full } = useQuery({
    queryKey: ['support-ticket', ticket.id],
    queryFn: () => get<Ticket>(`/support/tickets/${ticket.id}`),
  });

  const { mutate: sendMsg, isPending } = useMutation({
    mutationFn: () => post(`/support/tickets/${ticket.id}/messages`, { message: reply }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-ticket', ticket.id] });
      setReply('');
    },
  });

  const messages = full?.messages ?? [];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[--bg-surface] rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[--border] shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              {STATUS_ICON[full?.status ?? ticket.status]}
              <span className="text-xs text-gray-500 capitalize">{(full?.status ?? ticket.status).replace('_', ' ')}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLOR[ticket.priority])}>
                {ticket.priority}
              </span>
            </div>
            <h2 className="text-base font-semibold text-[--text-1] truncate">{ticket.title}</h2>
            <p className="text-xs text-gray-600 mt-0.5">#{ticket.id} · {ticket.category.replace('_', ' ')} · {formatDateTime(ticket.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Original description */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-emerald-400">Y</span>
            </div>
            <div className="flex-1 bg-[--bg-elevated] rounded-xl rounded-tl-sm p-4">
              <p className="text-sm text-[--text-1] leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
              <p className="text-xs text-gray-600 mt-2">{formatDateTime(ticket.created_at)}</p>
            </div>
          </div>

          {messages.map((msg) => {
            const isSupport = msg.user === null;
            return (
              <div key={msg.id} className={cn('flex gap-3', isSupport ? 'flex-row-reverse' : '')}>
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold',
                  isSupport ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                )}>
                  {isSupport ? 'RH' : (msg.user?.name?.[0] ?? '?')}
                </div>
                <div className={cn(
                  'flex-1 rounded-xl p-4 max-w-md',
                  isSupport
                    ? 'bg-purple-500/10 border border-purple-500/20 rounded-tr-sm'
                    : 'bg-[--bg-elevated] rounded-tl-sm'
                )}>
                  <p className="text-sm text-[--text-1] leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {msg.user && <span className="text-xs text-gray-600">{msg.user.name}</span>}
                    <span className="text-xs text-gray-600">{formatDateTime(msg.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply box */}
        {(full?.status ?? ticket.status) !== 'closed' && (
          <div className="border-t border-[--border] p-4 flex gap-3 shrink-0">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="flex-1 px-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-sm text-[--text-1] placeholder-gray-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
            <Button
              onClick={() => sendMsg()}
              loading={isPending}
              disabled={!reply.trim()}
              className="self-end"
            >
              <Send size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => get<{ data: Ticket[] }>('/support/tickets'),
  });

  const tickets = data?.data ?? [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-1]">Support</h1>
          <p className="text-gray-500 text-sm mt-0.5">Get help from the RouteHealth team</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[--bg-surface] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare size={40} className="text-gray-700 mb-4" />
          <p className="text-gray-500 font-medium">No support tickets yet</p>
          <p className="text-gray-600 text-sm mt-1 mb-6">Submit a ticket and we'll get back to you within 24 hours</p>
          <Button onClick={() => setShowNew(true)}>
            <Plus size={16} /> Open First Ticket
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelected(ticket)}
              className="w-full group"
            >
              <Card className="flex items-center gap-4 hover:border-emerald-500/30 transition-all group-hover:shadow-lg group-hover:shadow-emerald-500/5 text-left">
                <div className="shrink-0">
                  {STATUS_ICON[ticket.status] ?? <CircleDot size={13} className="text-gray-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-[--text-1] truncate">{ticket.title}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', PRIORITY_COLOR[ticket.priority])}>
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>#{ticket.id}</span>
                    <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {formatDateTime(ticket.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500 capitalize px-2.5 py-1 bg-[--bg-elevated] rounded-full">
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-emerald-400 transition-colors" />
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} />}
      {selected && <TicketDetailModal ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
