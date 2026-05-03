'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { useIsMobile } from '@/hooks/useIsMobile';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}

export function Drawer({ open, onClose, title, children, width = 'w-[480px]', footer }: DrawerProps) {
  const isMobile = useIsMobile();

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

  if (isMobile) {
    // Render as bottom sheet on mobile
    return createPortal(
      <>
        <div
          className={cn(
            'fixed inset-0 z-40 transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as React.CSSProperties}
          onClick={onClose}
        />
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col max-h-[92vh]"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '20px 20px 0 0',
            borderTop: '1px solid var(--border-subtle)',
            boxShadow: '0 -20px 60px rgba(0,0,0,0.3)',
            transform: open ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 350ms cubic-bezier(0.32, 0.72, 0, 1)',
            willChange: 'transform',
          }}
        >
          {/* Drag handle */}
          <div className="sheet-handle" />

          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)', marginTop: 8 }}
          >
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scroll-ios">
            {children}
          </div>

          {/* Footer */}
          <div
            className="px-5 py-4 flex gap-3 flex-shrink-0"
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
          >
            {footer ?? <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>}
          </div>
        </div>
      </>,
      document.body
    );
  }

  // Desktop: right-side drawer
  return createPortal(
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as React.CSSProperties}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed right-0 top-0 h-full z-50 flex flex-col',
          'transition-transform duration-300 ease-out',
          width,
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{
          background: 'var(--bg-surface)',
          boxShadow: '0 0 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {footer ?? <Button variant="secondary" onClick={onClose}>Cancel</Button>}
        </div>
      </div>
    </>,
    document.body
  );
}
