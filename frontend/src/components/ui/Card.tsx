import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: boolean;
}

export function Card({ children, className, hover = false, onClick, padding = true }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[14px] overflow-hidden transition-all duration-200',
        padding && 'p-6',
        (hover || onClick) && 'cursor-pointer',
        className
      )}
      style={{
        background: 'var(--bg-surface)',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => {
        if (hover || onClick) {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = 'var(--shadow-md)';
          el.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (hover || onClick) {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = 'var(--shadow-card)';
          el.style.transform = '';
        }
      }}
    >
      {children}
    </div>
  );
}
