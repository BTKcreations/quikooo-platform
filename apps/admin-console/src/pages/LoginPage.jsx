import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/auth.js';
import { notifyToast } from '../api.js';

export default function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      const msg = 'Please enter your email or mobile and password';
      setError(msg);
      notifyToast(msg, 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(cleanId, password);
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess();
      }
      navigate('/admin/overview', { replace: true });
    } catch (err) {
      const errMsg = err.message || 'Login failed. Please check your credentials.';
      setError(errMsg);
      notifyToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        padding: '1.5rem',
        fontFamily: 'var(--font-family-body, "Plus Jakarta Sans", sans-serif)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '1rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        {/* Brand Accent Bar */}
        <div style={{ height: '6px', background: '#059669', width: '100%' }} />

        <div style={{ padding: '2.5rem 2rem 2rem 2rem' }}>
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(5, 150, 105, 0.08)',
                color: '#059669',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                marginBottom: '1rem',
              }}
            >
              <span>⚡ QUIKOOO</span>
              <span>•</span>
              <span>ADMIN CONSOLE</span>
            </div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#111827',
                margin: '0 0 0.5rem 0',
                letterSpacing: '-0.02em',
              }}
            >
              Sign In to Admin Portal
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
              Enter your administrative credentials to manage operations, ledger & zones.
            </p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                color: '#991B1B',
                fontSize: '0.875rem',
              }}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="identifier"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '0.5rem',
                }}
              >
                Email or Mobile Number
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                autoFocus
                placeholder="admin@quikooo.com or +91 98450 11001"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1.5px solid #D1D5DB',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#059669';
                  e.target.style.boxShadow = '0 0 0 3px rgba(5, 150, 105, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <label
                  htmlFor="password"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#059669',
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1.5px solid #D1D5DB',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#059669';
                  e.target.style.boxShadow = '0 0 0 3px rgba(5, 150, 105, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                transition: 'background-color 0.15s, transform 0.05s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.25)',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#047857';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#059669';
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#FFFFFF',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #F3F4F6',
              textAlign: 'center',
              fontSize: '0.775rem',
              color: '#9CA3AF',
              lineHeight: 1.5,
            }}
          >
            <div>Secured by Quikooo Platform RBAC &amp; JWT Engine</div>
            <div style={{ marginTop: '0.25rem' }}>
              Provision accounts via CLI: <code style={{ background: '#F3F4F6', color: '#374151', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>npm run admin:create</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
