'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users, Search, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  org_admin: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  dispatcher: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lab_manager: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  rider: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function PlatformUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['platform-users', search, roleFilter, statusFilter],
    queryFn: () => get<any>('/super-admin/users', {
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
    }),
  });

  const users = (data as any)?.data ?? [];

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => patch(`/users/${id}/deactivate`),
    onSuccess: () => { toast.success('User deactivated'); qc.invalidateQueries({ queryKey: ['platform-users'] }); },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[--text-1]">Platform Users</h1>
        <p className="text-sm text-[--text-3] mt-1">All users across all organizations</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-3]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[--bg-elevated] border border-[--border] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[--text-1] placeholder:text-[--text-3] focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-[--bg-elevated] border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-1] focus:outline-none focus:border-emerald-500">
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="org_admin">Org Admin</option>
          <option value="dispatcher">Dispatcher</option>
          <option value="lab_manager">Lab Manager</option>
          <option value="rider">Rider</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[--bg-elevated] border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-1] focus:outline-none focus:border-emerald-500">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-[--bg-surface] rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        {isLoading ? <TableSkeleton rows={8} cols={6} /> : !users.length ? (
          <EmptyState icon={Users} title="No users found" description="No users match your filters" />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[--bg-elevated] text-[--text-2] text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left">User</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Organization</th>
                <th className="px-6 py-3 text-left">Last Login</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-t border-[--border] hover:bg-[--bg-hover] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{u.name}</p>
                        <p className="text-xs text-[--text-3]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('text-xs px-2 py-1 rounded-full border', ROLE_COLORS[u.role] ?? 'bg-white/5 text-white/60 border-white/10')}>
                      {u.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.organization ? (
                      <Link href={`/super-admin/organizations?id=${u.organization.id}`} className="text-sm text-blue-400 hover:text-blue-300">
                        {u.organization.name}
                      </Link>
                    ) : <span className="text-sm text-[--text-3]">Platform</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-[--text-3]">{u.last_login_at ? formatDate(u.last_login_at) : 'Never'}</td>
                  <td className="px-6 py-4">
                    <Badge status={u.is_active ? 'active' : 'suspended'} label={u.is_active ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.is_active && u.role !== 'super_admin' && (
                      <Button variant="danger" size="sm" onClick={() => deactivateMutation.mutate(u.id)} loading={deactivateMutation.isPending}>
                        <UserX size={13} /> Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
