import { cn, getStatusColor, getStatusLabel } from '@/lib/utils';
import { type ReactNode } from 'react';

interface BadgeProps {
  status?: string;
  color?: 'success' | 'info' | 'warning' | 'danger' | 'purple' | 'gray' | 'brand';
  label?: string;
  children?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

type ColorKey = 'success' | 'info' | 'warning' | 'danger' | 'purple' | 'gray' | 'brand';

const colorVars: Record<ColorKey, { bg: string; text: string; border: string }> = {
  success: {
    bg:     'var(--success-subtle)',
    text:   'var(--success)',
    border: 'var(--success-border)',
  },
  info: {
    bg:     'var(--info-subtle)',
    text:   'var(--info)',
    border: 'var(--info-border)',
  },
  warning: {
    bg:     'var(--warning-subtle)',
    text:   'var(--warning)',
    border: 'var(--warning-border)',
  },
  danger: {
    bg:     'var(--danger-subtle)',
    text:   'var(--danger)',
    border: 'var(--danger-border)',
  },
  purple: {
    bg:     'var(--purple-subtle)',
    text:   'var(--purple)',
    border: 'var(--purple-border)',
  },
  gray: {
    bg:     'var(--bg-subtle)',
    text:   'var(--text-secondary)',
    border: 'var(--border-strong)',
  },
  brand: {
    bg:     'var(--brand-subtle)',
    text:   'var(--brand)',
    border: 'var(--brand-border)',
  },
};

const statusToColor: Record<string, ColorKey> = {
  emerald:   'success',
  blue:      'info',
  amber:     'warning',
  red:       'danger',
  purple:    'purple',
  gray:      'gray',
};

export function Badge({ status, color, label, children, size = 'sm', className }: BadgeProps) {
  let colorKey: ColorKey;
  if (color) {
    colorKey = color;
  } else if (status) {
    const rawColor = getStatusColor(status);
    colorKey = statusToColor[rawColor] ?? 'gray';
  } else {
    colorKey = 'gray';
  }

  const text = children ?? label ?? (status ? getStatusLabel(status) : '');
  const cfg = colorVars[colorKey];
  const sizeClass = size === 'sm' ? 'text-[11px] px-2.5 py-[3px]' : 'text-xs px-3 py-1';

  return (
    <span
      className={cn('inline-flex items-center gap-[5px] rounded-full font-semibold whitespace-nowrap border', sizeClass, className)}
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full flex-shrink-0"
        style={{ background: cfg.text }}
      />
      {text}
    </span>
  );
}
