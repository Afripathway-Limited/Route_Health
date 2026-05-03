'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
}

const Ctx = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} });

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('rh_sidebar');
    const initial = stored === 'collapsed';
    setCollapsed(initial);
    document.documentElement.style.setProperty('--sidebar-w', initial ? '64px' : '240px');
  }, []);

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('rh_sidebar', next ? 'collapsed' : 'expanded');
      document.documentElement.style.setProperty('--sidebar-w', next ? '64px' : '240px');
      return next;
    });
  };

  return <Ctx.Provider value={{ collapsed, toggle }}>{children}</Ctx.Provider>;
}

export function useSidebar() {
  return useContext(Ctx);
}
