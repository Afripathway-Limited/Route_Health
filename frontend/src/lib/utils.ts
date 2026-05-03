import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-KE', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-KE', {
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-KE', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(dateStr);
}

export function formatDelay(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 0) return `${Math.abs(minutes)}m early`;
  if (minutes === 0) return 'On time';
  return `${minutes}m late`;
}

export function getDelayColor(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return 'text-gray-400';
  if (minutes <= 0) return 'text-emerald-400';
  if (minutes <= 15) return 'text-amber-400';
  return 'text-red-400';
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    completed: 'emerald',
    confirmed_delivered: 'emerald',
    collected: 'emerald',
    active: 'emerald',
    in_progress: 'blue',
    assigned: 'blue',
    on_route: 'blue',
    arrived: 'blue',
    pending: 'gray',
    planned: 'gray',
    available: 'gray',
    failed: 'red',
    disputed: 'red',
    suspended: 'red',
    cancelled: 'red',
    urgent: 'purple',
    standard: 'gray',
    delayed: 'amber',
    photo_taken: 'blue',
    delivered: 'emerald',
  };
  return map[status] ?? 'gray';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    confirmed_delivered: 'Confirmed',
    in_progress: 'In Progress',
    photo_taken: 'Photo Taken',
    on_route: 'On Route',
    planned: 'Planned',
    assigned: 'Assigned',
  };
  return map[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

export function vehicleIcon(type: string): string {
  const map: Record<string, string> = {
    motorbike: '🏍️',
    bicycle: '🚲',
    car: '🚗',
    van: '🚐',
  };
  return map[type] ?? '🚗';
}

export function facilityIcon(type: string): string {
  const map: Record<string, string> = {
    lab: '🧪',
    hospital: '🏥',
    clinic: '🏥',
    pharmacy: '💊',
  };
  return map[type] ?? '🏥';
}

// ── Brand color helpers ───────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full);
  if (!result) return `rgba(16,185,129,${alpha})`;
  return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
}

export function darkenHex(hex: string, amount = 20): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full);
  if (!result) return hex;
  const r = Math.max(0, parseInt(result[1], 16) - amount);
  const g = Math.max(0, parseInt(result[2], 16) - amount);
  const b = Math.max(0, parseInt(result[3], 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Writes all --brand-* CSS custom properties onto <html> from a single hex color.
 * Call this on login, on app load (from cached user), and after branding is saved.
 */
export function applyBrandColor(color: string): void {
  if (typeof document === 'undefined' || !color) return;
  document.documentElement.style.setProperty('--brand', color);
  document.documentElement.style.setProperty('--brand-hover', darkenHex(color, 20));
  document.documentElement.style.setProperty('--brand-subtle', hexToRgba(color, 0.10));
  document.documentElement.style.setProperty('--brand-border', hexToRgba(color, 0.25));
  document.documentElement.style.setProperty('--shadow-brand-glow', `0 4px 14px ${hexToRgba(color, 0.25)}`);
}

export const RIDER_COLORS = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#06B6D4', // cyan
];

export function getRiderColor(index: number): string {
  return RIDER_COLORS[index % RIDER_COLORS.length];
}
