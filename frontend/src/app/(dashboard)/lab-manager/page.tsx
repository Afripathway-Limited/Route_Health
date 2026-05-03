'use client';

import { useState } from 'react';
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_LAB_PICKUPS } from '@/lib/mock-data';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  in_transit: 'brand',
  arrived: 'warning',
  confirmed: 'success',
  failed: 'danger',
  disputed: 'danger',
};

export default function LabManagerDashboard() {
  const [pickups, setPickups] = useState(MOCK_LAB_PICKUPS as any[]);

  const confirm = (id: number, response: 'yes' | 'no') => {
    setPickups(prev => prev.map(p => p.id === id
      ? { ...p, status: response === 'yes' ? 'confirmed' : 'disputed', can_confirm: false }
      : p
    ));
    toast.success(response === 'yes' ? 'Receipt confirmed' : 'Dispute raised — dispatcher notified');
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });

  const stats = {
    expected: pickups.length,
    arrived: pickups.filter(p => ['arrived', 'confirmed'].includes(p.status)).length,
    confirmed: pickups.filter(p => p.status === 'confirmed').length,
    disputed: pickups.filter(p => p.status === 'disputed').length,
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Today's Pickups
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{dateStr}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Expected', value: stats.expected, color: 'var(--text-primary)', subtle: 'var(--bg-subtle)' },
          { label: 'Arrived', value: stats.arrived, color: 'var(--warning)', subtle: 'var(--warning-subtle)' },
          { label: 'Confirmed', value: stats.confirmed, color: 'var(--success)', subtle: 'var(--success-subtle)' },
          { label: 'Disputed', value: stats.disputed, color: 'var(--danger)', subtle: 'var(--danger-subtle)' },
        ].map(s => (
          <div key={s.label} className="rounded-[14px] p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
            <p className="text-[28px] font-bold mt-1 leading-none" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pickups list */}
      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Expected Samples</h2>
        </div>
        <div>
          {pickups.map((p, i) => (
            <div key={p.id}
              className="flex items-start gap-4 px-5 py-4 transition-colors"
              style={{ borderBottom: i < pickups.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              {/* Rider avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                {p.rider.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {p.facility.name}
                    </p>
                    <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {p.sample_description}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        <Truck size={11} /> {p.rider.name}
                      </div>
                      <div className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        <Clock size={11} /> ETA {p.eta}
                      </div>
                    </div>
                  </div>
                  <Badge color={STATUS_COLORS[p.status] as any}>
                    {p.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {p.can_confirm && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => confirm(p.id, 'yes')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
                      style={{ background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      <CheckCircle2 size={12} /> Confirm Receipt
                    </button>
                    <button onClick={() => confirm(p.id, 'no')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
                      style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger-border)', cursor: 'pointer' }}>
                      <AlertTriangle size={12} /> Dispute
                    </button>
                  </div>
                )}

                {p.status === 'confirmed' && (
                  <div className="flex items-center gap-1.5 mt-2 text-[12px]" style={{ color: 'var(--success)' }}>
                    <CheckCircle2 size={12} /> Receipt confirmed
                  </div>
                )}
                {p.status === 'disputed' && (
                  <div className="flex items-center gap-1.5 mt-2 text-[12px]" style={{ color: 'var(--danger)' }}>
                    <AlertTriangle size={12} /> Dispute raised — dispatcher notified
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
