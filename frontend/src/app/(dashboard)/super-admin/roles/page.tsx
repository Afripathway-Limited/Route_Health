'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { get, put } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface PermGroup { [perm: string]: any[] }
interface RoleData { name: string; permissions: string[] }

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Org Admin',
  dispatcher: 'Dispatcher',
  lab_manager: 'Lab Manager',
};

export default function RolesPage() {
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const { data: rolesData, isLoading: rolesLoading } = useQuery<RoleData[]>({
    queryKey: ['platform-roles'],
    queryFn: () => get('/super-admin/platform/roles').then((r: any) => r?.data ?? r),
  });

  const { data: permsData, isLoading: permsLoading } = useQuery<PermGroup>({
    queryKey: ['platform-permissions'],
    queryFn: () => get('/super-admin/platform/permissions').then((r: any) => r?.data ?? r),
  });

  const [rolePerms, setRolePerms] = useState<Record<string, Set<string>>>({});

  // Initialise local state from server once loaded
  if (rolesData && Object.keys(rolePerms).length === 0) {
    const init: Record<string, Set<string>> = {};
    rolesData.forEach((r) => { init[r.name] = new Set(r.permissions); });
    setRolePerms(init);
  }

  const saveMutation = useMutation({
    mutationFn: ({ role, permissions }: { role: string; permissions: string[] }) =>
      put(`/super-admin/platform/roles/${role}/permissions`, { permissions }),
    onSuccess: (_d, { role }) => {
      toast.success(`${ROLE_LABELS[role] ?? role} permissions saved`);
      setSaving((s) => ({ ...s, [role]: false }));
    },
    onError: (_e, { role }) => {
      toast.error('Failed to save');
      setSaving((s) => ({ ...s, [role]: false }));
    },
  });

  const toggle = useCallback((role: string, perm: string) => {
    setRolePerms((prev) => {
      const next = { ...prev, [role]: new Set(prev[role]) };
      if (next[role].has(perm)) next[role].delete(perm);
      else next[role].add(perm);

      // debounce save
      setTimeout(() => {
        setSaving((s) => ({ ...s, [role]: true }));
        saveMutation.mutate({ role, permissions: Array.from(next[role]) });
      }, 600);

      return next;
    });
  }, [saveMutation]);

  const roles = Object.keys(ROLE_LABELS);
  const allPerms = permsData ?? {};
  const isLoading = rolesLoading || permsLoading;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[--text-1]">Role Permissions</h1>
        <p className="text-sm text-[--text-3] mt-1">Control what each role can access across the platform</p>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
        <Info size={15} className="flex-shrink-0 mt-0.5" />
        <span>Super Admin always has all permissions and cannot be modified here. Changes save automatically.</span>
      </div>

      {isLoading ? <TableSkeleton rows={8} cols={4} /> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[--bg-elevated]">
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[--text-2] w-1/2">Permission</th>
                {roles.map((r) => (
                  <th key={r} className="px-4 py-3 text-center text-xs uppercase tracking-wider text-[--text-2]">
                    {ROLE_LABELS[r]}
                    {saving[r] && <span className="ml-1 text-emerald-400 normal-case font-normal">saving…</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(allPerms).map(([group, perms]: [string, any[]]) => (
                <>
                  <tr key={`group-${group}`} className="border-t border-[--border]">
                    <td colSpan={roles.length + 1} className="px-6 py-2 text-xs font-semibold uppercase tracking-widest text-[--text-3] bg-[--bg-elevated]/50">
                      {group}
                    </td>
                  </tr>
                  {perms.map((p: any) => (
                    <tr key={p.name} className="border-t border-[--border] hover:bg-[--bg-hover] transition-colors">
                      <td className="px-6 py-3 text-sm text-[--text-2]">{p.name}</td>
                      {roles.map((r) => (
                        <td key={r} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={rolePerms[r]?.has(p.name) ?? false}
                            onChange={() => toggle(r, p.name)}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
