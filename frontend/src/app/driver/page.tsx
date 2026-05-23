'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Clock, CheckCircle2, AlertCircle, Camera, Package,
  ChevronDown, ChevronUp, Phone, Navigation, Bike, LogOut,
  RefreshCw, Play, Flag, X, AlertTriangle,
} from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

/* ── Types ───────────────────────────────────────────────────────────────── */
interface StopFacility {
  id: number; name: string; address_line_1: string; city: string;
  latitude: number; longitude: number; contact_name: string;
  contact_phone: string; special_notes: string | null; facility_type: string;
}
interface StopTask { id: number; type: string; priority: string; notes: string | null; }
interface Stop {
  id: number; sequence: number; status: string;
  planned_arrival: string | null; actual_arrival: string | null;
  fail_reason: string | null; fail_notes: string | null;
  has_pickup_photo: boolean; has_delivery_photo: boolean;
  facility: StopFacility | null; task: StopTask | null;
}
interface DriverRoute {
  id: number; date: string; status: string;
  depot_latitude: number; depot_longitude: number;
  planned_start_time: string | null; total_distance_km: string | null;
  stops: Stop[];
}

const FAIL_REASONS = [
  { value: 'facility_closed',   label: 'Facility closed' },
  { value: 'wrong_address',     label: 'Wrong address' },
  { value: 'no_contact',        label: 'No contact person' },
  { value: 'sample_not_ready',  label: 'Sample not ready' },
  { value: 'other',             label: 'Other' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending:    { label: 'Pending',    bg: '#f3f4f6', color: '#6b7280' },
  arrived:    { label: 'At Location', bg: '#eff6ff', color: '#3b82f6' },
  collected:  { label: 'Collected',  bg: '#f0fdf4', color: '#16a34a' },
  delivered:  { label: 'Delivered',  bg: '#f0fdf4', color: '#16a34a' },
  confirmed_delivered: { label: 'Confirmed',  bg: '#f0fdf4', color: '#16a34a' },
  failed:     { label: 'Failed',     bg: '#fef2f2', color: '#dc2626' },
  disputed:   { label: 'Disputed',   bg: '#fff7ed', color: '#ea580c' },
};

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function DriverPage() {
  const { user, logout } = useAuth();
  const [routes, setRoutes]         = useState<DriverRoute[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expandedStop, setExpandedStop] = useState<number | null>(null);
  const [failModal, setFailModal]   = useState<Stop | null>(null);
  const [failReason, setFailReason] = useState('facility_closed');
  const [failNotes, setFailNotes]   = useState('');
  const [busy, setBusy]             = useState(false);
  const photoInputRef               = useRef<HTMLInputElement>(null);
  const pendingPhotoStop            = useRef<{ stop: Stop; type: 'pickup' | 'delivery' } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/driver/routes/today');
      const data = res.data?.data;
      setRoutes(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Could not load routes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh stops in a route after an action
  const refreshRoute = async (routeId: number) => {
    try {
      const res = await api.get('/driver/routes/today');
      const data = res.data?.data;
      if (Array.isArray(data)) setRoutes(data);
    } catch {}
  };

  /* ── Route actions ─────────────────────────────────────────────────── */
  const startRoute = async (route: DriverRoute) => {
    setBusy(true);
    try {
      await api.patch(`/driver/routes/${route.id}/start`);
      await refreshRoute(route.id);
      toast.success('Route started — good luck!');
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  const completeRoute = async (route: DriverRoute) => {
    if (!confirm('Mark this entire route as complete?')) return;
    setBusy(true);
    try {
      await api.patch(`/driver/routes/${route.id}/complete`);
      await load();
      toast.success('Route completed!');
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  /* ── Stop actions ──────────────────────────────────────────────────── */
  const arriveAtStop = async (stop: Stop) => {
    setBusy(true);
    try {
      // Use browser geolocation if available, fall back to 0,0
      const pos = await new Promise<GeolocationPosition | null>(res =>
        navigator.geolocation
          ? navigator.geolocation.getCurrentPosition(p => res(p), () => res(null), { timeout: 5000 })
          : res(null)
      );
      await api.patch(`/driver/stops/${stop.id}/arrive`, {
        latitude: pos?.coords.latitude ?? 0,
        longitude: pos?.coords.longitude ?? 0,
      });
      await load();
      toast.success('Marked as arrived');
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  const collectStop = async (stop: Stop) => {
    setBusy(true);
    try {
      await api.patch(`/driver/stops/${stop.id}/collect`);
      await load();
      toast.success('Sample collected');
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  const deliverStop = async (stop: Stop) => {
    setBusy(true);
    try {
      await api.patch(`/driver/stops/${stop.id}/deliver`);
      await load();
      toast.success('Delivery confirmed');
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  const submitFail = async () => {
    if (!failModal) return;
    setBusy(true);
    try {
      await api.patch(`/driver/stops/${failModal.id}/fail`, { fail_reason: failReason, fail_notes: failNotes || null });
      setFailModal(null);
      setFailNotes('');
      await load();
      toast.success('Stop reported as failed');
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  /* ── Photo upload ──────────────────────────────────────────────────── */
  const triggerPhotoUpload = (stop: Stop, type: 'pickup' | 'delivery') => {
    pendingPhotoStop.current = { stop, type };
    photoInputRef.current?.click();
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingPhotoStop.current) return;
    const { stop, type } = pendingPhotoStop.current;
    pendingPhotoStop.current = null;
    e.target.value = '';

    const pos = await new Promise<GeolocationPosition | null>(res =>
      navigator.geolocation
        ? navigator.geolocation.getCurrentPosition(p => res(p), () => res(null), { timeout: 5000 })
        : res(null)
    );

    const form = new FormData();
    form.append('photo', file);
    form.append('photo_type', type);
    form.append('latitude', String(pos?.coords.latitude ?? 0));
    form.append('longitude', String(pos?.coords.longitude ?? 0));
    form.append('taken_at', new Date().toISOString());

    setBusy(true);
    try {
      await api.post(`/driver/stops/${stop.id}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
      toast.success(`${type === 'pickup' ? 'Pickup' : 'Delivery'} photo uploaded`);
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  /* ── Render helpers ────────────────────────────────────────────────── */
  const completedStops = (r: DriverRoute) =>
    r.stops.filter(s => ['collected', 'delivered', 'confirmed_delivered'].includes(s.status)).length;
  const progressPct = (r: DriverRoute) =>
    r.stops.length > 0 ? Math.round((completedStops(r) / r.stops.length) * 100) : 0;

  /* ── Header ────────────────────────────────────────────────────────── */
  const Header = () => (
    <div style={{ background: '#4F6EF7', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bike size={18} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>RouteHealth</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{user?.name ?? 'Rider'}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={load} style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RefreshCw size={15} color="#fff" />
        </button>
        <button onClick={logout} style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <LogOut size={15} color="#fff" />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 68px)' }}>
          <p style={{ fontSize: 14, color: '#9ca3af' }}>Loading your routes…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', maxWidth: 600, margin: '0 auto' }}>
      <Header />

      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoSelected}
      />

      <div style={{ padding: '16px 16px 32px' }}>
        {/* Date */}
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {routes.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Package size={36} style={{ color: '#d1d5db', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>No route today</p>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>You have no assigned routes for today.</p>
          </div>
        ) : (
          routes.map(route => (
            <div key={route.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
              {/* Route header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                      {route.stops.length} Stop{route.stops.length !== 1 ? 's' : ''}
                    </span>
                    {route.total_distance_km && (
                      <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>· {route.total_distance_km} km</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    background: route.status === 'in_progress' ? '#eff6ff' : route.status === 'completed' ? '#f0fdf4' : '#f9fafb',
                    color: route.status === 'in_progress' ? '#3b82f6' : route.status === 'completed' ? '#16a34a' : '#6b7280',
                  }}>
                    {route.status === 'assigned' ? 'Ready to Start' : route.status === 'in_progress' ? 'In Progress' : 'Completed'}
                  </span>
                </div>

                {/* Progress bar */}
                {route.status !== 'assigned' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{completedStops(route)}/{route.stops.length} done</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{progressPct(route)}%</span>
                    </div>
                    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                      <div style={{ height: 6, background: progressPct(route) === 100 ? '#16a34a' : '#4F6EF7', borderRadius: 3, width: `${progressPct(route)}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}

                {/* Start/Complete route buttons */}
                {route.status === 'assigned' && (
                  <button
                    onClick={() => startRoute(route)}
                    disabled={busy}
                    style={{ marginTop: 12, width: '100%', height: 44, background: '#4F6EF7', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Play size={16} /> Start Route
                  </button>
                )}
                {route.status === 'in_progress' && route.stops.every(s => ['collected', 'delivered', 'confirmed_delivered', 'failed', 'disputed'].includes(s.status)) && (
                  <button
                    onClick={() => completeRoute(route)}
                    disabled={busy}
                    style={{ marginTop: 12, width: '100%', height: 44, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Flag size={16} /> Complete Route
                  </button>
                )}
              </div>

              {/* Stops */}
              <div>
                {route.stops.map((stop, idx) => {
                  const cfg = STATUS_CONFIG[stop.status] ?? STATUS_CONFIG.pending;
                  const isOpen = expandedStop === stop.id;
                  const isActive = route.status === 'in_progress';

                  return (
                    <div key={stop.id} style={{ borderBottom: idx < route.stops.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                      {/* Stop row */}
                      <button
                        onClick={() => setExpandedStop(isOpen ? null : stop.id)}
                        style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        {/* Sequence badge */}
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: cfg.bg, border: `1.5px solid ${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          {['collected', 'delivered', 'confirmed_delivered'].includes(stop.status)
                            ? <CheckCircle2 size={14} color={cfg.color} />
                            : stop.status === 'failed' || stop.status === 'disputed'
                              ? <X size={13} color={cfg.color} />
                              : <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>{stop.sequence}</span>}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {stop.facility?.name ?? `Stop ${stop.sequence}`}
                            </p>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {cfg.label}
                            </span>
                          </div>
                          {stop.facility && (
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {stop.facility.address_line_1 ? `${stop.facility.address_line_1}, ` : ''}{stop.facility.city}
                            </p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={10} /> {fmtTime(stop.planned_arrival)}
                            </span>
                            {stop.task?.priority === 'urgent' && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '1px 6px', borderRadius: 10 }}>URGENT</span>
                            )}
                          </div>
                        </div>

                        {isOpen ? <ChevronUp size={15} style={{ color: '#9ca3af', flexShrink: 0, marginTop: 4 }} /> : <ChevronDown size={15} style={{ color: '#9ca3af', flexShrink: 0, marginTop: 4 }} />}
                      </button>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div style={{ padding: '0 20px 16px', background: '#fafafa' }}>
                          {stop.facility && (
                            <div style={{ marginBottom: 12 }}>
                              {stop.facility.special_notes && (
                                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#92400e' }}>
                                  <strong>Note:</strong> {stop.facility.special_notes}
                                </div>
                              )}
                              {stop.task?.notes && (
                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#1e40af' }}>
                                  <strong>Task:</strong> {stop.task.notes}
                                </div>
                              )}
                              {stop.facility.contact_phone && (
                                <a href={`tel:${stop.facility.contact_phone}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4F6EF7', textDecoration: 'none', fontWeight: 500 }}>
                                  <Phone size={12} /> {stop.facility.contact_name} · {stop.facility.contact_phone}
                                </a>
                              )}
                              {stop.facility.latitude && stop.facility.longitude && (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${stop.facility.latitude},${stop.facility.longitude}`}
                                  target="_blank" rel="noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#059669', textDecoration: 'none', fontWeight: 500, marginLeft: 16 }}>
                                  <Navigation size={12} /> Navigate
                                </a>
                              )}
                            </div>
                          )}

                          {/* Action buttons based on stop status */}
                          {isActive && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {/* Arrive */}
                              {stop.status === 'pending' && (
                                <button onClick={() => arriveAtStop(stop)} disabled={busy}
                                  style={btnStyle('#4F6EF7')}>
                                  <MapPin size={15} /> I've Arrived
                                </button>
                              )}

                              {/* Arrived: take pickup photo + collect */}
                              {stop.status === 'arrived' && (
                                <>
                                  {!stop.has_pickup_photo && (
                                    <button onClick={() => triggerPhotoUpload(stop, 'pickup')} disabled={busy}
                                      style={btnStyle('#8B5CF6')}>
                                      <Camera size={15} /> Take Pickup Photo
                                    </button>
                                  )}
                                  {stop.has_pickup_photo && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16a34a', padding: '6px 0' }}>
                                      <CheckCircle2 size={13} /> Pickup photo uploaded
                                    </div>
                                  )}
                                  <button onClick={() => collectStop(stop)} disabled={busy || !stop.has_pickup_photo}
                                    style={btnStyle(stop.has_pickup_photo ? '#16a34a' : '#9ca3af')}>
                                    <Package size={15} /> Confirm Sample Collected
                                  </button>
                                  {!stop.has_pickup_photo && (
                                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '0', textAlign: 'center' }}>Photo required before confirming</p>
                                  )}
                                </>
                              )}

                              {/* Collected: take delivery photo + deliver */}
                              {stop.status === 'collected' && (
                                <>
                                  {!stop.has_delivery_photo && (
                                    <button onClick={() => triggerPhotoUpload(stop, 'delivery')} disabled={busy}
                                      style={btnStyle('#F59E0B')}>
                                      <Camera size={15} /> Take Delivery Photo (optional)
                                    </button>
                                  )}
                                  {stop.has_delivery_photo && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16a34a', padding: '6px 0' }}>
                                      <CheckCircle2 size={13} /> Delivery photo uploaded
                                    </div>
                                  )}
                                  <button onClick={() => deliverStop(stop)} disabled={busy}
                                    style={btnStyle('#16a34a')}>
                                    <CheckCircle2 size={15} /> Mark as Delivered
                                  </button>
                                </>
                              )}

                              {/* Fail button for pending/arrived/collected */}
                              {['pending', 'arrived', 'collected'].includes(stop.status) && (
                                <button onClick={() => { setFailModal(stop); setFailReason('facility_closed'); setFailNotes(''); }}
                                  disabled={busy}
                                  style={{ ...btnStyle('#dc2626'), background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                  <AlertTriangle size={15} /> Report Problem
                                </button>
                              )}
                            </div>
                          )}

                          {/* Failed reason display */}
                          {stop.status === 'failed' && stop.fail_reason && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626' }}>
                              <strong>Failed:</strong> {FAIL_REASONS.find(r => r.value === stop.fail_reason)?.label ?? stop.fail_reason}
                              {stop.fail_notes && <p style={{ margin: '4px 0 0', color: '#9ca3af' }}>{stop.fail_notes}</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Fail stop modal ────────────────────────────────────────────── */}
      {failModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 16px 16px', padding: 24, width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Report Problem</h3>
              <button onClick={() => setFailModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              {failModal.facility?.name ?? `Stop ${failModal.sequence}`}
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Reason *</label>
              <select value={failReason} onChange={e => setFailReason(e.target.value)}
                style={{ width: '100%', height: 40, border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, padding: '0 10px', background: '#f9fafb', outline: 'none', color: '#111827' }}>
                {FAIL_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
              <textarea value={failNotes} onChange={e => setFailNotes(e.target.value)} rows={3}
                placeholder="Any additional details…"
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, padding: '8px 10px', background: '#f9fafb', outline: 'none', color: '#111827', resize: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setFailModal(null)}
                style={{ flex: 1, height: 44, background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={submitFail} disabled={busy}
                style={{ flex: 1, height: 44, background: '#dc2626', border: 'none', borderRadius: 10, fontSize: 14, color: '#fff', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                {busy ? 'Submitting…' : 'Confirm Fail'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    width: '100%', height: 42, background: bg, color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  };
}
