'use client';

import { useState, useEffect, useCallback } from 'react';
import { Camera, Download, History, X, CheckCircle2, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { get, getErrorMessage } from '@/lib/api';
import { AUTH_TOKEN_KEY } from '@/lib/constants';
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

interface CustodyPhoto {
  id: number;
  type: string;
  url: string | null;
  taken_at: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CustodyData extends Stop {
  photos: CustodyPhoto[];
}

const STATUS_COLORS: Record<string, string> = {
  confirmed_delivered: 'success',
  disputed:            'danger',
  failed:              'danger',
  collected:           'brand',
  delivered:           'brand',
  pending:             'gray',
  arrived:             'warning',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PickupHistoryPage() {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(
    new Date(today.getTime() - 6 * 86400000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo]       = useState(today.toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stops, setStops]         = useState<Stop[]>([]);
  const [loading, setLoading]     = useState(true);
  const [custodyItem, setCustodyItem]   = useState<CustodyData | null>(null);
  const [custodyLoading, setCustodyLoading] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { from: dateFrom, to: dateTo };
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await get<Stop[]>('/lab/pickups/history', params);
      setStops(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCustody = async (stop: Stop) => {
    setCustodyLoading(true);
    setCustodyItem(null);
    try {
      const data = await get<CustodyData>(`/lab/custody/${stop.id}`);
      setCustodyItem(data);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setCustodyLoading(false);
    }
  };

  const handleDownloadPDF = async (stop: Stop) => {
    setDownloading(stop.id);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
      const res = await fetch(`${API_BASE}/lab/custody/${stop.id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `custody-${stop.id}-${stop.route?.date ?? 'unknown'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error('Could not download PDF');
    } finally {
      setDownloading(null);
    }
  };

  const hasPhotos = (stop: Stop) => stop.has_pickup_photo || stop.has_delivery_photo;

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Pickup History
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Chain of custody records for your facility</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[12px] font-medium transition-all"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}>
            <option value="all">All statuses</option>
            <option value="confirmed_delivered">Confirmed</option>
            <option value="disputed">Disputed</option>
            <option value="failed">Failed</option>
            <option value="collected">Collected</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
        {!loading && (
          <div className="text-[12px] self-end pb-2.5" style={{ color: 'var(--text-tertiary)' }}>
            {stops.length} record{stops.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Table (desktop) */}
      <div className="data-table rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}><div className="overflow-x-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 rounded-[10px] animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
            ))}
          </div>
        ) : stops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <History size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No records found</p>
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Try adjusting the date range or status filter</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Date & Time', 'Facility', 'Rider', 'Status', 'Photos', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)', background: 'var(--bg-subtle)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stops.map((stop, i) => (
                <tr key={stop.id}
                  className="transition-colors"
                  style={{ borderBottom: i < stops.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      {fmtDate(stop.actual_arrival ?? stop.planned_arrival ?? stop.route?.date ?? null)}
                    </p>
                    <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                      {fmtTime(stop.actual_arrival ?? stop.planned_arrival)}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{stop.facility?.name ?? '—'}</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{stop.facility?.city ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                        {stop.rider?.name.charAt(0) ?? '?'}
                      </div>
                      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{stop.rider?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge color={STATUS_COLORS[stop.status] as any}>
                      {stop.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    {hasPhotos(stop) ? (
                      <button onClick={() => openCustody(stop)}
                        className="flex items-center gap-1.5 text-[12px] font-medium transition-colors"
                        style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Camera size={13} /> View
                      </button>
                    ) : (
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleDownloadPDF(stop)}
                      disabled={downloading === stop.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all"
                      style={{
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        cursor: downloading === stop.id ? 'wait' : 'pointer',
                        opacity: downloading === stop.id ? 0.6 : 1,
                      }}>
                      <Download size={12} />
                      {downloading === stop.id ? 'Downloading…' : 'PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div></div>

      {/* Mobile cards */}
      <div className="mobile-cards space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-[14px] animate-pulse" style={{ background: 'var(--bg-surface)' }} />
          ))
        ) : stops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-[14px]"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <History size={28} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No records found</p>
          </div>
        ) : stops.map(stop => (
          <div key={stop.id} className="rounded-[14px] p-4"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {stop.facility?.name ?? '—'}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {fmtDate(stop.route?.date ? stop.route.date + 'T00:00:00' : stop.actual_arrival)} · {fmtTime(stop.actual_arrival ?? stop.planned_arrival)}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                    {stop.rider?.name.charAt(0) ?? '?'}
                  </div>
                  {stop.rider?.name ?? '—'}
                </div>
              </div>
              <Badge color={STATUS_COLORS[stop.status] as any}>
                {stop.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {hasPhotos(stop) && (
                <button onClick={() => openCustody(stop)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[8px] text-[12px] font-medium"
                  style={{ background: 'var(--brand-subtle)', color: 'var(--brand)', border: 'none', cursor: 'pointer' }}>
                  <Camera size={12} /> View Photos
                </button>
              )}
              <button onClick={() => handleDownloadPDF(stop)}
                disabled={downloading === stop.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[8px] text-[12px] font-medium"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                <Download size={12} /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custody loading overlay */}
      {custodyLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="rounded-[18px] p-6 flex items-center gap-3"
            style={{ background: 'var(--bg-surface)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--brand)' }} />
            <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>Loading custody data…</span>
          </div>
        </div>
      )}

      {/* Custody modal */}
      {custodyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setCustodyItem(null)}>
          <div className="w-full max-w-lg rounded-[20px] overflow-hidden"
            style={{ background: 'var(--bg-surface)', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-start justify-between p-5 sticky top-0" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', zIndex: 1 }}>
              <div>
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Chain of Custody</h3>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {custodyItem.facility?.name ?? '—'} · {fmtDate(custodyItem.actual_arrival ?? custodyItem.planned_arrival ?? custodyItem.route?.date ?? null)}
                </p>
              </div>
              <button onClick={() => setCustodyItem(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={14} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Rider',    value: custodyItem.rider?.name ?? '—' },
                  { label: 'Time',     value: fmtTime(custodyItem.actual_arrival ?? custodyItem.planned_arrival) },
                  { label: 'Status',   value: custodyItem.status.replace(/_/g, ' '), isStatus: true },
                  { label: 'Photos',   value: custodyItem.photos.length > 0 ? `${custodyItem.photos.length} photo${custodyItem.photos.length !== 1 ? 's' : ''}` : 'None' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
                      {item.label}
                    </p>
                    {item.isStatus ? (
                      <Badge color={STATUS_COLORS[custodyItem.status] as any}>
                        {item.value}
                      </Badge>
                    ) : (
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Photos */}
              {custodyItem.photos.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Custody Photos
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {custodyItem.photos.map(photo => (
                      <div key={photo.id} className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                        {photo.url ? (
                          <img src={photo.url} alt={`${photo.type} photo`} className="w-full h-[120px] object-cover" />
                        ) : (
                          <div className="w-full h-[120px] flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
                            <Camera size={24} style={{ color: 'var(--text-muted)' }} />
                          </div>
                        )}
                        <div className="p-2.5">
                          <p className="text-[11px] font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{photo.type}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                            {photo.taken_at ? fmtTime(photo.taken_at) : '—'}
                            {photo.latitude && photo.longitude ? ' · GPS verified' : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fail notes */}
              {custodyItem.fail_notes && (
                <div className="p-3 rounded-[10px]" style={{ background: 'var(--danger-subtle)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--danger)' }}>Dispute Note</p>
                  <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{custodyItem.fail_notes}</p>
                </div>
              )}

              {/* Confirmation status */}
              <div className="flex items-center gap-2.5 p-3 rounded-[10px]"
                style={{
                  background: custodyItem.status === 'confirmed_delivered' ? 'var(--success-subtle)'
                    : custodyItem.status === 'disputed' ? 'var(--danger-subtle)'
                    : 'var(--bg-subtle)',
                }}>
                {custodyItem.status === 'confirmed_delivered' ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                ) : custodyItem.status === 'disputed' ? (
                  <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                ) : (
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                )}
                <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {custodyItem.status === 'confirmed_delivered' ? 'Receipt confirmed' :
                   custodyItem.status === 'disputed' ? 'Dispute raised — dispatcher notified' :
                   'Awaiting confirmation'}
                </p>
              </div>

              {/* Download */}
              <button
                onClick={() => { handleDownloadPDF(custodyItem); setCustodyItem(null); }}
                disabled={downloading === custodyItem.id}
                className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold transition-all"
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Download size={13} className="inline mr-1.5" />
                {downloading === custodyItem.id ? 'Downloading…' : 'Download Proof of Delivery PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
