'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className={cn('fixed inset-0 flex items-center justify-center z-50 p-4', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as React.CSSProperties}
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full rounded-2xl',
          'transition-all duration-200',
          sizeMap[size],
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
        style={{
          background: 'var(--bg-surface)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-base font-semibold text-[--text-1]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[--text-3] hover:text-[--text-1] hover:bg-white/[0.06] transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
