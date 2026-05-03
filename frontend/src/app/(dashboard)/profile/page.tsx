'use client';

import { useState } from 'react';
import { User, Lock, Bell, Palette, Eye, EyeOff, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

type Tab = 'Profile' | 'Password' | 'Notifications' | 'Appearance';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'Profile',       label: 'Profile',       icon: User    },
  { id: 'Password',      label: 'Password',      icon: Lock    },
  { id: 'Notifications', label: 'Notifications', icon: Bell    },
  { id: 'Appearance',    label: 'Appearance',    icon: Palette },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  org_admin:   'Organization Admin',
  dispatcher:  'Dispatcher',
  lab_manager: 'Lab Manager',
  rider:       'Rider',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Profile');

  const [profile, setProfile] = useState({
    name: user?.name ?? 'James Kariuki',
    phone: user?.phone ?? '+254700000000',
    avatar_url: user?.avatar_url ?? '',
  });

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const [notifs, setNotifs] = useState({
    route_assigned: true,
    stop_update: false,
    dispute_alert: true,
    daily_summary: false,
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    toast.success('Profile updated');
  };

  const handleChangePassword = async () => {
    if (!pwForm.current) { toast.error('Enter your current password'); return; }
    if (pwForm.next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setPwForm({ current: '', next: '', confirm: '' });
    toast.success('Password changed successfully');
  };

  const handleSaveNotifs = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success('Notification preferences saved');
  };

  const inputStyle = {
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).style.borderColor = 'var(--brand)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)';
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          My Profile
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Manage your account settings</p>
      </div>

      {/* User badge */}
      <div className="flex items-center gap-4 p-4 rounded-[14px]" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-[22px] font-bold flex-shrink-0"
          style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
          {(user?.name ?? profile.name).charAt(0)}
        </div>
        <div>
          <p className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {user?.name ?? profile.name}
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{user?.email ?? 'james@pathcare.ke'}</p>
          <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: 'var(--brand-subtle)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
            {ROLE_LABELS[user?.role ?? 'org_admin'] ?? user?.role}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative">
        <div className="flex gap-1 p-1 rounded-[14px] overflow-x-auto" style={{ background: 'var(--bg-subtle)', scrollbarWidth: 'none' } as React.CSSProperties}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex items-center gap-2 rounded-[10px] text-[13px] transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  padding: '9px 16px',
                  background: isActive ? 'var(--bg-surface)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: isActive ? 600 : 500,
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}>
                <Icon size={14} style={{ color: isActive ? 'var(--brand)' : 'var(--text-tertiary)' }} />
                {label}
              </button>
            );
          })}
          <div className="w-6 flex-shrink-0" />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none rounded-r-[14px]"
          style={{ background: 'linear-gradient(to right, transparent, var(--bg-subtle))' }} />
      </div>

      {/* Profile tab */}
      {activeTab === 'Profile' && (
        <div className="rounded-[14px] p-5 space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <User size={15} style={{ color: 'var(--text-secondary)' }} /> Personal Information
          </h2>
          {[
            { label: 'Full Name', key: 'name', placeholder: 'Your full name' },
            { label: 'Phone (WhatsApp)', key: 'phone', placeholder: '+254700000000' },
            { label: 'Avatar URL', key: 'avatar_url', placeholder: 'https://...' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                {field.label}
              </label>
              <input
                value={(profile as any)[field.key]}
                onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-3 py-2.5 rounded-[10px] text-[13px]"
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          ))}
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all"
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Password tab */}
      {activeTab === 'Password' && (
        <div className="rounded-[14px] p-5 space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Lock size={15} style={{ color: 'var(--text-secondary)' }} /> Change Password
          </h2>
          {([
            { label: 'Current Password', key: 'current' as const },
            { label: 'New Password', key: 'next' as const },
            { label: 'Confirm New Password', key: 'confirm' as const },
          ]).map(field => (
            <div key={field.key}>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                {field.label}
              </label>
              <div className="relative">
                <input
                  type={showPw[field.key] ? 'text' : 'password'}
                  value={pwForm[field.key]}
                  onChange={e => setPwForm(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-[10px] text-[13px]"
                  style={inputStyle}
                  onFocus={focusStyle as any}
                  onBlur={blurStyle as any}
                />
                <button type="button"
                  onClick={() => setShowPw(p => ({ ...p, [field.key]: !p[field.key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={handleChangePassword}
            disabled={saving}
            className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all"
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Change Password'}
          </button>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'Notifications' && (
        <div className="rounded-[14px] p-5 space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div>
            <h2 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Bell size={15} style={{ color: 'var(--text-secondary)' }} /> WhatsApp Notifications
            </h2>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Choose which events send you a WhatsApp message.
            </p>
          </div>
          {([
            { key: 'route_assigned' as const, label: 'Route Assigned', desc: 'When a new route is dispatched to you' },
            { key: 'stop_update' as const,    label: 'Stop Status Updates', desc: 'When a stop status changes' },
            { key: 'dispute_alert' as const,  label: 'Dispute Alerts', desc: 'When a delivery is disputed' },
            { key: 'daily_summary' as const,  label: 'Daily Summary', desc: 'End-of-day route completion summary' },
          ]).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
                style={{ background: notifs[key] ? 'var(--brand)' : 'var(--border-subtle)', border: 'none', cursor: 'pointer' }}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notifs[key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
          <button
            onClick={handleSaveNotifs}
            disabled={saving}
            className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all"
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      )}

      {/* Appearance tab */}
      {activeTab === 'Appearance' && (
        <div className="rounded-[14px] p-5 space-y-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Choose how RouteHealth looks to you.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="flex flex-col items-center gap-2.5 p-4 rounded-[12px] transition-all"
              style={{
                background: 'var(--brand-subtle)',
                border: '2px solid var(--brand)',
                cursor: 'pointer',
              }}>
              <Sun size={20} style={{ color: 'var(--brand)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--brand)' }}>Light</span>
            </button>
            <div className="flex flex-col items-center gap-2.5 p-4 rounded-[12px] relative overflow-hidden"
              style={{ background: 'var(--bg-subtle)', border: '2px solid var(--border-subtle)' }}>
              <div className="absolute inset-0 flex items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)' }}>
                <span className="text-[11px] font-semibold px-2 py-1 rounded-full"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
                  Coming soon
                </span>
              </div>
              <span className="text-[20px]">🌙</span>
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Dark</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
