'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { MobileNavProvider } from '@/contexts/MobileNavContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-page)' }}>
        {/* Sidebar skeleton — desktop only */}
        <div
          className="hidden lg:flex w-[240px] flex-shrink-0 h-full flex-col"
          style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}
        >
          <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[8px] skeleton" />
              <div className="skeleton h-4 w-28 rounded-[6px]" />
            </div>
          </div>
          <div className="p-2 space-y-1 flex-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="skeleton h-9 rounded-[8px]" />
            ))}
          </div>
          <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="skeleton h-12 rounded-[8px]" />
          </div>
        </div>

        {/* Main area skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className="hidden lg:block h-14 flex-shrink-0"
            style={{ background: 'var(--rh-header-bg)', borderBottom: '1px solid var(--border-subtle)' }}
          />
          <div className="p-4 lg:p-8 space-y-4 lg:space-y-6" style={{ background: 'var(--bg-page)' }}>
            <div className="skeleton h-8 w-52 rounded-[8px]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-24 lg:h-32 rounded-[14px]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <NotificationProvider>
      <SidebarProvider>
        <MobileNavProvider>
          {/* Desktop sidebar — hidden on mobile */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Content wrapper — margin managed by --sidebar-w CSS variable */}
          <div
            className="main-content flex flex-col min-h-screen"
            style={{ background: 'var(--bg-page)' }}
          >
            <Header />
            <main
              className="flex-1 overflow-y-auto pb-20 lg:pb-0"
              style={{ background: 'var(--bg-page)' }}
            >
              {children}
            </main>
          </div>

          {/* Mobile bottom nav + drawer — hidden on desktop */}
          <div className="lg:hidden">
            <MobileNav />
          </div>
        </MobileNavProvider>
      </SidebarProvider>
    </NotificationProvider>
  );
}
