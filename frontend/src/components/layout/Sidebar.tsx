'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  LayoutDashboard, Building2, Settings, Users, MapPin, Truck,
  ClipboardList, Route, Activity, BarChart3, History,
  LogOut, Zap, ChevronLeft, ChevronRight,
  Shield, DollarSign, FileText, Package, HeadphonesIcon,
} from 'lucide-react';

interface NavItem    { label: string; href: string; icon: React.ElementType; badge?: number }
interface NavSection { title?: string; items: NavItem[] }

const navConfig: Record<string, NavSection[]> = {
  super_admin: [
    {
      items: [
        { label: 'Platform Overview', href: '/super-admin',              icon: LayoutDashboard },
        { label: 'Organizations',     href: '/super-admin/organizations', icon: Building2 },
      ],
    },
    {
      title: 'Fleet',
      items: [
        { label: 'Rider Fleet', href: '/super-admin/riders', icon: Truck },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Platform Users',      href: '/super-admin/users',    icon: Users },
        { label: 'Roles & Permissions', href: '/super-admin/roles',    icon: Shield },
        { label: 'Subscription Plans',  href: '/super-admin/packages', icon: Package },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Revenue & Billing', href: '/super-admin/revenue', icon: DollarSign },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Support Tickets',   href: '/super-admin/issues',    icon: HeadphonesIcon },
        { label: 'Audit Log',         href: '/super-admin/audit-log', icon: FileText },
        { label: 'Platform Settings', href: '/super-admin/settings',  icon: Settings },
      ],
    },
  ],
  org_admin: [
    {
      items: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Facilities', href: '/admin/facilities', icon: MapPin },
        { label: 'Riders',     href: '/admin/riders',     icon: Truck },
        { label: 'Users',      href: '/admin/users',      icon: Users },
      ],
    },
    {
      title: 'Reports',
      items: [
        { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { label: 'Settings',  href: '/admin/settings',  icon: Settings },
      ],
    },
  ],
  dispatcher: [
    {
      items: [
        { label: 'Dashboard', href: '/dispatcher', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Tasks',          href: '/dispatcher/tasks',          icon: ClipboardList },
        { label: 'Route Planning', href: '/dispatcher/route-planning', icon: Route },
        { label: 'Live Tracking',  href: '/dispatcher/live-tracking',  icon: Activity },
      ],
    },
    {
      title: 'Reports',
      items: [
        { label: 'Analytics', href: '/dispatcher/analytics', icon: BarChart3 },
      ],
    },
  ],
  lab_manager: [
    {
      items: [
        { label: "Today's Pickups", href: '/lab-manager',               icon: LayoutDashboard },
        { label: 'Pickup History',  href: '/lab-manager/pickup-history', icon: History },
      ],
    },
  ],
};

const roleLabel: Record<string, string> = {
  org_admin:   'Org Admin',
  dispatcher:  'Dispatcher',
  lab_manager: 'Lab Manager',
  super_admin: 'Platform Admin',
};

