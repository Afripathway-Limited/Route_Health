'use client';

import { useState } from 'react';
import { MessageSquare, Cpu, Activity, Palette, Mail, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'WhatsApp' | 'Routing Engine' | 'Branding' | 'Email' | 'System Health';

const TABS: { id: Tab; icon: React.ElementType }[] = [
  { id: 'WhatsApp',      icon: MessageSquare },
  { id: 'Routing Engine', icon: Cpu },
  { id: 'Branding',      icon: Palette },
  { id: 'Email',         icon: Mail },
  { id: 'System Health', icon: Activity },
];

const SYSTEM_SERVICES = [
  { name: 'API Server',            status: 'operational', latency: '42ms' },
  { name: 'Database (PostgreSQL)', status: 'operational', latency: '8ms' },
  { name: 'Redis Queue',           status: 'operational', latency: '2ms' },
  { name: 'WhatsApp (Twilio)',     status: 'operational', latency: '—' },
  { name: 'S3 File Storage',       status: 'operational', latency: '—' },
  { name: 'Routing Engine (OSRM)', status: 'degraded',    latency: '—' },
  { name: 'Pusher (Real-time)',    status: 'operational', latency: '—' },
];

export default function PlatformSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('WhatsApp');
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  const [waForm, setWaForm] = useState({ phone: '+1415XXXXXXX', token: 'AC••••••••••••••••••••••••••••', provider: 'twilio' });
  const [routingForm, setRoutingForm] = useState({ max_tasks_per_run: '100', max_riders_per_run: '20', optimization_timeout: '10', engine: 'osrm' });
  const [brandingForm, setBrandingForm] = useState({ platform_name: 'RouteHealth', tagline: 'Last-Mile Medical Logistics for Africa', primary_color: '#10B981', support_email: 'support@routehealth.com', logo_url: '' });
  const [emailForm, setEmailForm] = useState({ smtp_host: 'smtp.sendgrid.net', smtp_port: '587', smtp_user: 'apikey', smtp_password: '••••••••••••••••••', from_name: 'RouteHealth', from_email: 'noreply@routehealth.com' });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    toast.success('Settings saved successfully');
  };

  const handleClearCache = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1200));
    setSaving(false);
    toast.success('Cache cleared successfully');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)', outline: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13,
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
      {children}
    </div>
  );

  const SaveBtn = ({ label = 'Save Changes' }: { label?: string }) => (
    <button onClick={handleSave} disabled={saving}
      className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all active:scale-[0.98]"
      style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
      {saving ? 'Saving…' : label}
    </button>
  );

  return (
    <div className="p-4 lg:p-8 max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Platform Settings</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Global configuration for the RouteHealth platform</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-[14px] flex-wrap" style={{ background: 'var(--bg-subtle)' }}>
        {TABS.map(({ id, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 rounded-[10px] text-[13px] transition-all whitespace-nowrap"
              style={{ padding: '9px 14px', background: isActive ? 'var(--bg-surface)' : 'transparent', color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: isActive ? 600 : 500, boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', border: 'none', cursor: 'pointer' }}>
              <Icon size={13} style={{ color: isActive ? 'var(--brand)' : 'var(--text-muted)' }} />
              {id}
            </button>
          );
        })}
      </div>

      {/* WhatsApp */}
      {activeTab === 'WhatsApp' && (
        <div className="rounded-[14px] p-5 space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>WhatsApp API Configuration</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Global credentials used for all organisations that have not configured their own.</p>
          </div>
          <Field label="Provider">
            <select value={waForm.provider} onChange={e => setWaForm(p => ({ ...p, provider: e.target.value }))} style={inputStyle}>
              <option value="twilio">Twilio</option>
              <option value="meta">Meta (Facebook)</option>
            </select>
          </Field>
          <Field label="WhatsApp Phone Number">
            <input value={waForm.phone} onChange={e => setWaForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1415XXXXXXX" style={inputStyle} />
          </Field>
          <Field label="Auth Token / Secret">
            <div className="relative">
              <input type={showTokens['wa'] ? 'text' : 'password'} value={waForm.token}
                onChange={e => setWaForm(p => ({ ...p, token: e.target.value }))} style={{ ...inputStyle, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowTokens(p => ({ ...p, wa: !p.wa }))}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showTokens['wa'] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <SaveBtn label="Save WhatsApp Config" />
        </div>
      )}

      {/* Routing Engine */}
      {activeTab === 'Routing Engine' && (
        <div className="rounded-[14px] p-5 space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Routing Engine Configuration</h2>
          <Field label="Engine">
            <select value={routingForm.engine} onChange={e => setRoutingForm(p => ({ ...p, engine: e.target.value }))} style={inputStyle}>
              <option value="osrm">OSRM (self-hosted)</option>
              <option value="ortools">Google OR-Tools</option>
              <option value="vroom">VROOM</option>
            </select>
          </Field>
          {[
            { label: 'Max Tasks Per Run',      key: 'max_tasks_per_run',      suffix: 'tasks' },
            { label: 'Max Riders Per Run',     key: 'max_riders_per_run',     suffix: 'riders' },
            { label: 'Optimization Timeout',   key: 'optimization_timeout',   suffix: 'seconds' },
          ].map(f => (
            <Field key={f.key} label={f.label}>
              <div className="relative">
                <input type="number" value={(routingForm as any)[f.key]}
                  onChange={e => setRoutingForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...inputStyle, paddingRight: 64 }} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: 'var(--text-muted)' }}>{f.suffix}</span>
              </div>
            </Field>
          ))}
          <SaveBtn label="Save Routing Config" />
        </div>
      )}

      {/* Branding */}
      {activeTab === 'Branding' && (
        <div className="space-y-4">
          <div className="rounded-[14px] p-5 space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Platform Identity</h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Displayed on the login page and in system emails.</p>
            </div>
            <Field label="Platform Name">
              <input value={brandingForm.platform_name} onChange={e => setBrandingForm(p => ({ ...p, platform_name: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Tagline">
              <input value={brandingForm.tagline} onChange={e => setBrandingForm(p => ({ ...p, tagline: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Support Email">
              <input type="email" value={brandingForm.support_email} onChange={e => setBrandingForm(p => ({ ...p, support_email: e.target.value }))} style={inputStyle} />
            </Field>
          </div>

          <div className="rounded-[14px] p-5 space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Default Accent Colour</h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Applied to organisations that have not set their own brand colour.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[12px] border-2 flex-shrink-0" style={{ background: brandingForm.primary_color, borderColor: 'var(--border-subtle)' }} />
              <div className="flex-1">
                <Field label="Hex Colour">
                  <input value={brandingForm.primary_color} onChange={e => setBrandingForm(p => ({ ...p, primary_color: e.target.value }))}
                    placeholder="#10B981" style={inputStyle} />
                </Field>
              </div>
              <input type="color" value={brandingForm.primary_color} onChange={e => setBrandingForm(p => ({ ...p, primary_color: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer flex-shrink-0" style={{ border: '1px solid var(--border-subtle)', background: 'none', padding: 2 }} />
            </div>

            {/* Live preview */}
            <div className="rounded-[12px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Preview</p>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-white"
                  style={{ background: brandingForm.primary_color, border: 'none' }}>Primary Button</button>
                <div className="px-3 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: `${brandingForm.primary_color}20`, color: brandingForm.primary_color }}>Badge</div>
                <div className="w-5 h-5 rounded-full" style={{ background: brandingForm.primary_color }} />
              </div>
            </div>
            <SaveBtn label="Save Branding" />
          </div>
        </div>
      )}

      {/* Email */}
      {activeTab === 'Email' && (
        <div className="rounded-[14px] p-5 space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>SMTP Configuration</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Used for password resets, invite emails, and platform notifications.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SMTP Host">
              <input value={emailForm.smtp_host} onChange={e => setEmailForm(p => ({ ...p, smtp_host: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Port">
              <input value={emailForm.smtp_port} onChange={e => setEmailForm(p => ({ ...p, smtp_port: e.target.value }))} style={inputStyle} />
            </Field>
          </div>
          <Field label="SMTP Username">
            <input value={emailForm.smtp_user} onChange={e => setEmailForm(p => ({ ...p, smtp_user: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label="SMTP Password">
            <div className="relative">
              <input type={showTokens['smtp'] ? 'text' : 'password'} value={emailForm.smtp_password}
                onChange={e => setEmailForm(p => ({ ...p, smtp_password: e.target.value }))} style={{ ...inputStyle, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowTokens(p => ({ ...p, smtp: !p.smtp }))}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showTokens['smtp'] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From Name">
              <input value={emailForm.from_name} onChange={e => setEmailForm(p => ({ ...p, from_name: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="From Email">
              <input type="email" value={emailForm.from_email} onChange={e => setEmailForm(p => ({ ...p, from_email: e.target.value }))} style={inputStyle} />
            </Field>
          </div>
          <div className="flex gap-3">
            <SaveBtn label="Save Email Config" />
            <button onClick={() => toast.success('Test email sent to super@routehealth.com')}
              className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
              Send Test Email
            </button>
          </div>
        </div>
      )}

      {/* System Health */}
      {activeTab === 'System Health' && (
        <div className="space-y-4">
          <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Service Status</h2>
            </div>
            {SYSTEM_SERVICES.map((svc, i) => (
              <div key={svc.name} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-subtle)] transition-colors"
                style={{ borderBottom: i < SYSTEM_SERVICES.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div className="flex items-center gap-3">
                  {svc.status === 'operational'
                    ? <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    : <AlertCircle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />}
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{svc.name}</p>
                    {svc.latency !== '—' && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>latency: {svc.latency}</p>}
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: svc.status === 'operational' ? 'var(--success-subtle)' : 'var(--warning-subtle)', color: svc.status === 'operational' ? 'var(--success)' : 'var(--warning)' }}>
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Cache Management</h3>
            <p className="text-[12px] mb-4" style={{ color: 'var(--text-tertiary)' }}>Clear the application cache if you observe stale data across the platform.</p>
            <button onClick={handleClearCache} disabled={saving}
              className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all"
              style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger-border)', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Clearing…' : 'Clear Application Cache'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
