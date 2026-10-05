import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await loginUser({
        email: phoneOrEmail || 'customer@quikooo.com',
        password: password || 'Password123!',
      });
      navigate('/customer');
    } catch (err) {
      console.warn('Backend login unavailable, using simulated local session:', err.message);
      // Simulated session
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('quikooo_token', 'mock-jwt-customer-token');
        localStorage.setItem(
          'quikooo_user',
          JSON.stringify({
            id: 'mock-customer-1',
            name: 'Demo Customer',
            role: 'CUSTOMER',
            phone: phoneOrEmail || '+91 9876543210',
          })
        );
      }
      navigate('/customer');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickLogin(role = 'CUSTOMER') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('quikooo_token', `mock-jwt-${role.toLowerCase()}-token`);
      localStorage.setItem(
        'quikooo_user',
        JSON.stringify({
          id: `mock-${role.toLowerCase()}-1`,
          name: `${role} Demo User`,
          role,
          phone: '+91 9876543210',
        })
      );
    }
    navigate('/customer');
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '50%',
          background: '#059669',
          color: '#FFFFFF',
          fontSize: '1.75rem',
          marginBottom: '0.75rem',
        }}>
          ⚡
        </div>
        <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem' }}>
          Welcome to Quikooo
        </h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
          Instant Groceries & Fresh Meal Delivery in 10–15 Minutes
        </p>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.5rem', borderRadius: '0.375rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Mobile Number or Email
            </label>
            <input
              type="text"
              className="input"
              placeholder="+91 98765 43210 or email@domain.com"
              value={phoneOrEmail}
              onChange={(e) => setPhoneOrEmail(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Password
            </label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading}
            style={{ padding: '0.75rem', marginBottom: '0.75rem' }}
          >
            {loading ? 'Signing in...' : 'Sign In to Quikooo'}
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '1rem 0 0.5rem 0', fontSize: '0.75rem', color: '#9CA3AF' }}>
          ── OR QUICK 1-CLICK DEMO ──
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary btn-block btn-sm"
            onClick={() => handleQuickLogin('CUSTOMER')}
          >
            ⚡ Continue as Demo Customer
          </button>
        </div>
      </div>
    </div>
  );
}
