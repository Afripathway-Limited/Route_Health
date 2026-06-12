'use client';

import { useState } from 'react';
import { Search, Truck, CheckCircle2, AlertTriangle, ChevronRight, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'brand', completed: 'success',
  planned: 'warning', assigned: 'warning', cancelled: 'danger',
};

const VEHICLE_ICON: Record<string, string> = {
  motorbike: '🏍️', bicycle: '🚲', car: '🚗', van: '🚐',
};

interface RouteRow {
  id: number;
  date: string;
  status: string;
  total_distance_km: number | null;
  completed_stops: number;
  total_stops: number;
  rider: { id: number; name: string; vehicle_type: string } | null;
  stops: { status: string }[];
}

export default function RoutesHistoryPage() {
  const router = useRouter();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter]     = useState('');

  const { data: routes = [], isLoading } = useQuery<RouteRow[]>({
    queryKey: ['routes'],
    queryFn: () => get<RouteRow[]>('/routes'),
  });

  const filtered = routes.filter(r => {
    const matchSearch = !search || (r.rider?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchDate   = !dateFilter || r.date === dateFilter;
    return matchSearch && matchStatus && matchDate;
  });

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Route History
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>All dispatched routes and their outcomes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by rider name..."
            className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-[10px] text-[13px]"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}>
          <option value="all">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
      </div>

      {/* Table */}
      <div className="data-table rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Loading routes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Truck size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No routes found</p>
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Route', 'Rider', 'Status', 'Stops', 'Completion', 'Distance', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)', background: 'var(--bg-subtle)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((route, i) => {
                  const failedStops = (route.stops ?? []).filter(s => s.status === 'failed').length;
                  const pct = route.total_stops > 0 ? Math.round((route.completed_stops / route.total_stops) * 100) : 0;
                  const barColor = pct === 100 ? 'var(--success)' : pct >= 75 ? 'var(--brand)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <tr key={route.id} className="transition-colors cursor-pointer"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                      onClick={() => router.push(`/dispatcher/routes/${route.id}`)}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{route.date}</p>
                        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>#{route.id}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {route.rider ? (
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{VEHICLE_ICON[route.rider.vehicle_type] ?? '🏍️'}</span>
                            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{route.rider.name}</p>
                          </div>
                        ) : (
                          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge color={STATUS_COLORS[route.status] as any}>{route.status.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {failedStops > 0
                            ? <AlertTriangle size={12} style={{ color: 'var(--danger)' }} />
                            : <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />}
                          <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
                            {route.completed_stops}/{route.total_stops}
                          </span>
                          {failedStops > 0 && (
                            <span className="text-[11px]" style={{ color: 'var(--danger)' }}>({failedStops} failed)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                          <span className="text-[11px] font-medium w-8 text-right" style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                        {route.total_distance_km ? `${route.total_distance_km} km` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-[14px]"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <Truck size={28} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No routes found</p>
          </div>
        ) : filtered.map(route => {
          const pct = route.total_stops > 0 ? Math.round((route.completed_stops / route.total_stops) * 100) : 0;
          const barColor = pct === 100 ? 'var(--success)' : pct >= 75 ? 'var(--brand)' : 'var(--warning)';
          return (
            <button key={route.id} onClick={() => router.push(`/dispatcher/routes/${route.id}`)}
              className="w-full text-left rounded-[14px] p-4"
              style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: 'none', cursor: 'pointer' }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {route.rider ? `${VEHICLE_ICON[route.rider.vehicle_type] ?? '🏍️'} ${route.rider.name}` : 'Unassigned'}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {route.date} · #{route.id} · {route.total_distance_km ?? '—'} km
                  </p>
                </div>
                <Badge color={STATUS_COLORS[route.status] as any}>{route.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{route.completed_stops}/{route.total_stops} stops</span>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
