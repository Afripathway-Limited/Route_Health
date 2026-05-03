'use client';

import { useEffect, useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { put, post, api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { applyBrandColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { Building2, Upload, X } from 'lucide-react';

function LogoUploader({ currentUrl, onFile, onFileSelected }: {
  currentUrl: string | null;
  onFile: (f: File) => void;
  onFileSelected: (f: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFile(file);
    onFileSelected(file);
  };

  return (
    <div>
      <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Organization Logo</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className="relative rounded-[12px] border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
        style={{
          minHeight: 96,
          borderColor: dragging ? 'var(--brand)' : 'var(--border-strong)',
          background: dragging ? 'var(--brand-subtle)' : 'var(--bg-elevated)',
        }}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Logo preview" className="max-h-16 object-contain rounded-lg" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPreview(null); onFileSelected(null); }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--danger)', color: '#fff' }}
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={20} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>
              Drop your logo here or <span style={{ color: 'var(--brand)' }}>click to browse</span>
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>PNG, SVG, or JPG · max 2MB</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/svg+xml,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
    </div>
  );
}

const TABS = ['Branding', 'WhatsApp', 'Notifications'] as const;
type Tab = typeof TABS[number];

const TAB_SLUGS: Record<Tab, string> = { 'Branding': 'branding', 'WhatsApp': 'whatsapp', 'Notifications': 'notifications' };
const SLUG_TO_TAB: Record<string, Tab> = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k as Tab]));
function tabFromHash(): Tab {
  if (typeof window === 'undefined') return 'Branding';
  const slug = window.location.hash.replace('#', '');
  return SLUG_TO_TAB[slug] ?? 'Branding';
}

interface BrandingForm  { name: string; primary_color: string; logo_url: string; country: string; timezone: string; subdomain?: string }
interface WhatsAppForm  { whatsapp_provider: string; whatsapp_phone: string; whatsapp_token: string }
interface NotifSettings { notify_failed_stop: boolean; notify_route_dispatch: boolean; notify_anomaly: boolean }

const SECTION_STYLE = {
  background: 'var(--bg-surface)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: 'var(--shadow-card)',
};

const INPUT_STYLE = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
};

function SectionLabel({ children }: { children: string }) {
  return <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>{children}</p>;
}

