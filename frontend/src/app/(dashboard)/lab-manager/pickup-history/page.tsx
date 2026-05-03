'use client';

import { useState, useMemo } from 'react';
import { Camera, Download, History, X, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MOCK_LAB_HISTORY } from '@/lib/mock-data';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'success',
  disputed: 'danger',
  failed: 'danger',
  collected: 'brand',
  in_transit: 'brand',
};

const MOCK_PHOTOS = {
  pickup: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&q=80',
  delivery: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&q=80',
};

export default function PickupHistoryPage() {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(
    new Date(today.getTime() - 6 * 86400000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [custodyItem, setCustodyItem] = useState<(typeof MOCK_LAB_HISTORY)[0] | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return MOCK_LAB_HISTORY.filter(p => {
      const inRange = p.date >= dateFrom && p.date <= dateTo;
      const statusOk = statusFilter === 'all' || p.status === statusFilter;
      return inRange && statusOk;
    });
  }, [dateFrom, dateTo, statusFilter]);

  const handleDownloadPDF = (id: number) => {
    setDownloading(id);
    setTimeout(() => {
      setDownloading(null);
      toast.success('PDF downloaded');
    }, 1200);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Pickup History
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Chain of custody records for your facility</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
          >
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="disputed">Disputed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="text-[12px] self-end pb-2.5" style={{ color: 'var(--text-tertiary)' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="data-table rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        {filtered.length === 0 ? (
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
              {filtered.map((p, i) => (
                <tr key={p.id}
                  className="transition-colors"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.date}</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{p.time}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.facility.name}</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{(p.facility as any).city ?? 'Nairobi'}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                        {p.rider.name.charAt(0)}
                      </div>
                      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{p.rider.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge color={STATUS_COLORS[p.status] as any}>
                      {p.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    {p.has_photos ? (
                      <button onClick={() => setCustodyItem(p)}
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
                      onClick={() => handleDownloadPDF(p.id)}
                      disabled={downloading === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all"
                      style={{
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        cursor: downloading === p.id ? 'wait' : 'pointer',
                        opacity: downloading === p.id ? 0.6 : 1,
                      }}>
                      <Download size={12} />
                      {downloading === p.id ? 'Downloading…' : 'PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-[14px]"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <History size={28} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No records found</p>
          </div>
        ) : filtered.map(p => (
          <div key={p.id} className="rounded-[14px] p-4"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{p.facility.name}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{p.date} · {p.time}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                    {p.rider.name.charAt(0)}
                  </div>
                  {p.rider.name}
                </div>
              </div>
              <Badge color={STATUS_COLORS[p.status] as any}>
                {p.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {p.has_photos && (
                <button onClick={() => setCustodyItem(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[8px] text-[12px] font-medium"
                  style={{ background: 'var(--brand-subtle)', color: 'var(--brand)', border: 'none', cursor: 'pointer' }}>
                  <Camera size={12} /> View Photos
                </button>
              )}
              <button onClick={() => handleDownloadPDF(p.id)}
                disabled={downloading === p.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[8px] text-[12px] font-medium"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                <Download size={12} /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custody modal */}
      {custodyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setCustodyItem(null)}>
          <div className="w-full max-w-lg rounded-[20px] overflow-hidden"
            style={{ background: 'var(--bg-surface)', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Chain of Custody
                </h3>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {custodyItem.facility.name} · {custodyItem.date}
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
                  { label: 'Rider', value: custodyItem.rider.name },
                  { label: 'Time', value: custodyItem.time },
                  { label: 'Status', value: custodyItem.status.replace(/_/g, ' '), isStatus: true },
                  { label: 'Photos', value: custodyItem.has_photos ? 'Available' : 'None' },
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
              {custodyItem.has_photos && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Custody Photos
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['pickup', 'delivery'] as const).map(type => (
                      <div key={type} className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                        <img
                          src={MOCK_PHOTOS[type]}
                          alt={`${type} photo`}
                          className="w-full h-[120px] object-cover"
                        />
                        <div className="p-2.5">
                          <p className="text-[11px] font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{type}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                            {custodyItem.date} {custodyItem.time} · GPS verified
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmation status */}
              <div className="flex items-center gap-2.5 p-3 rounded-[10px]"
                style={{ background: custodyItem.status === 'confirmed' ? 'var(--success-subtle)' : custodyItem.status === 'disputed' ? 'var(--danger-subtle)' : 'var(--bg-subtle)' }}>
                {custodyItem.status === 'confirmed' ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                ) : custodyItem.status === 'disputed' ? (
                  <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                ) : (
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                )}
                <div>
                  <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {custodyItem.status === 'confirmed' ? 'Receipt confirmed via WhatsApp' :
                      custodyItem.status === 'disputed' ? 'Dispute raised — dispatcher notified' :
                      'Awaiting confirmation'}
                  </p>
                  {custodyItem.status !== 'failed' && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {custodyItem.date} at {custodyItem.time}
                    </p>
                  )}
                </div>
              </div>

              {/* Download */}
              <button
                onClick={() => { handleDownloadPDF(custodyItem.id); setCustodyItem(null); }}
                className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold transition-all"
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Download size={13} className="inline mr-1.5" />
                Download Proof of Delivery PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
