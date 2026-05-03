import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, style, ...props }, ref) => {
    const base = [
      'inline-flex items-center justify-center gap-2 font-semibold rounded-[8px]',
      'transition-all duration-150 cursor-pointer select-none',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      'active:scale-[0.99]',
    ].join(' ');

    const sizes = {
      sm:  'text-[12px] px-3 py-1.5 h-8',
      md:  'text-[13px] px-4 py-2 h-9',
      lg:  'text-[13px] px-5 py-2.5 h-11',
    };

    const getVariantStyle = (): React.CSSProperties => {
      switch (variant) {
        case 'primary':
          return {
            background: 'var(--brand)',
            color: 'var(--text-on-brand)',
            boxShadow: 'var(--shadow-brand-glow)',
            border: 'none',
          };
        case 'accent':
          return {
            background: 'var(--accent)',
            color: '#ffffff',
            boxShadow: 'var(--shadow-accent-glow)',
            border: 'none',
          };
        case 'secondary':
          return {
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
            boxShadow: 'var(--shadow-xs)',
          };
        case 'danger':
          return {
            background: 'var(--danger-subtle)',
            color: 'var(--danger)',
            border: '1px solid var(--danger-border)',
          };
        case 'ghost':
          return {
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: 'none',
            boxShadow: 'none',
          };
        default:
          return {};
      }
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, sizes[size], className)}
        style={{ ...getVariantStyle(), ...style }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          if (variant === 'primary') {
            el.style.background = 'var(--brand-hover)';
            el.style.transform = 'translateY(-1px)';
            // Use the CSS var so glow tracks the org brand color
            el.style.boxShadow = 'var(--shadow-brand-glow)';
          } else if (variant === 'accent') {
            el.style.background = 'var(--accent-hover)';
            el.style.transform = 'translateY(-1px)';
          } else if (variant === 'secondary') {
            el.style.background = 'var(--bg-hover)';
            el.style.borderColor = 'var(--brand)';
          } else if (variant === 'danger') {
            el.style.background = 'var(--danger)';
            el.style.color = '#ffffff';
          } else if (variant === 'ghost') {
            el.style.background = 'var(--bg-hover)';
            el.style.color = 'var(--text-primary)';
          }
          props.onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          const base = getVariantStyle();
          el.style.background = (base.background as string) ?? '';
          el.style.color = (base.color as string) ?? '';
          el.style.borderColor = '';
          el.style.transform = '';
          el.style.boxShadow = (base.boxShadow as string) ?? '';
          props.onMouseLeave?.(e);
        }}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