function SelectField({ label, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <select
        className="w-full rounded-[10px] px-3.5 py-2.5 text-sm focus:outline-none transition-all duration-150"
        style={INPUT_STYLE}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}

export default function OrgSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>(tabFromHash);
  const changeTab = (tab: Tab) => { setActiveTab(tab); window.location.hash = TAB_SLUGS[tab]; };
  const { refreshUser, applyBranding } = useAuth();

  const brandingForm = useForm<BrandingForm>({
    defaultValues: {
      name: 'PathCare Diagnostics Kenya',
      primary_color: '#4F6EF7',
      logo_url: '',
      country: 'Kenya',
      timezone: 'Africa/Nairobi',
    },
  });

  const whatsappForm = useForm<WhatsAppForm>({
    defaultValues: {
      whatsapp_provider: 'twilio',
      whatsapp_phone: '',
      whatsapp_token: '',
    },
  });

  const [notifs, setNotifs] = useState<NotifSettings>({
    notify_failed_stop:    true,
    notify_route_dispatch: true,
    notify_anomaly:        true,
  });

  const brandingMutation = useMutation({
    mutationFn: async (data: BrandingForm) => {
      // Logo uses POST (PHP only parses multipart on POST, not PUT)
      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      // Color/subdomain/name saved separately via JSON
      await put('/settings/branding', {
        primary_color: data.primary_color,
        subdomain: data.subdomain ?? null,
      });
      return put('/settings', { name: data.name, country: data.country });
    },
    onSuccess: (_res, variables) => {
      applyBranding(variables.primary_color);
      toast.success('Branding updated');
      refreshUser();
      setLogoFile(null);
    },
    onError: () => toast.error('Failed to save'),
  });

  const whatsappMutation = useMutation({
    mutationFn: (data: WhatsAppForm) => put('/settings', data),
    onSuccess: () => toast.success('WhatsApp config saved'),
    onError:   () => toast.error('Failed to save'),
  });

  const testWhatsAppMutation = useMutation({
    mutationFn: () => post('/settings/whatsapp/test'),
    onSuccess: () => toast.success('Test message sent!'),
    onError:   () => toast.error('Test failed'),
  });

  const notifMutation = useMutation({
    mutationFn: (data: NotifSettings) => put('/settings', data),
    onSuccess: () => toast.success('Preferences saved'),
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const watchedColor = brandingForm.watch('primary_color');
  const watchedName  = brandingForm.watch('name');
  const watchedLogo  = brandingForm.watch('logo_url') ?? '';

  // Apply live CSS vars as the user moves the color picker (preview in real dashboard UI)
  useEffect(() => {
    if (watchedColor) applyBrandColor(watchedColor);
  }, [watchedColor]);

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Organization Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Manage your organization's configuration</p>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => changeTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: activeTab === tab ? 'var(--brand)' : 'transparent',
              color:      activeTab === tab ? '#FFFFFF' : 'var(--text-tertiary)',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Branding tab ─────────────────────────────────────────── */}
      {activeTab === 'Branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          <form onSubmit={brandingForm.handleSubmit((d) => brandingMutation.mutate(d))} className="space-y-5">
            <div style={SECTION_STYLE}>
              <SectionLabel>Organization Details</SectionLabel>
              <div className="space-y-4">
                <Input label="Organization Name" {...brandingForm.register('name', { required: true })} />
                <Input label="Country" {...brandingForm.register('country')} />
                <SelectField label="Timezone" {...brandingForm.register('timezone')}>
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                  <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                  <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                  <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                  <option value="UTC">UTC</option>
                </SelectField>
              </div>
            </div>

            <div style={SECTION_STYLE}>
              <SectionLabel>Branding</SectionLabel>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
                      style={{ background: 'var(--bg-elevated)' }}
                      {...brandingForm.register('primary_color')}
                    />
                    <input
                      type="text"
                      className="flex-1 rounded-[10px] px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                      style={INPUT_STYLE}
                      {...brandingForm.register('primary_color', {
                        pattern: /^#[0-9A-Fa-f]{3,6}$/,
                      })}
                    />
                  </div>
                </div>
                <LogoUploader
                  currentUrl={brandingForm.watch('logo_url') ?? null}
                  onFile={(f) => brandingForm.setValue('logo_url', '__file__' as any, { shouldDirty: true })}
                  onFileSelected={setLogoFile}
                />
              </div>
            </div>

            <Button type="submit" loading={brandingMutation.isPending} className="w-full">
              Save Branding
            </Button>
          </form>

          {/* Live preview — updates in real time as color picker moves */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Live Preview
            </p>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              {/* Top accent bar */}
              <div className="h-1" style={{ background: watchedColor }} />
              <div className="p-5 space-y-4">
                {/* Org identity */}
                <div className="flex items-center gap-3">
                  {watchedLogo ? (
                    <img src={watchedLogo} alt="logo" className="w-9 h-9 rounded-xl object-contain" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: watchedColor + '22' }}
                    >
                      <Building2 size={16} style={{ color: watchedColor }} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {watchedName || 'Your Organization'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>RouteHealth Platform</p>
                  </div>
                </div>

                {/* Nav items */}
                <div className="space-y-1">
                  {['Dashboard', 'Facilities', 'Riders', 'Analytics'].map((item, i) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                      style={
                        i === 0
                          ? {
                              background: watchedColor + '18',
                              color: watchedColor,
                              borderLeft: `2px solid ${watchedColor}`,
                            }
                          : { color: 'var(--text-tertiary)' }
                      }
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-sm opacity-60"
                        style={{ background: i === 0 ? watchedColor : 'var(--text-tertiary)' }}
                      />
                      {item}
                    </div>
                  ))}
                </div>

                {/* Sample button */}
                <div
                  className="w-full py-2 rounded-xl text-center text-sm font-semibold text-white"
                  style={{ background: watchedColor }}
                >
                  Sample Button
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp tab ──────────────────────────────────────────── */}
      {activeTab === 'WhatsApp' && (
        <form onSubmit={whatsappForm.handleSubmit((d) => whatsappMutation.mutate(d))} className="max-w-lg space-y-5">
          <div style={SECTION_STYLE}>
            <SectionLabel>WhatsApp Business Configuration</SectionLabel>
            <p className="text-sm mb-5" style={{ color: 'var(--text-tertiary)' }}>
              RouteHealth sends route assignments, ETA updates, and delivery confirmations via WhatsApp.
            </p>
            <div className="space-y-4">
              <SelectField label="Provider" {...whatsappForm.register('whatsapp_provider')}>
                <option value="twilio">Twilio WhatsApp Business</option>
                <option value="meta">Meta Business API</option>
              </SelectField>
              <Input label="WhatsApp Phone Number" placeholder="+1234567890" {...whatsappForm.register('whatsapp_phone')} />
              <Input label="API Token / Credentials" type="password" placeholder="AccountSID:AuthToken" {...whatsappForm.register('whatsapp_token')} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => testWhatsAppMutation.mutate()}
              loading={testWhatsAppMutation.isPending}
              className="flex-1"
            >
              Send Test Message
            </Button>
            <Button type="submit" loading={whatsappMutation.isPending} className="flex-1">
              Save Config
            </Button>
          </div>
        </form>
      )}

      {/* ── Notifications tab ─────────────────────────────────────── */}
      {activeTab === 'Notifications' && (
        <div className="max-w-lg space-y-5">
          <div style={SECTION_STYLE}>
            <SectionLabel>Notification Preferences</SectionLabel>
            <p className="text-sm mb-5" style={{ color: 'var(--text-tertiary)' }}>
              Choose which events trigger WhatsApp notifications.
            </p>
            <div className="space-y-0">
              {([
                { key: 'notify_failed_stop'    as const, label: 'Failed Stop Alerts',  desc: 'Notify when a stop is marked failed or disputed' },
                { key: 'notify_route_dispatch' as const, label: 'Route Dispatched',     desc: 'Send WhatsApp to rider when route is dispatched' },
                { key: 'notify_anomaly'        as const, label: 'Anomaly Alerts',       desc: 'Alert admins when AI detects unusual patterns' },
              ]).map(({ key, label, desc }, i, arr) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-4"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifs((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4"
                    style={{ background: notifs[key] ? 'var(--brand)' : 'var(--bg-elevated)' }}
                  >
                    <span
                      className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                      style={{ transform: notifs[key] ? 'translateX(24px)' : 'translateX(4px)' }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={() => notifMutation.mutate(notifs)} loading={notifMutation.isPending} className="w-full">
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  );
}
