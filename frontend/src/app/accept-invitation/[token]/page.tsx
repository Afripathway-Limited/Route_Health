'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Bike } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';

export default function AcceptInvitationPage() {
  const { token }  = useParams<{ token: string }>();
  const router     = useRouter();

  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8)              { setError('Password must be at least 8 characters'); return; }
    if (password !== password2)           { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await api.post('/auth/accept-invitation', { token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, background: '#f9fafb',
    border: '1.5px solid #e5e7eb', borderRadius: 10,
    fontSize: 14, color: '#111827', outline: 'none',
    padding: '0 44px 0 14px', boxSizing: 'border-box',
  };

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6fb' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={32} color="#059669" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Account Activated!</h2>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px' }}>Welcome to RouteHealth.</p>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6fb', padding: '20px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, background: '#4F6EF7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bike size={20} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>RouteHealth</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Rider Invitation</p>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Set Your Password</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 28px' }}>
          Choose a password to activate your rider account and start receiving routes.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                style={inputStyle}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Confirm Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                placeholder="Repeat password"
                required
                style={{ ...inputStyle, paddingRight: 14 }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px' }}>
              <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 44, background: loading ? '#9ca3af' : '#4F6EF7', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
            }}>
            {loading ? 'Activating…' : 'Activate My Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
