'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle,
  Truck, RefreshCw, Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { get, post, getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stop {
  id: number;
  sequence: number;
  status: string;
  can_confirm: boolean;
  planned_arrival: string | null;
  actual_arrival: string | null;
  fail_reason: string | null;
  fail_notes: string | null;
  has_pickup_photo: boolean;
  has_delivery_photo: boolean;
  facility: { id: number; name: string; city: string; contact_name: string; contact_phone: string } | null;
  rider: { id: number; name: string; vehicle_type: string; phone: string } | null;
  task: { id: number; type: string; priority: string; notes: string | null } | null;
  route: { id: number; date: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending:              'gray',
  arrived:              'warning',
  collected:            'brand',
  delivered:            'brand',
  confirmed_delivered:  'success',
  failed:               'danger',
  disputed:             'danger',
};

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LabManagerDashboard() {
  const [stops, setStops]     = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState<number | null>(null);
  const [disputeModal, setDisputeModal] = useState<Stop | null>(null);
  const [disputeNote, setDisputeNote]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get<Stop[]>('/lab/pickups/today');
      setStops(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirm = async (stop: Stop, response: 'confirm' | 'dispute', note?: string) => {
    setBusy(stop.id);
    try {
      const updated = await post<Stop>(`/lab/confirmations/${stop.id}`, {
        response,
        dispute_note: note ?? null,
      });
      setStops(prev => prev.map(s => s.id === stop.id ? (updated as any).data ?? updated : s));
      toast.success(response === 'confirm' ? 'Receipt confirmed' : 'Dispute raised — dispatcher notified');
      setDisputeModal(null);
      setDisputeNote('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const dateStr = new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });

  const stats = {
    expected:  stops.length,
    in_transit: stops.filter(s => ['pending', 'arrived', 'collected'].includes(s.status)).length,
    confirmed: stops.filter(s => s.status === 'confirmed_delivered').length,
    disputed:  stops.filter(s => s.status === 'disputed').length,
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Today's Pickups
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{dateStr}</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[12px] font-medium transition-all"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Expected',   value: stats.expected,   color: 'var(--text-primary)', subtle: 'var(--bg-subtle)',        icon: ClipboardList },
          { label: 'In Transit', value: stats.in_transit, color: 'var(--brand)',         subtle: 'var(--brand-subtle)',     icon: Truck },
          { label: 'Confirmed',  value: stats.confirmed,  color: 'var(--success)',       subtle: 'var(--success-subtle)',   icon: CheckCircle2 },
          { label: 'Disputed',   value: stats.disputed,   color: 'var(--danger)',        subtle: 'var(--danger-subtle)',    icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="rounded-[14px] p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
              <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: s.subtle }}>
                <s.icon size={13} style={{ color: s.color }} />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-10 rounded animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
            ) : (
              <p className="text-[28px] font-bold leading-none" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Pickups list */}
      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Incoming Samples</h2>
          {!loading && <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{stops.length} stop{stops.length !== 1 ? 's' : ''}</span>}
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-[10px] animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
            ))}
          </div>
        ) : stops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No pickups today</p>
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No samples are scheduled for today</p>
          </div>
        ) : (
          stops.map((stop, i) => (
            <div key={stop.id}
              className="flex items-start gap-4 px-5 py-4 transition-colors"
              style={{ borderBottom: i < stops.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>

              {/* Rider avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5"
                style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                {stop.rider?.name.charAt(0) ?? '?'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {stop.facility?.name ?? '—'}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {stop.task?.type === 'pickup' ? 'Sample Pickup' : 'Delivery'} · {stop.facility?.city}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        <Truck size={11} /> {stop.rider?.name ?? '—'}
                      </span>
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        <Clock size={11} />
                        {stop.actual_arrival ? `Arrived ${fmtTime(stop.actual_arrival)}` : `ETA ${fmtTime(stop.planned_arrival)}`}
                      </span>
                      {stop.task?.priority === 'urgent' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--danger-subtle)', color: 'var(--danger)' }}>URGENT</span>
                      )}
                    </div>
                    {stop.task?.notes && (
                      <p className="text-[12px] mt-1.5 italic" style={{ color: 'var(--text-tertiary)' }}>
                        "{stop.task.notes}"
                      </p>
                    )}
                  </div>
                  <Badge color={STATUS_COLORS[stop.status] as any}>
                    {stop.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {/* Action buttons */}
                {stop.can_confirm && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => confirm(stop, 'confirm')}
                      disabled={busy === stop.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                      style={{ background: 'var(--success)', color: '#fff', border: 'none', cursor: busy === stop.id ? 'wait' : 'pointer', opacity: busy === stop.id ? 0.7 : 1 }}>
                      <CheckCircle2 size={12} /> Confirm Receipt
                    </button>
                    <button
                      onClick={() => { setDisputeModal(stop); setDisputeNote(''); }}
                      disabled={busy === stop.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                      style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger-border)', cursor: 'pointer' }}>
                      <AlertTriangle size={12} /> Dispute
                    </button>
                  </div>
                )}

                {stop.status === 'confirmed_delivered' && (
                  <p className="flex items-center gap-1.5 mt-2 text-[12px]" style={{ color: 'var(--success)' }}>
                    <CheckCircle2 size={12} /> Receipt confirmed
                  </p>
                )}
                {stop.status === 'disputed' && (
                  <p className="flex items-center gap-1.5 mt-2 text-[12px]" style={{ color: 'var(--danger)' }}>
                    <AlertTriangle size={12} /> Dispute raised — dispatcher notified
                  </p>
                )}
                {stop.status === 'failed' && (
                  <p className="flex items-center gap-1.5 mt-2 text-[12px]" style={{ color: 'var(--danger)' }}>
                    <AlertTriangle size={12} /> Stop failed: {stop.fail_reason?.replace(/_/g, ' ') ?? '—'}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dispute modal */}
      {disputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setDisputeModal(null)}>
          <div className="w-full max-w-md rounded-[18px] overflow-hidden"
            style={{ background: 'var(--bg-surface)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Raise Dispute</h3>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {disputeModal.facility?.name}
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Reason (optional)
                </label>
                <textarea
                  value={disputeNote}
                  onChange={e => setDisputeNote(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue — wrong sample, damaged, missing, etc."
                  style={{ width: '100%', border: '1.5px solid var(--border-strong)', borderRadius: 10, fontSize: 13, padding: '8px 12px', background: 'var(--bg-subtle)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDisputeModal(null)}
                  style={{ flex: 1, height: 42, background: 'var(--bg-subtle)', border: '1.5px solid var(--border-strong)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>
                  Cancel
                </button>
                <button
                  onClick={() => confirm(disputeModal, 'dispute', disputeNote || undefined)}
                  disabled={busy === disputeModal.id}
                  style={{ flex: 1, height: 42, background: 'var(--danger)', border: 'none', borderRadius: 10, fontSize: 13, color: '#fff', cursor: busy === disputeModal.id ? 'wait' : 'pointer', fontWeight: 600, opacity: busy === disputeModal.id ? 0.7 : 1 }}>
                  {busy === disputeModal.id ? 'Submitting…' : 'Confirm Dispute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
