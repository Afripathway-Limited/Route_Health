'use client';

import { useState } from 'react';
import { Search, UserPlus, CheckCircle2, XCircle, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MOCK_PLATFORM_USERS, MOCK_ORGANIZATIONS } from '@/lib/mock-data';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'purple', org_admin: 'brand', dispatcher: 'info', lab_manager: 'success', rider: 'gray',
};
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', org_admin: 'Org Admin', dispatcher: 'Dispatcher', lab_manager: 'Lab Manager', rider: 'Rider',
};

export default function PlatformUsersPage() {
  const [users, setUsers] = useState(MOCK_PLATFORM_USERS.map(u => ({ ...u })));
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [invite, setInvite] = useState({ name: '', email: '', role: 'org_admin', org_id: '1' });

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchOrg = orgFilter === 'all' || String(u.org_id) === orgFilter;
    return matchSearch && matchRole && matchOrg;
  });

  const toggleActive = (id: number) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
    const user = users.find(u => u.id === id);
    toast.success(user?.is_active ? 'User deactivated' : 'User activated');
    setOpenMenu(null);
  };

  const handleInvite = () => {
    const org = MOCK_ORGANIZATIONS.find(o => o.id === Number(invite.org_id));
    setUsers(prev => [...prev, {
      id: Date.now(), name: invite.name, email: invite.email,
      role: invite.role, org_id: Number(invite.org_id),
      org_name: org?.name ?? '—', is_active: true, last_login: '—',
    }]);
    toast.success(`Invitation sent to ${invite.email}`);
    setShowInvite(false);
    setInvite({ name: '', email: '', role: 'org_admin', org_id: '1' });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)', outline: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13,
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Platform Users</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>All users across every organisation on the platform</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all active:scale-[0.98]"
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <UserPlus size={15} /> Invite User
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-[10px] text-[13px]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none', minWidth: 150 }}>
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="org_admin">Org Admin</option>
          <option value="dispatcher">Dispatcher</option>
          <option value="lab_manager">Lab Manager</option>
        </select>
        <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)}
          className="px-3 py-2.5 rounded-[10px] text-[13px]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none', minWidth: 180 }}>
          <option value="all">All Organisations</option>
          {MOCK_ORGANIZATIONS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['User', 'Role', 'Organisation', 'Status', 'Last Login', ''].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  className="transition-colors hover:bg-[var(--bg-subtle)]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                        style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><Badge color={ROLE_COLORS[u.role] as any}>{ROLE_LABELS[u.role]}</Badge></td>
                  <td className="px-5 py-3.5"><span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{u.org_name}</span></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {u.is_active
                        ? <><CheckCircle2 size={13} style={{ color: 'var(--success)' }} /><span className="text-[12px]" style={{ color: 'var(--success)' }}>Active</span></>
                        : <><XCircle size={13} style={{ color: 'var(--danger)' }} /><span className="text-[12px]" style={{ color: 'var(--danger)' }}>Inactive</span></>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                      {u.last_login === '—' ? '—' : new Date(u.last_login as string).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.role !== 'super_admin' && (
                      <div className="relative">
                        <button onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                          <MoreHorizontal size={16} />
                        </button>
                        {openMenu === u.id && (
                          <div className="absolute right-0 top-8 z-10 rounded-[12px] overflow-hidden min-w-[160px]"
                            style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)' }}>
                            <button onClick={() => toggleActive(u.id)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-left transition-colors hover:bg-[var(--bg-subtle)]"
                              style={{ color: u.is_active ? 'var(--danger)' : 'var(--success)', background: 'none', border: 'none', cursor: 'pointer' }}>
                              {u.is_active ? <><XCircle size={13} /> Deactivate</> : <><CheckCircle2 size={13} /> Activate</>}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>No users match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowInvite(false)}>
          <div className="rounded-[18px] p-6 w-full max-w-md space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--brand-subtle)' }}>
                <UserPlus size={16} style={{ color: 'var(--brand)' }} />
              </div>
              <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Invite Platform User</h2>
            </div>
            {(['name','email'] as const).map(key => (
              <div key={key}>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  {key === 'name' ? 'Full Name' : 'Email Address'}
                </label>
                <input type={key === 'email' ? 'email' : 'text'}
                  placeholder={key === 'name' ? 'e.g. John Mwangi' : 'john@example.com'}
                  value={invite[key]} onChange={e => setInvite(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Role</label>
              <select value={invite.role} onChange={e => setInvite(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
                <option value="org_admin">Org Admin</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="lab_manager">Lab Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Organisation</label>
              <select value={invite.org_id} onChange={e => setInvite(p => ({ ...p, org_id: e.target.value }))} style={inputStyle}>
                {MOCK_ORGANIZATIONS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleInvite} disabled={!invite.name || !invite.email}
                className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all active:scale-[0.98]"
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer', opacity: !invite.name || !invite.email ? 0.5 : 1 }}>
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
