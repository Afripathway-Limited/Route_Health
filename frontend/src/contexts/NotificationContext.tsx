'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { get, patch } from '@/lib/api';
import { AUTH_TOKEN_KEY } from '@/lib/constants';

export interface AppNotification {
  id: string;
  type: 'anomaly' | 'dispute' | 'route_completed' | 'info';
  title: string;
  description: string;
  linkUrl?: string;
  linkLabel?: string;
  timestamp: Date;
  read: boolean;
}

interface ApiNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const MAX_SHOWN = 50;

function apiToApp(n: ApiNotification): AppNotification {
  const data = n.data ?? {};
  return {
    id: String(n.id),
    type: (n.type as AppNotification['type']) ?? 'info',
    title: n.title,
    description: n.message,
    linkUrl: typeof data.link_url === 'string' ? data.link_url : undefined,
    linkLabel: typeof data.link_label === 'string' ? data.link_label : undefined,
    timestamp: new Date(n.created_at),
    read: !!n.read_at,
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const check = () => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
      setIsAuthenticated(!!token);
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || fetchedRef.current) return;
    fetchedRef.current = true;

    get<{ data: ApiNotification[]; unread_count: number }>('/notifications')
      .then((res) => {
        setNotifications((res.data ?? []).map(apiToApp));
      })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      get<{ data: ApiNotification[] }>('/notifications')
        .then((res) => setNotifications((res.data ?? []).map(apiToApp)))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const notif: AppNotification = {
      ...n,
      id: `local-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev].slice(0, MAX_SHOWN));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (!id.startsWith('local-')) {
      patch(`/notifications/${id}/read`).catch(() => {});
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    patch('/notifications/read-all').catch(() => {});
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, markRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
