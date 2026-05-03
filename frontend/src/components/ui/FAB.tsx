'use client';
import { type ReactNode } from 'react';

interface FABProps {
  onClick: () => void;
  children: ReactNode;
  label?: string;
}

export function FAB({ onClick, children, label }: FABProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-24 right-5 z-30 flex items-center justify-center w-14 h-14 rounded-full shadow-lg md:hidden transition-transform duration-150 active:scale-95"
      style={{
        background: 'var(--brand)',
        boxShadow: 'var(--shadow-brand-glow)',
        color: '#fff',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      } as React.CSSProperties}
    >
      {children}
    </button>
  );
}
