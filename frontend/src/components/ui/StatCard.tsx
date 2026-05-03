import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'brand' | 'success' | 'info' | 'danger' | 'warning' | 'purple' | 'gray'
        | 'emerald' | 'blue' | 'red' | 'amber' | 'slate';
  alert?: boolean;
  className?: string;
}

type ColorCfg = {
  iconBg: string;
  iconColor: string;
  alertBar: string;
};

const colors: Record<string, ColorCfg> = {
  brand: {
    iconBg:    'var(--brand-subtle)',
    iconColor: 'var(--brand)',
    alertBar:  'var(--brand)',
  },
  success: {
    iconBg:    'var(--success-subtle)',
    iconColor: 'var(--success)',
    alertBar:  'var(--success)',
  },
  info: {
    iconBg:    'var(--info-subtle)',
    iconColor: 'var(--info)',
    alertBar:  'var(--info)',
  },
  danger: {
    iconBg:    'var(--danger-subtle)',
    iconColor: 'var(--danger)',
    alertBar:  'var(--danger)',
  },
  warning: {
    iconBg:    'var(--warning-subtle)',
    iconColor: 'var(--warning)',
    alertBar:  'var(--warning)',
  },
  purple: {
    iconBg:    'var(--purple-subtle)',
    iconColor: 'var(--purple)',
    alertBar:  'var(--purple)',
  },
  gray: {
    iconBg:    'var(--bg-subtle)',
    iconColor: 'var(--text-secondary)',
    alertBar:  'var(--border-strong)',
  },
};

/* Map old 'emerald'/'blue'/'red'/'amber'/'slate' to new tokens */
const colorAlias: Record<string, string> = {
  emerald: 'success',
  blue:    'info',
  red:     'danger',
  amber:   'warning',
  slate:   'gray',
};

export function StatCard({ title, value, icon: Icon, trend, color = 'brand', alert = false, className }: StatCardProps) {
  const resolvedColor = colorAlias[color] ?? color;
  const cfg = colors[resolvedColor] ?? colors.gray;
  const isAlert = alert && Number(value) > 0;

  return (
    <div
      className={cn('relative overflow-hidden rounded-[14px] p-5 transition-all duration-200 group', className)}
      style={{
        background: 'var(--bg-surface)',
        border: isAlert ? `2px solid ${cfg.alertBar}` : 'none',
        borderTop: isAlert ? `3px solid ${cfg.alertBar}` : 'none',
        boxShadow: isAlert ? 'var(--shadow-card)' : 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = 'var(--shadow-md)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = 'var(--shadow-card)';
        el.style.transform = '';
      }}
    >
      {/* Top row: overline label + icon container */}
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-[11px] font-semibold tracking-[0.08em] uppercase truncate"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {title}
        </p>
        <div
          className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ml-2"
          style={{ background: cfg.iconBg }}
        >
          <Icon size={16} style={{ color: cfg.iconColor }} />
        </div>
      </div>

      {/* Metric number */}
      <p
        className="text-[28px] font-bold leading-none tracking-[-0.03em]"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </p>

      {/* Trend pill */}
      {trend && (
        <div className="flex items-center gap-2 mt-3">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[11px] font-semibold border"
            style={
              trend.value >= 0
                ? { background: 'var(--success-subtle)', color: 'var(--success)', borderColor: 'var(--success-border)' }
                : { background: 'var(--danger-subtle)',  color: 'var(--danger)',  borderColor: 'var(--danger-border)'  }
            }
          >
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
}
