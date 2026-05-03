'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, LogOut, User, Menu, Zap, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { useNotifications } from '@/contexts/NotificationContext';
import type { AppNotification } from '@/contexts/NotificationContext';

const roleAvatarStyle: Record<string, React.CSSProperties> = {
  org_admin:   { background: 'var(--success-subtle)', color: 'var(--success)' },
  dispatcher:  { background: 'var(--info-subtle)',    color: 'var(--info)' },
  lab_manager: { background: 'var(--purple-subtle)',  color: 'var(--purple)' },
  super_admin: { background: 'var(--warning-subtle)', color: 'var(--warning)' },
};

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const labelMap: Record<string, string> = {
    'admin': 'Admin',
    'super-admin': 'Super Admin',
    'dispatcher': 'Dispatcher',
    'lab-manager': 'Lab Manager',
    'facilities': 'Facilities',
    'riders': 'Riders',
    'users': 'Users',
    'analytics': 'Analytics',
    'settings': 'Settings',
    'organizations': 'Organizations',
    'tasks': 'Tasks',
    'route-planning': 'Route Planning',
    'live-tracking': 'Live Tracking',
    'routes': 'Routes',
    'pickup-history': 'Pickup History',
    'profile': 'Profile',
  };

  if (segments.length <= 1) {
    return (
      <h1 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        {labelMap[segments[0]] ?? segments[0]}
      </h1>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const href = '/' + segments.slice(0, i + 1).join('/');
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-[14px]" style={{ color: 'var(--border-strong)' }}>/</span>
            )}
            {isLast ? (
              <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {labelMap[seg] ?? seg}
              </span>
            ) : (
              <Link
                href={href}
                className="text-[14px] font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {labelMap[seg] ?? seg}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}

function notifIcon(type: AppNotification['type']) {
  switch (type) {
    case 'anomaly': return <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />;
    case 'dispute': return <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />;
    case 'route_completed': return <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />;
    default: return <Info size={14} style={{ color: 'var(--info)' }} />;
  }
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();

  return (
    <div
      className="absolute right-0 top-full mt-2 z-30 overflow-hidden rounded-[14px] flex flex-col"
      style={{
        width: 360,
        maxHeight: 480,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-dropdown)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</span>
          {unreadCount > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--danger)', color: '#fff' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] font-medium transition-colors"
              style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-[11px] font-medium transition-colors"
              style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell size={28} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 20).map((n) => (
            <div
              key={n.id}
              className="flex gap-3 px-4 py-3 transition-colors cursor-pointer"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: n.read ? 'transparent' : 'var(--bg-subtle)',
              }}
              onClick={() => markRead(n.id)}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = n.read ? 'transparent' : 'var(--bg-subtle)')}
            >
              {!n.read && (
                <div
                  className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                  style={{ background: 'var(--brand)' }}
                />
              )}
              {n.read && <div className="w-2 flex-shrink-0" />}
              <div className="flex-shrink-0 mt-0.5">{notifIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{n.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{relativeTime(n.timestamp)}</span>
                  {n.linkUrl && (
                    <Link
                      href={n.linkUrl}
                      onClick={(e) => { e.stopPropagation(); markRead(n.id); onClose(); }}
                      className="text-[10px] font-semibold"
                      style={{ color: 'var(--brand)' }}
                    >
                      {n.linkLabel ?? 'View →'}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { toggle: toggleMobileNav } = useMobileNav();
  const { unreadCount } = useNotifications();

  // Close both dropdowns when clicking outside
  const notifRef = useRef<HTMLDivElement>(null);

  return (
    <header
      className="sticky top-0 h-14 flex items-center justify-between px-6 z-20 flex-shrink-0"
      style={{
        background: 'var(--rh-header-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobileNav}
        className="flex lg:hidden items-center justify-center w-10 h-10 rounded-[8px] transition-all duration-150 flex-shrink-0"
        style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Mobile brand */}
      <div className="flex lg:hidden items-center gap-2 flex-1 justify-center">
        <div
          className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--brand)' }}
        >
          <Zap size={12} className="text-white" />
        </div>
        <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>RouteHealth</span>
      </div>

      {/* Left — breadcrumb (desktop only) */}
      <div className="hidden lg:block">
        <Breadcrumb />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
            className="relative flex items-center justify-center w-8 h-8 rounded-[8px] transition-all duration-150"
            style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                className="absolute top-0.5 right-0.5 flex items-center justify-center text-[9px] font-bold text-white rounded-full leading-none"
                style={{ width: 16, height: 16, background: 'var(--danger)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setNotifOpen(false)} />
              <div className="relative z-30">
                <NotificationPanel onClose={() => setNotifOpen(false)} />
              </div>
            </>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative ml-1">
          <button
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 px-2 py-1 rounded-[8px] transition-all duration-150"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden"
              style={roleAvatarStyle[user?.role ?? ''] ?? { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            >
              {user?.avatar_url
                ? <img src={user.avatar_url} alt={user?.name} className="w-7 h-7 rounded-full object-cover" />
                : user?.name?.charAt(0).toUpperCase()
              }
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {user?.name}
              </p>
              <p className="text-[11px] capitalize leading-tight mt-px" style={{ color: 'var(--text-tertiary)' }}>
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
            <ChevronDown size={13} style={{ color: 'var(--text-tertiary)' }} />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div
                className="absolute right-0 top-full mt-2 w-56 z-20 overflow-hidden rounded-[12px]"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-dropdown)',
                }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {user?.name}
                  </p>
                  <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {user?.email}
                  </p>
                </div>
                <div className="p-1.5 space-y-px">
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-[8px] font-medium transition-all"
                    style={{ color: 'var(--text-secondary)', display: 'flex' }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--bg-hover)'; el.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--text-secondary)'; }}
                  >
                    <User size={14} style={{ color: 'var(--text-tertiary)' }} />
                    Profile Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-[8px] transition-all text-left"
                    style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-subtle)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
