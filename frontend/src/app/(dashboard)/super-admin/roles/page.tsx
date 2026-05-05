'use client';

import { useState } from 'react';
import { Shield, Users, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MOCK_ROLES, MOCK_PERMISSIONS } from '@/lib/mock-data';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'purple', org_admin: 'brand', dispatcher: 'info', lab_manager: 'success', rider: 'gray',
};

const CATEGORIES = ['Platform', 'Operations', 'Dispatch', 'Reports', 'Settings', 'Lab'];

export default function RolesPermissionsPage() {
  const [permissions, setPermissions] = useState(MOCK_PERMISSIONS.map(p => ({ ...p, roles: [...p.roles] })));
  const [selectedRole, setSelectedRole] = useState(MOCK_ROLES[1]);

  const rolePerms = permissions.filter(p => p.roles.includes(selectedRole.key));
  const byCategory = CATEGORIES.reduce<Record<string, typeof permissions>>((acc, cat) => {
    acc[cat] = permissions.filter(p => p.category === cat);
    return acc;
  }, {});

  const hasPermission = (permKey: string) => permissions.find(p => p.key === permKey)?.roles.includes(selectedRole.key) ?? false;

  const toggle = (permKey: string) => {
    if (selectedRole.key === 'super_admin') return;
    setPermissions(prev => prev.map(p => {
      if (p.key !== permKey) return p;
      const has = p.roles.includes(selectedRole.key);
      return { ...p, roles: has ? p.roles.filter(r => r !== selectedRole.key) : [...p.roles, selectedRole.key] };
    }));
  };

  const handleSave = () => toast.success(`Permissions saved for ${selectedRole.label}`);

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Roles & Permissions</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Configure what each role can access and do on the platform</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role list */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Select Role</p>
          {MOCK_ROLES.map(role => {
            const isSelected = selectedRole.key === role.key;
            const permCount = permissions.filter(p => p.roles.includes(role.key)).length;
            return (
              <button key={role.key} onClick={() => setSelectedRole(role)}
                className="w-full text-left p-4 rounded-[14px] transition-all"
                style={{
                  background: isSelected ? 'var(--brand-subtle)' : 'var(--bg-surface)',
                  border: `1.5px solid ${isSelected ? 'var(--brand-border)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Shield size={14} style={{ color: isSelected ? 'var(--brand)' : 'var(--text-muted)' }} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{role.label}</span>
                  </div>
                  <Badge color={ROLE_COLORS[role.key] as any}>{permCount}</Badge>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{role.description}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Users size={11} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{role.user_count} users</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Permission matrix */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge color={ROLE_COLORS[selectedRole.key] as any}>{selectedRole.label}</Badge>
              <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{rolePerms.length} permissions granted</span>
            </div>
            {selectedRole.key !== 'super_admin' && (
              <button onClick={handleSave}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all active:scale-[0.98]"
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Save Changes
              </button>
            )}
          </div>

          {selectedRole.key === 'super_admin' && (
            <div className="rounded-[12px] px-4 py-3 flex items-center gap-2"
              style={{ background: 'var(--warning-subtle)', border: '1px solid var(--warning-border)' }}>
              <Shield size={13} style={{ color: 'var(--warning)' }} />
              <span className="text-[12px]" style={{ color: 'var(--warning)' }}>
                Super Admin has all permissions by default and cannot be modified.
              </span>
            </div>
          )}

          {CATEGORIES.map(cat => {
            const catPerms = byCategory[cat];
            if (!catPerms?.length) return null;
            return (
              <div key={cat} className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{cat}</span>
                </div>
                {catPerms.map((perm, i) => {
                  const granted = hasPermission(perm.key);
                  const isSuperAdmin = selectedRole.key === 'super_admin';
                  return (
                    <div key={perm.key}
                      className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[var(--bg-subtle)]"
                      style={{ borderBottom: i < catPerms.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{perm.label}</p>
                        <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{perm.key}</p>
                      </div>
                      <button
                        onClick={() => toggle(perm.key)}
                        disabled={isSuperAdmin}
                        className="w-10 h-6 rounded-full transition-all flex-shrink-0 relative"
                        style={{
                          background: granted ? 'var(--brand)' : 'var(--bg-elevated)',
                          border: `1.5px solid ${granted ? 'var(--brand)' : 'var(--border-subtle)'}`,
                          cursor: isSuperAdmin ? 'not-allowed' : 'pointer',
                          opacity: isSuperAdmin ? 0.7 : 1,
                        }}>
                        <span className="absolute top-0.5 transition-all"
                          style={{ left: granted ? 'calc(100% - 18px)' : '2px', width: 16, height: 16, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {granted ? <Check size={9} style={{ color: 'var(--brand)' }} /> : <X size={9} style={{ color: 'var(--text-muted)' }} />}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
