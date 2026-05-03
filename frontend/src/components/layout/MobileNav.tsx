'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, MapPin, Truck, BarChart3, MoreHorizontal,
  ClipboardList, Route, Activity, History, User, Building2,
  Settings, Users, X, LogOut, Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileNav } from '@/contexts/MobileNavContext';

interface BottomTab {
  label: string;
  href: string;
  icon: React.ElementType;
  isMore?: boolean;
}

const bottomTabs: Record<string, BottomTab[]> = {
  org_admin: [
    { label: 'Dashboard',  href: '/admin',             icon: LayoutDashboard },
    { label: 'Facilities', href: '/admin/facilities',  icon: MapPin },
    { label: 'Riders',     href: '/admin/riders',      icon: Truck },
    { label: 'Analytics',  href: '/admin/analytics',   icon: BarChart3 },
    { label: 'More',       href: '#',                  icon: MoreHorizontal, isMore: true },
  ],
  dispatcher: [
    { label: 'Dashboard', href: '/dispatcher',                  icon: LayoutDashboard },
    { label: 'Tasks',     href: '/dispatcher/tasks',            icon: ClipboardList },
    { label: 'Planning',  href: '/dispatcher/route-planning',   icon: Route },
    { label: 'Tracking',  href: '/dispatcher/live-tracking',    icon: Activity },
    { label: 'More',      href: '#',                            icon: MoreHorizontal, isMore: true },
  ],
  lab_manager: [
    { label: 'Today',   href: '/lab-manager',                 icon: LayoutDashboard },
    { label: 'History', href: '/lab-manager/pickup-history',  icon: History },
    { label: 'Profile', href: '/profile',                     icon: User },
  ],
  super_admin: [
    { label: 'Overview', href: '/super-admin',               icon: LayoutDashboard },
    { label: 'Orgs',     href: '/super-admin/organizations', icon: Building2 },
    { label: 'Settings', href: '/super-admin/settings',      icon: Settings },
    { label: 'More',     href: '#',                          icon: MoreHorizontal, isMore: true },
  ],
};

interface DrawerNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  section?: string;
}

const drawerNav: Record<string, DrawerNavItem[]> = {
  org_admin: [
    { label: 'Dashboard',  href: '/admin',            icon: LayoutDashboard },
    { label: 'Facilities', href: '/admin/facilities', icon: MapPin,     section: 'Operations' },
    { label: 'Riders',     href: '/admin/riders',     icon: Truck,      section: 'Operations' },
    { label: 'Users',      href: '/admin/users',      icon: Users,      section: 'Operations' },
    { label: 'Analytics',  href: '/admin/analytics',  icon: BarChart3,  section: 'Reports' },
    { label: 'Settings',   href: '/admin/settings',   icon: Settings,   section: 'Reports' },
    { label: 'Profile',    href: '/profile',          icon: User,       section: 'Account' },
  ],
  dispatcher: [
    { label: 'Dashboard',     href: '/dispatcher',                  icon: LayoutDashboard },
    { label: 'Tasks',         href: '/dispatcher/tasks',            icon: ClipboardList, section: 'Operations' },
    { label: 'Route Planning',href: '/dispatcher/route-planning',   icon: Route,         section: 'Operations' },
    { label: 'Live Tracking', href: '/dispatcher/live-tracking',    icon: Activity,      section: 'Operations' },
    { label: 'Analytics',     href: '/dispatcher/analytics',        icon: BarChart3,     section: 'Reports' },
    { label: 'Profile',       href: '/profile',                     icon: User,          section: 'Account' },
  ],
  lab_manager: [
    { label: "Today's Pickups", href: '/lab-manager',                icon: LayoutDashboard },
    { label: 'Pickup History',  href: '/lab-manager/pickup-history', icon: History },
    { label: 'Profile',         href: '/profile',                    icon: User,          section: 'Account' },
  ],
  super_admin: [
    { label: 'Platform Overview',  href: '/super-admin',               icon: LayoutDashboard },
    { label: 'Organizations',      href: '/super-admin/organizations',  icon: Building2 },
    { label: 'Platform Settings',  href: '/super-admin/settings',       icon: Settings },
    { label: 'Profile',            href: '/profile',                    icon: User, section: 'Account' },
  ],
};

export function MobileNav() {
  const { user, logout } = useAuth();
  const { isOpen, close, toggle } = useMobileNav();
  const pathname = usePathname();
  const touchStartX = useRef<number>(0);

  if (!user) return null;

  const tabs = bottomTabs[user.role] ?? [];
  const navItems = drawerNav[user.role] ?? [];

  const isActive = (href: string) =>
    href !== '#' && (pathname === href || (href !== '/' && pathname.startsWith(href + '/')));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    if (touchStartX.current - endX > 60) close();
  };

  // Group items by section for drawer display
  const sections: { title: string | undefined; items: DrawerNavItem[] }[] = [];
  let currentSection: string | undefined = undefined;
  let currentItems: DrawerNavItem[] = [];

  navItems.forEach((item) => {
    if (item.section !== currentSection) {
      if (currentItems.length) sections.push({ title: currentSection, items: currentItems });
      currentSection = item.section;
      currentItems = [item];
    } else {
      currentItems.push(item);
    }
  });
  if (currentItems.length) sections.push({ title: currentSection, items: currentItems });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Left slide-out drawer */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xl)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px 16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>RouteHealth</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.2, marginTop: 2 }}>
                {user.organization?.name ?? 'Platform Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={close}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {sections.map((section, si) => (
            <div key={si} style={{ marginTop: si > 0 ? 12 : 0 }}>
              {section.title && (
                <p style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                }}>
                  {section.title}
                </p>
              )}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '11px 12px',
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: active ? 600 : 500,
                          color: active ? 'var(--brand)' : 'var(--text-secondary)',
                          background: active ? 'var(--brand-subtle)' : 'transparent',
                          textDecoration: 'none',
                          minHeight: 48,
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                          transition: 'background 150ms ease, color 150ms ease',
                        } as React.CSSProperties}
                      >
                        <item.icon size={20} style={{ flexShrink: 0 }} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 4 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--brand-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--brand)',
            }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt={user.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                : user.name.charAt(0).toUpperCase()
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1, textTransform: 'capitalize' }}>
                {user.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => { close(); logout(); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--danger)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              minHeight: 44,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </div>

      {/* Bottom navigation bar */}
      <nav
        className="bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 35,
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-around',
          paddingTop: 8,
        }}
      >
        {tabs.map((tab) => {
          const active = tab.isMore ? isOpen : isActive(tab.href);
          return (
            <button
              key={tab.href}
              onClick={tab.isMore ? toggle : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                flex: 1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 4px',
                minHeight: 44,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {tab.isMore ? (
                <>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: active ? 'var(--brand-subtle)' : 'transparent',
                  }}>
                    <tab.icon size={22} style={{ color: active ? 'var(--brand)' : 'var(--text-tertiary)' }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 500, color: active ? 'var(--brand)' : 'var(--text-tertiary)', lineHeight: 1 }}>
                    {tab.label}
                  </span>
                </>
              ) : (
                <Link
                  href={tab.href}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    textDecoration: 'none',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  } as React.CSSProperties}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: active ? 'var(--brand-subtle)' : 'transparent',
                  }}>
                    <tab.icon size={22} style={{ color: active ? 'var(--brand)' : 'var(--text-tertiary)' }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 500, color: active ? 'var(--brand)' : 'var(--text-tertiary)', lineHeight: 1 }}>
                    {tab.label}
                  </span>
                </Link>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
