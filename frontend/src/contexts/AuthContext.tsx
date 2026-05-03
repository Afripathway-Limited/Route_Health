'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import { applyBrandColor } from '@/lib/utils';
import { AUTH_TOKEN_KEY } from '@/lib/constants';
import type { AuthUser, ApiResponse } from '@/types';

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
    const res = await api.post<ApiResponse<{ token: string; user: AuthUser; redirect: string }>>('/auth/login', { email, password });
    const data = res.data.data;

    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem('rh_user', JSON.stringify(data.user));
    setUser(data.user);
    applyOrgBranding(data.user.organization);

    return { redirect: data.redirect };
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
