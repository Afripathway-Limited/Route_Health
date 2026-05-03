'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Building2, PauseCircle, PlayCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MOCK_ORGANIZATIONS } from '@/lib/mock-data';
import toast from 'react-hot-toast';

const PLAN_COLORS: Record<string, string> = {
  starter: 'gray',
  professional: 'brand',
  enterprise: 'warning',
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState(MOCK_ORGANIZATIONS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<(typeof MOCK_ORGANIZATIONS)[0] | null>(null);
  const [form, setForm] = useState({ name: '', country: '', admin_name: '', admin_email: '', admin_phone: '', subscription_plan: 'starter' });

  const filtered = useMemo(() => {
    return orgs.filter(o => {
      const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.admin_email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orgs, search, statusFilter]);

  const openCreate = () => {
    setEditOrg(null);
    setForm({ name: '', country: '', admin_name: '', admin_email: '', admin_phone: '', subscription_plan: 'starter' });
    setDrawerOpen(true);
  };

  const openEdit = (org: typeof MOCK_ORGANIZATIONS[0]) => {
    setEditOrg(org);
    setForm({ name: org.name, country: org.country, admin_name: org.admin_name, admin_email: org.admin_email, admin_phone: '', subscription_plan: org.subscription_plan });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.admin_email) { toast.error('Name and admin email are required'); return; }
    if (editOrg) {
      setOrgs(prev => prev.map(o => o.id === editOrg.id ? { ...o, ...form } : o));
      toast.success('Organization updated');
    } else {
      setOrgs(prev => [...prev, { id: Date.now(), ...form, rider_count: 0, tasks_this_month: 0, status: 'active', created_at: new Date().toISOString().split('T')[0] }]);
      toast.success('Organization created');
    }
    setDrawerOpen(false);
  };

  const toggleStatus = (id: number, current: string) => {
    const newStatus = current === 'active' ? 'suspended' : 'active';
    setOrgs(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    toast.success(`Organization ${newStatus === 'active' ? 'activated' : 'suspended'}`);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    outline: 'none',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Organizations
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {orgs.filter(o => o.status === 'active').length} active · {orgs.filter(o => o.status === 'suspended').length} suspended
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold"
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Plus size={15} /> New Organization
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organizations..."
            className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[13px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-[10px] text-[13px]"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Building2 size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No organizations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Organization', 'Country', 'Admin', 'Riders', 'Tasks / mo', 'Plan', 'Created', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--text-tertiary)', background: 'var(--bg-subtle)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((org, i) => (
                  <tr key={org.id}
                    className="transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{org.country}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{org.admin_name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{org.admin_email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{org.rider_count}</td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{org.tasks_this_month.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={PLAN_COLORS[org.subscription_plan] as any}>{org.subscription_plan}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{org.created_at}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={org.status === 'active' ? 'success' : 'danger'}>{org.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(org)}
                          className="px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button onClick={() => toggleStatus(org.id, org.status)}
                          className="w-7 h-7 rounded-[7px] flex items-center justify-center"
                          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', cursor: 'pointer', color: org.status === 'active' ? 'var(--warning)' : 'var(--success)' }}>
                          {org.status === 'active' ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[440px] flex flex-col"
            style={{ background: 'var(--bg-surface)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editOrg ? 'Edit Organization' : 'New Organization'}
              </h3>
              <button onClick={() => setDrawerOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: 'Organization Name', key: 'name', placeholder: 'e.g. PathCare Diagnostics' },
                { label: 'Country', key: 'country', placeholder: 'e.g. Kenya' },
                { label: 'Admin Full Name', key: 'admin_name', placeholder: 'John Doe' },
                { label: 'Admin Email', key: 'admin_email', placeholder: 'admin@example.com' },
                { label: 'Admin Phone', key: 'admin_phone', placeholder: '+254700000000' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    {f.label}
                  </label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  Subscription Plan
                </label>
                <select
                  value={form.subscription_plan}
                  onChange={e => setForm(p => ({ ...p, subscription_plan: e.target.value }))}
                  style={inputStyle}>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={handleSave}
                className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold"
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {editOrg ? 'Save Changes' : 'Create Organization'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
