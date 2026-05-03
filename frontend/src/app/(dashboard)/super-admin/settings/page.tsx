'use client';

import { useState } from 'react';
import { MessageSquare, Cpu, Activity, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'WhatsApp' | 'Routing Engine' | 'System Health';

const TABS: { id: Tab; icon: React.ElementType }[] = [
  { id: 'WhatsApp', icon: MessageSquare },
  { id: 'Routing Engine', icon: Cpu },
  { id: 'System Health', icon: Activity },
];

const SYSTEM_SERVICES = [
  { name: 'API Server', status: 'operational', latency: '42ms' },
  { name: 'Database (PostgreSQL)', status: 'operational', latency: '8ms' },
  { name: 'Redis Queue', status: 'operational', latency: '2ms' },
  { name: 'WhatsApp (Twilio)', status: 'operational', latency: '—' },
  { name: 'S3 File Storage', status: 'operational', latency: '—' },
  { name: 'Routing Engine (OSRM)', status: 'degraded', latency: '—' },
  { name: 'Pusher (Real-time)', status: 'operational', latency: '—' },
];

export default function PlatformSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('WhatsApp');
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  const [waForm, setWaForm] = useState({
    phone: '+1415XXXXXXX',
    token: 'AC••••••••••••••••••••••••••••',
    provider: 'twilio',
  });

  const [routingForm, setRoutingForm] = useState({
    max_tasks_per_run: '100',
    max_riders_per_run: '20',
    optimization_timeout: '10',
    engine: 'osrm',
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    toast.success('Platform settings saved');
  };

  const handleClearCache = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1200));
    setSaving(false);
    toast.success('Cache cleared successfully');
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
    <div className="p-4 lg:p-8 max-w-2xl space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Platform Settings
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Global configuration for all organizations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-[14px]" style={{ background: 'var(--bg-subtle)' }}>
        {TABS.map(({ id, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 rounded-[10px] text-[13px] transition-all whitespace-nowrap flex-shrink-0"
              style={{
                padding: '9px 16px',
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: isActive ? 600 : 500,
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                cursor: 'pointer',
              }}>
              <Icon size={14} style={{ color: isActive ? 'var(--brand)' : 'var(--text-muted)' }} />
              {id}
            </button>
          );
        })}
      </div>

      {/* WhatsApp tab */}
      {activeTab === 'WhatsApp' && (
        <div className="rounded-[14px] p-5 space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>WhatsApp API Configuration</h2>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            Global WhatsApp credentials used for dispatch messages across all organizations that have not configured their own.
          </p>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Provider</label>
            <select value={waForm.provider} onChange={e => setWaForm(p => ({ ...p, provider: e.target.value }))} style={inputStyle}>
              <option value="twilio">Twilio</option>
              <option value="meta">Meta (Facebook)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>WhatsApp Phone Number</label>
            <input value={waForm.phone} onChange={e => setWaForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1415XXXXXXX" style={inputStyle} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Auth Token / Secret</label>
            <div className="relative">
              <input
                type={showTokens['wa_token'] ? 'text' : 'password'}
                value={waForm.token}
                onChange={e => setWaForm(p => ({ ...p, token: e.target.value }))}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button type="button"
                onClick={() => setShowTokens(p => ({ ...p, wa_token: !p.wa_token }))}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showTokens['wa_token'] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all"
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save WhatsApp Config'}
          </button>
        </div>
      )}

      {/* Routing Engine tab */}
      {activeTab === 'Routing Engine' && (
        <div className="rounded-[14px] p-5 space-y-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Routing Engine Configuration</h2>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Engine</label>
            <select value={routingForm.engine} onChange={e => setRoutingForm(p => ({ ...p, engine: e.target.value }))} style={inputStyle}>
              <option value="osrm">OSRM (self-hosted)</option>
              <option value="ortools">Google OR-Tools</option>
              <option value="vroom">VROOM</option>
            </select>
          </div>
          {[
            { label: 'Max Tasks Per Run', key: 'max_tasks_per_run', suffix: 'tasks' },
            { label: 'Max Riders Per Run', key: 'max_riders_per_run', suffix: 'riders' },
            { label: 'Optimization Timeout', key: 'optimization_timeout', suffix: 'seconds' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                {f.label}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={(routingForm as any)[f.key]}
                  onChange={e => setRoutingForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...inputStyle, paddingRight: 60 }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {f.suffix}
                </span>
              </div>
            </div>
          ))}
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all"
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Routing Config'}
          </button>
        </div>
      )}

      {/* System Health tab */}
      {activeTab === 'System Health' && (
        <div className="space-y-4">
          <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Service Status</h2>
            </div>
            <div>
              {SYSTEM_SERVICES.map((svc, i) => (
                <div key={svc.name}
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderBottom: i < SYSTEM_SERVICES.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    {svc.status === 'operational' ? (
                      <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    )}
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{svc.name}</p>
                      {svc.latency !== '—' && (
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>latency: {svc.latency}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: svc.status === 'operational' ? 'var(--success-subtle)' : 'var(--warning-subtle)',
                      color: svc.status === 'operational' ? 'var(--success)' : 'var(--warning)',
                    }}>
                    {svc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Cache Management</h3>
            <p className="text-[12px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Clear the application cache if you observe stale data across the platform.
            </p>
            <button onClick={handleClearCache} disabled={saving}
              className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all"
              style={{
                background: 'var(--danger-subtle)',
                color: 'var(--danger)',
                border: '1px solid var(--danger-border)',
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}>
              {saving ? 'Clearing…' : 'Clear Application Cache'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
