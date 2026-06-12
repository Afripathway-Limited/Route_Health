'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, Trash2, UserCheck, UserX, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { get, post, patch, del, getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

const ROLE_LABELS: Record<string, string> = {
  dispatcher: 'Dispatcher',
  lab_manager: 'Lab Manager',
};

const ROLE_COLORS: Record<string, string> = {
  dispatcher: 'brand',
  lab_manager: 'purple',
};

interface AddUserForm {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface OrgUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  avatar_url: string | null;
}

const BLANK_FORM: AddUserForm = { name: '', email: '', phone: '', password: '' };

export default function UsersPage() {
  const [search, setSearch]             = useState('');
  const [addOpen, setAddOpen]           = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<OrgUser | null>(null);
  const [users, setUsers]               = useState<OrgUser[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [form, setForm]                 = useState<AddUserForm>(BLANK_FORM);
  const [showPassword, setShowPassword] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const data = await get<OrgUser[]>('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm(BLANK_FORM);
    setShowPassword(false);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Name, email and password are required');
      return;
    }
    setSaving(true);
    try {
      await post('/users/invite', form);
      toast.success(`${form.name} added as Dispatcher`);
      await loadUsers();
      setAddOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await del(`/users/${confirmRemove.id}`);
      setUsers(prev => prev.filter(u => u.id !== confirmRemove.id));
      toast.success(`${confirmRemove.name} removed`);
      setConfirmRemove(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const toggleActive = async (id: number) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    try {
      await patch(`/users/${id}/${user.is_active ? 'deactivate' : 'activate'}`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 40, background: 'var(--bg-subtle)',
    border: '1.5px solid var(--border-strong)', borderRadius: 10,
    fontSize: 13, color: 'var(--text-primary)', outline: 'none',
    padding: '0 12px', boxSizing: 'border-box',
  };

  return (
    <div className="p-4 lg:p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Team Members
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {users.filter(u => u.is_active).length} active · {users.length} total
          </p>
        </div>
        <div className="hidden md:block">
          <Button onClick={openAdd}><Plus size={14} /> Add User</Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
        <input type="text" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 36 }} />
      </div>

      {/* Desktop table */}
      <div className="data-table rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Member', 'Email', 'Role', 'Last Login', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                      style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                        : u.name.charAt(0)}
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                <td className="px-4 py-3.5">
                  <Badge color={ROLE_COLORS[u.role] as any ?? 'gray'}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                </td>
                <td className="px-4 py-3.5 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  {u.last_login_at
                    ? new Date(u.last_login_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Never'}
                </td>
                <td className="px-4 py-3.5">
                  <button onClick={() => toggleActive(u.id)}
                    className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full transition-all"
                    style={{
                      background: u.is_active ? 'var(--success-subtle)' : 'var(--bg-subtle)',
                      color: u.is_active ? 'var(--success)' : 'var(--text-tertiary)',
                      border: `1px solid ${u.is_active ? 'var(--success-border)' : 'var(--border-subtle)'}`,
                    }}>
                    {u.is_active ? <UserCheck size={11} /> : <UserX size={11} />}
                    {u.is_active ? 'Active' : 'Suspended'}
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <button onClick={() => setConfirmRemove(u)}
                    className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all"
                    style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--danger-subtle)'; el.style.color = 'var(--danger)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'none'; el.style.color = 'var(--text-tertiary)'; }}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {loading && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No team members yet</p>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Add a dispatcher to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards space-y-3">
        {filtered.map(u => (
          <div key={u.id} className="rounded-[12px] p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                <p className="text-[12px] truncate" style={{ color: 'var(--text-tertiary)' }}>{u.email}</p>
              </div>
              <Badge color={ROLE_COLORS[u.role] as any ?? 'gray'}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
            </div>
          </div>
        ))}
        <button onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] text-[13px] font-medium transition-all"
          style={{ border: '1.5px dashed var(--border-strong)', color: 'var(--text-tertiary)', background: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> Add team member
        </button>
      </div>

      {/* ─── Add User Modal ──────────────────────────────────────────────── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Dispatcher">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full name *</label>
            <Input placeholder="Jane Doe" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email address *</label>
            <Input type="email" placeholder="jane@organization.ke" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Phone</label>
            <Input placeholder="+254 700 000000" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 characters"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                style={{ ...inputStyle, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-tertiary)', display: 'flex', padding: 0,
                }}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <p className="text-[12px] px-3 py-2 rounded-[8px]" style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
            Role: <strong>Dispatcher</strong> — can create tasks, plan routes, and assign riders.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAdd} className="flex-1" disabled={saving}>
              <Plus size={14} /> {saving ? 'Creating…' : 'Create Account'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Remove Confirm Modal ────────────────────────────────────────── */}
      <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Remove Member">
        <div className="space-y-4">
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>{confirmRemove?.name}</strong>? They will lose access immediately.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmRemove(null)} className="flex-1">Cancel</Button>
            <button onClick={handleRemove}
              className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold transition-all"
              style={{ background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Remove
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
