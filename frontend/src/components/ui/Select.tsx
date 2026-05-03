import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            className="text-[13px] font-medium block"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
            {props.required && (
              <span className="ml-0.5" style={{ color: 'var(--danger)' }}>*</span>
            )}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full rounded-[8px] text-[14px] transition-all duration-150',
              'appearance-none disabled:opacity-40 disabled:cursor-not-allowed',
              className
            )}
            style={{
              background: 'var(--bg-page)',
              border: error ? '1px solid var(--danger)' : '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '9px 36px 9px 12px',
              height: 38,
              boxShadow: error ? '0 0 0 3px var(--danger-subtle)' : 'var(--shadow-xs)',
              outline: 'none',
              cursor: 'pointer',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border-focus)';
              e.target.style.boxShadow = error
                ? '0 0 0 3px var(--danger-subtle)'
                : '0 0 0 3px rgba(99,102,241,0.12)';
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border-strong)';
              e.target.style.boxShadow = error ? '0 0 0 3px var(--danger-subtle)' : 'var(--shadow-xs)';
              props.onBlur?.(e);
            }}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
        </div>
        {error && (
          <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p>
        )}
        {hint && !error && (
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
