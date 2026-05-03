import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightElement, className, ...props }, ref) => {
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
          {leftIcon && (
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-[8px] text-[14px] transition-all duration-150',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              leftIcon     && 'pl-10',
              rightElement && 'pr-10',
              className
            )}
            style={{
              background: 'var(--bg-page)',
              border: error ? '1px solid var(--danger)' : '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '9px 12px',
              boxShadow: error
                ? '0 0 0 3px var(--danger-subtle)'
                : 'var(--shadow-xs)',
              outline: 'none',
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
            onMouseEnter={(e) => {
              if (document.activeElement !== e.target) {
                (e.target as HTMLInputElement).style.borderColor = error ? 'var(--danger)' : 'var(--border-strong)';
              }
              props.onMouseEnter?.(e);
            }}
            placeholder={props.placeholder}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
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
Input.displayName = 'Input';