const roleAvatarStyle: Record<string, React.CSSProperties> = {
  org_admin:   { background: 'var(--success-subtle)', color: 'var(--success)' },
  dispatcher:  { background: 'var(--info-subtle)',    color: 'var(--info)' },
  lab_manager: { background: 'var(--purple-subtle)',  color: 'var(--purple)' },
  super_admin: { background: 'var(--warning-subtle)', color: 'var(--warning)' },
};

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-[6px] text-[12px] font-medium whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50"
        style={{ background: 'var(--text-primary)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
      >
        {label}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname  = usePathname();
  const { user, logout } = useAuth();
  const { collapsed, toggle } = useSidebar();

  if (!user) return null;

  const sections = navConfig[user.role] ?? [];

  return (
    <aside
      className="fixed left-0 top-0 h-full z-30"
      style={{
        width: collapsed ? 64 : 240,
        transition: 'width 250ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Inner clip wrapper — clips nav text during animation but not the toggle button */}
      <div className="flex flex-col h-full" style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', width: '100%' }}>
      {/* Logo */}
      <div
        className="flex items-center gap-3 flex-shrink-0"
        style={{
          padding: collapsed ? '20px 0' : '20px 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--border-subtle)',
          transition: 'padding 250ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div
          className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--brand)' }}
        >
          <Zap size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 overflow-hidden">
            <p
              className="text-[14px] font-semibold leading-tight tracking-tight whitespace-nowrap"
              style={{ color: 'var(--text-primary)' }}
            >
              RouteHealth
            </p>
            <p
              className="text-[11px] truncate leading-tight mt-px"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {user.organization?.name ?? 'Platform Admin'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2" style={{ padding: collapsed ? '8px 0' : '8px 8px' }}>
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-3' : ''}>
            {section.title && !collapsed && (
              <p
                className="px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase whitespace-nowrap"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {section.title}
              </p>
            )}
            {section.title && collapsed && (
              <div
                className="mx-auto my-1"
                style={{ width: 24, height: 1, background: 'var(--border-subtle)' }}
              />
            )}
            <ul className="space-y-px">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href + '/'));

                const linkStyle: React.CSSProperties = isActive
                  ? {
                      background: 'var(--brand-subtle)',
                      color: 'var(--brand)',
                      fontWeight: '600',
                      boxShadow: collapsed ? undefined : 'inset 2px 0 0 var(--brand)',
                    }
                  : {
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                    };

                const linkContent = (
                  <Link
                    href={item.href}
                    className="flex items-center rounded-[8px] text-[13px] font-medium transition-all duration-150 relative"
                    style={{
                      ...linkStyle,
                      gap: collapsed ? 0 : 10,
                      padding: collapsed ? '8px 0' : '8px 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = 'var(--bg-hover)';
                        el.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = 'transparent';
                        el.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    <item.icon size={16} className="flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 leading-none whitespace-nowrap">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className="text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center text-white"
                            style={{ background: 'var(--danger)' }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );

                return (
                  <li key={item.href} style={{ padding: collapsed ? '0 8px' : '0' }}>
                    {collapsed ? (
                      <Tooltip label={item.label}>{linkContent}</Tooltip>
                    ) : (
                      linkContent
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: collapsed ? '12px 8px' : '12px' }} className="space-y-1 flex-shrink-0">
        {collapsed ? (
          <Tooltip label={user.name}>
            <Link
              href="/profile"
              className="flex items-center justify-center w-10 h-10 rounded-full mx-auto transition-all duration-150"
              style={roleAvatarStyle[user.role] ?? { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-[13px] font-bold">{user.name.charAt(0).toUpperCase()}</span>
              )}
            </Link>
          </Tooltip>
        ) : (
          <>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-all duration-150"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'var(--bg-hover)';
                el.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'transparent';
                el.style.color = 'var(--text-secondary)';
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold overflow-hidden"
                style={roleAvatarStyle[user.role] ?? { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-semibold truncate leading-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {user.name}
                </p>
                <p className="text-[11px] leading-tight mt-px" style={{ color: 'var(--text-tertiary)' }}>
                  {roleLabel[user.role] ?? user.role}
                </p>
              </div>
            </Link>

            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-150"
              style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'var(--danger-subtle)';
                el.style.color = 'var(--danger)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'transparent';
                el.style.color = 'var(--text-tertiary)';
              }}
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </>
        )}
      </div>

      </div>

      {/* Collapse toggle — lives on the aside (not inside the clipped div) so it renders above page content */}
      <button
        onClick={toggle}
        className="absolute flex items-center justify-center rounded-full transition-all duration-150"
        style={{
          top: 72,
          right: -12,
          width: 24,
          height: 24,
          zIndex: 50,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--bg-hover)';
          el.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--bg-surface)';
          el.style.color = 'var(--text-tertiary)';
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </aside>
  );
}
