'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_REDIRECT: Record<string, string> = {
  super_admin: '/super-admin',
  org_admin: '/admin',
  dispatcher: '/dispatcher',
  lab_manager: '/lab-manager',
};

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    router.replace(ROLE_REDIRECT[user.role] ?? '/login');
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#0D1520] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}
