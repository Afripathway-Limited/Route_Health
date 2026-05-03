import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-[--border] flex items-center justify-center mb-5">
        <Icon size={28} className="text-[--text-3]" />
      </div>
      <h3 className="text-base font-semibold text-[--text-1] mb-2">{title}</h3>
      <p className="text-sm text-[--text-3] max-w-xs leading-relaxed mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
