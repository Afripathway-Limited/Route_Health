'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye, EyeOff, Zap, AlertCircle,
  Mail, Lock, Shield, CheckCircle, Activity,
  MapPin, MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';

/* ─── SVG patterns ──────────────────────────────────────────────────────── */
const DOT_LIGHT  = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='rgba(79%2C110%2C247%2C0.08)'/%3E%3C/svg%3E")`;
const GRID_SVG   = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0L0 0 0 40' fill='none' stroke='rgba(255%2C255%2C255%2C0.06)' stroke-width='1'/%3E%3C/svg%3E")`;

/* ─── Static data ───────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Shield,       name: 'Chain of Custody',        desc: 'Photo proof at every sample handover' },
  { icon: MapPin,       name: 'Live Route Tracking',     desc: 'Real-time visibility across your entire fleet' },
  { icon: MessageSquare,name: 'WhatsApp Confirmations',  desc: 'Lab managers confirm delivery instantly' },
] as const;

const TRUST = [
  { icon: Shield,       label: '256-bit SSL'     },
  { icon: CheckCircle,  label: 'HIPAA Compliant' },
  { icon: Activity,     label: '99.9% Uptime'    },
] as const;

const DEMO_CREDS = [
  { label: 'Super Admin',   color: '#F59E0B', email: 'super@routehealth.com',   password: 'RouteHealth@2024!' },
  { label: 'Org Admin',     color: '#4F46E5', email: 'admin@pathcare.ke',        password: 'Demo@2024!'        },
  { label: 'Dispatcher',    color: '#10B981', email: 'dispatcher@pathcare.ke',   password: 'Demo@2024!'        },
  { label: 'Lab Manager',   color: '#06B6D4', email: 'lab@nairobi-general.ke',   password: 'Demo@2024!'        },
];

/* ─── Spinner ───────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rh-spin">
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ─── TrustRow ──────────────────────────────────────────────────────────── */
function TrustRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {TRUST.map(({ icon: Icon, label }, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && (
            <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 14px' }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon size={11} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [noMotion, setNoMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setNoMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setNoMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { redirect } = await login(email, password);
      router.push(redirect);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const tx = noMotion ? 'none' : 'all 200ms ease';

  const inputBase: React.CSSProperties = {
    width: '100%',
    height: 46,
    background: 'var(--bg-subtle)',
    border: '1.5px solid var(--border-strong)',
    borderRadius: 10,
    fontSize: 14,
    color: 'var(--text-primary)',
    outline: 'none',
    transition: tx,
    boxSizing: 'border-box',
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#4F46E5';
    e.target.style.boxShadow   = '0 0 0 4px rgba(79,70,229,0.12)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--border-strong)';
    e.target.style.boxShadow   = 'none';
  };

  const bgGrad = 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(79,110,247,0.06) 0%, rgba(248,249,252,1) 60%)';

  return (
    <>
      {/* ── Global styles ─────────────────────────────────────────── */}
      <style>{`
        @keyframes rh-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .rh-spin { animation: rh-spin 0.75s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .rh-spin { animation: none; } }
        ::placeholder { color: var(--text-tertiary) !important; opacity: 1; }
        .rh-form-wrap { padding: 80px 24px 40px; }
        @media (min-width: 768px) { .rh-form-wrap { padding: 0; } }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden' }}>

        {/* Fixed bg layer 1: radial gradient */}
        <div style={{ position: 'fixed', inset: 0, background: bgGrad, zIndex: 0, pointerEvents: 'none' }} />
        {/* Fixed bg layer 2: dot grid */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: DOT_LIGHT,
          backgroundRepeat: 'repeat',
        }} />

        {/* Mobile gradient top bar */}
        <div className="md:hidden" style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 4, zIndex: 100,
          background: 'linear-gradient(135deg, #4F46E5 0%, #0EA5E9 50%, #059669 100%)',
        }} />

        {/* ══ LEFT PANEL (desktop only) ═══════════════════════════════ */}
        <div
          className="hidden md:flex"
          style={{
            width: '55%',
            minHeight: '100vh',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            padding: 60,
            background: 'linear-gradient(135deg, #4F46E5 0%, #0EA5E9 50%, #059669 100%)',
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          {/* Decorative glow — top right */}
          <div style={{
            position: 'absolute', top: -80, right: -80,
            width: 400, height: 400, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', filter: 'blur(60px)',
            pointerEvents: 'none',
          }} />
          {/* Decorative glow — bottom left */}
          <div style={{
            position: 'absolute', bottom: -60, left: -60,
            width: 300, height: 300, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', filter: 'blur(40px)',
            pointerEvents: 'none',
          }} />
          {/* Grid overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: GRID_SVG, backgroundRepeat: 'repeat',
          }} />

          {/* Logo */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Zap size={24} color="#ffffff" fill="rgba(255,255,255,0.3)" />
            </div>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em' }}>
              RouteHealth
            </span>
          </div>

          {/* Heading */}
          <div style={{ position: 'relative', marginTop: 52 }}>
            <h2 style={{
              margin: 0,
              fontSize: 42,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
            }}>
              Healthcare Logistics,{' '}
              <span style={{
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.80) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Reimagined.
              </span>
            </h2>
            <p style={{
              marginTop: 16, marginBottom: 0,
              color: 'rgba(255,255,255,0.75)',
              fontSize: 17, lineHeight: 1.65, maxWidth: 400,
            }}>
              The only routing platform built exclusively for Africa's medical supply chain.
            </p>
          </div>

          {/* Feature rows */}
          <div style={{ position: 'relative', marginTop: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {FEATURES.map(({ icon: Icon, name, desc }) => (
              <div key={name} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color="#ffffff" />
                </div>
                <div>
                  <p style={{ margin: 0, color: '#ffffff', fontWeight: 600, fontSize: 14 }}>{name}</p>
                  <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div style={{
            position: 'relative',
            marginTop: 'auto',
            paddingTop: 40,
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              padding: 20,
            }}>
              <p style={{
                margin: 0,
                color: 'rgba(255,255,255,0.90)',
                fontSize: 13,
                fontStyle: 'italic',
                lineHeight: 1.75,
              }}>
                "RouteHealth reduced our sample transit time by 40% in the first month. The chain of custody feature alone has eliminated all disputes with our clinic partners."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#ffffff',
                }}>
                  DM
                </div>
                <div>
                  <p style={{ margin: 0, color: '#ffffff', fontWeight: 600, fontSize: 13 }}>Dr. Diana Mwangi</p>
                  <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>Lab Director, PathCare Kenya</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL ═════════════════════════════════════════════ */}
        <div
          style={{
            flex: 1,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Solid bg on desktop only — transparent on mobile to show dot pattern */}
          <div
            className="hidden md:block"
            style={{ position: 'absolute', inset: 0, background: '#ffffff' }}
          />

          {/* HIPAA compliance note — desktop top */}
          <div
            className="hidden md:flex"
            style={{
              position: 'absolute', top: 28, left: 0, right: 0,
              alignItems: 'center', justifyContent: 'center', gap: 6,
              pointerEvents: 'none',
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#10B981', display: 'block', flexShrink: 0,
            }} />
            <Lock size={10} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.01em' }}>
              Secure, HIPAA-compliant platform
            </span>
          </div>

          {/* Form container */}
          <div
            className="rh-form-wrap"
            style={{
              position: 'relative',
              maxWidth: 380,
              width: '100%',
              margin: '0 auto',
            }}
          >

            {/* ── Form header */}
            <div>
              <h1 style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}>
                Welcome back
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-tertiary)' }}>
                Sign in to your RouteHealth account
              </p>
            </div>

            {/* ── Form */}
            <form onSubmit={handleSubmit} style={{ marginTop: 36 }}>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block', fontSize: 13, fontWeight: 500,
                  color: 'var(--text-secondary)', marginBottom: 7,
                }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)', pointerEvents: 'none',
                  }} />
                  <input
                    type="email"
                    placeholder="you@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    style={{ ...inputBase, paddingLeft: 42, paddingRight: 14 }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginTop: 20 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 7,
                }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    style={{
                      fontSize: 13, fontWeight: 500,
                      color: '#4F46E5', textDecoration: 'none', transition: tx,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)', pointerEvents: 'none',
                  }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ ...inputBase, paddingLeft: 42, paddingRight: 46 }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-tertiary)', background: 'none',
                      border: 'none', cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', transition: tx,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, borderRadius: 8, padding: '10px 14px', marginTop: 16,
                  background: 'var(--danger-subtle)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              {/* Sign In button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: 48, marginTop: 24,
                  background: 'linear-gradient(135deg, #4F46E5 0%, #0EA5E9 100%)',
                  color: '#ffffff', fontWeight: 600, fontSize: 14,
                  borderRadius: 10, border: 'none',
                  boxShadow: '0 4px 15px rgba(79,70,229,0.35)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.85 : 1,
                  transition: tx,
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={(e) => {
                  if (loading || noMotion) return;
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 6px 20px rgba(79,70,229,0.45)';
                  el.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 4px 15px rgba(79,70,229,0.35)';
                  el.style.transform = '';
                }}
                onMouseDown={(e) => {
                  if (!noMotion) (e.currentTarget as HTMLElement).style.transform = 'scale(0.99)';
                }}
                onMouseUp={(e) => {
                  if (!noMotion) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
              >
                {loading ? <><Spinner /> Signing in...</> : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{
                fontSize: 11, color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap', fontWeight: 500, letterSpacing: '0.03em',
              }}>
                DEMO ACCESS
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>

            {/* Demo credential buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DEMO_CREDS.map((cred) => (
                <button
                  key={cred.label}
                  type="button"
                  onClick={() => { setEmail(cred.email); setPassword(cred.password); }}
                  style={{
                    height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontSize: 13, fontWeight: 500,
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer', transition: tx,
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = cred.color;
                    el.style.color = 'var(--text-primary)';
                    el.style.boxShadow = `0 4px 12px ${cred.color}25`;
                    if (!noMotion) el.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'var(--border-subtle)';
                    el.style.color = 'var(--text-secondary)';
                    el.style.boxShadow = 'none';
                    el.style.transform = '';
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: cred.color, flexShrink: 0,
                    boxShadow: `0 0 6px ${cred.color}80`,
                  }} />
                  {cred.label}
                </button>
              ))}
            </div>

            {/* Trust badges — mobile only (below form) */}
            <div className="md:hidden" style={{ marginTop: 40 }}>
              <TrustRow />
            </div>
          </div>

          {/* Trust badges — desktop (pinned to bottom) */}
          <div
            className="hidden md:flex"
            style={{ position: 'absolute', bottom: 28, left: 0, right: 0, justifyContent: 'center' }}
          >
            <div style={{ position: 'relative' }}><TrustRow /></div>
          </div>
        </div>
      </div>
    </>
  );
}
