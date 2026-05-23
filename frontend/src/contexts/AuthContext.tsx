'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import { applyBrandColor } from '@/lib/utils';
import { AUTH_TOKEN_KEY } from '@/lib/constants';
import type { AuthUser, ApiResponse } from '@/types';

// ─── Mock auth — used when backend is not running (Phase 1 demo) ─────────────
const PATHCARE_ORG = {
  id: 1, name: 'PathCare Diagnostics Kenya', country: 'Kenya',
  logo_url: null, primary_color: '#4F6EF7', subdomain: 'pathcare',
  status: 'active' as const, subscription_plan: 'professional' as const,
};
const NAIROBI_ORG = {
  id: 2, name: 'Nairobi General Labs', country: 'Kenya',
  logo_url: null, primary_color: '#059669', subdomain: 'nairobi-general',
  status: 'active' as const, subscription_plan: 'starter' as const,
};
const MOCK_USERS: Record<string, { user: AuthUser; redirect: string }> = {
  'super@routehealth.com': {
    redirect: '/super-admin',
    user: { id: 0, name: 'Platform Admin', email: 'super@routehealth.com', phone: null, avatar_url: null, role: 'super_admin', roles: ['super_admin'], permissions: ['*'], is_active: true, last_login_at: null, requires_password_change: false, organization: null },
  },
  'admin@pathcare.ke': {
    redirect: '/admin',
    user: { id: 1, name: 'Maxwell Kariuki', email: 'admin@pathcare.ke', phone: '+254 722 100 001', avatar_url: null, role: 'org_admin', roles: ['org_admin'], permissions: [], is_active: true, last_login_at: null, requires_password_change: false, organization: PATHCARE_ORG },
  },
  'dispatcher@pathcare.ke': {
    redirect: '/dispatcher',
    user: { id: 2, name: 'Jane Mwangi', email: 'dispatcher@pathcare.ke', phone: '+254 722 100 002', avatar_url: null, role: 'dispatcher', roles: ['dispatcher'], permissions: [], is_active: true, last_login_at: null, requires_password_change: false, organization: PATHCARE_ORG },
  },
  'lab@nairobi-general.ke': {
    redirect: '/lab-manager',
    user: { id: 3, name: 'Dr. Amina Osman', email: 'lab@nairobi-general.ke', phone: '+254 722 100 003', avatar_url: null, role: 'lab_manager', roles: ['lab_manager'], permissions: [], is_active: true, last_login_at: null, requires_password_change: false, organization: NAIROBI_ORG },
  },
};

function isMockCredential(email: string, password: string) {
  const entry = MOCK_USERS[email.toLowerCase()];
  if (!entry) return false;
  const validPasswords = ['RouteHealth@2024!', 'Demo@2024!', 'demo', 'password'];
  return validPasswords.includes(password);
}

function mockLogin(email: string): { token: string; user: AuthUser; redirect: string } | null {
  const entry = MOCK_USERS[email.toLowerCase()];
  if (!entry) return null;
  return { token: 'mock-token-phase1', user: entry.user, redirect: entry.redirect };
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ redirect: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  applyBranding: (color: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyBranding = useCallback((color: string) => {
    applyBrandColor(color);
  }, []);

  const applyOrgBranding = useCallback((org: AuthUser['organization']) => {
    if (!org?.primary_color) return;
    applyBrandColor(org.primary_color);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Phase 1 mock token — restore user from cache without hitting API
    if (token === 'mock-token-phase1') {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get<ApiResponse<AuthUser>>('/auth/me');
      const u = res.data.data;
      setUser(u);
      localStorage.setItem('rh_user', JSON.stringify(u));
      applyOrgBranding(u.organization);
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('rh_user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [applyOrgBranding]);

  useEffect(() => {
    const cached = localStorage.getItem('rh_user');
    if (cached) {
      try {
        const u = JSON.parse(cached) as AuthUser;
        setUser(u);
        applyOrgBranding(u.organization);
      } catch {}
    }
    refreshUser();
  }, [refreshUser, applyOrgBranding]);

  const login = useCallback(async (email: string, password: string): Promise<{ redirect: string }> => {
    try {
      const res = await api.post<ApiResponse<{ token: string; user: AuthUser; redirect: string }>>('/auth/login', { email, password });
      const data = res.data.data;
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem('rh_user', JSON.stringify(data.user));
      setUser(data.user);
      applyOrgBranding(data.user.organization);
      return { redirect: data.redirect };
    } catch (err: any) {
      // Fall back to mock auth when backend is unreachable or auth route not set up (Phase 1 demo mode)
      const isNetworkError = !err?.response;
      const isRouteNotFound = err?.response?.status === 404;
      if ((isNetworkError || isRouteNotFound) && isMockCredential(email, password)) {
        const data = mockLogin(email)!;
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem('rh_user', JSON.stringify(data.user));
        setUser(data.user);
        applyOrgBranding(data.user.organization);
        return { redirect: data.redirect };
      }
      throw err;
    }
  }, [applyOrgBranding]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('rh_user');
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
      applyBranding,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
