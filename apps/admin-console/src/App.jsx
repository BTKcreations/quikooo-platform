import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import PrefetchLink from './components/PrefetchLink.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { SkeletonPage } from './components/Skeleton.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { getToken, getUser, logout } from './lib/auth.js';

// Dynamic Page Lazy Loading for Performance
const Overview = lazy(() => import('./pages/Overview.jsx'));
const ZonesPage = lazy(() => import('./pages/ZonesPage.jsx'));
const FinancePage = lazy(() => import('./pages/FinancePage.jsx'));
const SettlementsPage = lazy(() => import('./pages/SettlementsPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));
const AuditPage = lazy(() => import('./pages/AuditPage.jsx'));

// Dynamic import prefetchers
const prefetchOverview = () => import('./pages/Overview.jsx');
const prefetchZones = () => import('./pages/ZonesPage.jsx');
const prefetchFinance = () => import('./pages/FinancePage.jsx');
const prefetchSettlements = () => import('./pages/SettlementsPage.jsx');
const prefetchUsers = () => import('./pages/UsersPage.jsx');
const prefetchAudit = () => import('./pages/AuditPage.jsx');

export default function App() {
  const location = useLocation();
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(getToken());
      setUser(getUser());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('quikooo:auth-changed', handleAuthChange);
      window.addEventListener('storage', handleAuthChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('quikooo:auth-changed', handleAuthChange);
        window.removeEventListener('storage', handleAuthChange);
      }
    };
  }, []);

  const handleLogout = () => {
    logout();
    setToken(null);
    setUser(null);
  };

  // If no active session, render Login Gate (all admin routes protected)
  if (!token) {
    return (
      <ToastProvider>
        <LoginPage onLoginSuccess={() => { setToken(getToken()); setUser(getUser()); }} />
      </ToastProvider>
    );
  }

  const isCurrent = (path) => {
    if (path === '/admin/overview') {
      return (
        location.pathname === '/admin' ||
        location.pathname === '/admin/overview' ||
        location.pathname === '/'
      );
    }
    return location.pathname === path;
  };

  const navItems = [
    {
      to: '/admin/overview',
      label: 'Overview & KPIs',
      icon: '📊',
      prefetch: prefetchOverview,
    },
    {
      to: '/admin/zones',
      label: 'Zones & Cutoffs',
      icon: '🗺️',
      prefetch: prefetchZones,
    },
    {
      to: '/admin/finance',
      label: 'Finance & Ledger',
      icon: '⚖️',
      prefetch: prefetchFinance,
    },
    {
      to: '/admin/settlements',
      label: 'Settlements',
      icon: '💸',
      prefetch: prefetchSettlements,
    },
    {
      to: '/admin/users',
      label: 'Users & RBAC',
      icon: '👥',
      prefetch: prefetchUsers,
    },
    {
      to: '/admin/audit',
      label: 'Audit Trail',
      icon: '📜',
      prefetch: prefetchAudit,
    },
  ];

  return (
    <ToastProvider>
      <div className="app-viewport">
        <CommandPalette />
        <div className="admin-shell">
          {/* Sticky Header with Brand and Live Status */}
          <header className="top-nav">
            <Link to="/admin" className="brand-title">
              <span>⚡ QUIKOOO</span>
              <span className="brand-pill">Admin Console</span>
            </Link>

            <div className="admin-header-actions">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('quikooo:open-command-palette'))}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  borderRadius: '9999px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
                aria-label="Open command palette (Ctrl+K)"
              >
                <span>🔍</span>
                <span>Ctrl+K</span>
              </button>
              <span className="live-badge">
                <span className="live-indicator-dot" />
                <span>Nominal (Port 3004)</span>
              </span>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                {user?.fullName || user?.email || 'Super Admin'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
                aria-label="Sign out"
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          {/* Sub-bar / Tablet Tab Bar */}
          <nav className="sub-nav" aria-label="Tablet navigation">
            {navItems.map((item) => (
              <PrefetchLink
                key={item.to}
                to={item.to}
                prefetch={item.prefetch}
                className={`nav-tab ${isCurrent(item.to) ? 'active' : ''}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </PrefetchLink>
            ))}
          </nav>

          {/* Main Layout Container (Sidebar on lg, Stacked on Mobile) */}
          <div className="admin-layout-container">
            {/* Desktop Left Sidebar (lg screens) */}
            <aside className="admin-sidebar" aria-label="Desktop sidebar">
              <div style={{ padding: '0.5rem 0.5rem 1rem 0.5rem', borderBottom: '1px solid var(--color-surface-subtle, #F3F4F0)', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>
                  Platform Navigation
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('quikooo:open-command-palette'))}
                style={{
                  margin: '0.25rem 0.5rem 0.75rem 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.75rem',
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  color: '#4B5563',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                aria-label="Open command palette"
              >
                <span>🔍 Search routes...</span>
                <kbd style={{ fontSize: '0.7rem', background: '#E5E7EB', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Ctrl+K</kbd>
              </button>

              {navItems.map((item) => (
                <PrefetchLink
                  key={item.to}
                  to={item.to}
                  prefetch={item.prefetch}
                  className={`sidebar-nav-item ${isCurrent(item.to) ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '1.15rem' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </PrefetchLink>
              ))}

              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-surface-subtle, #F3F4F0)' }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem',
                    marginBottom: '0.75rem',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '0.5rem',
                    color: '#B91C1C',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Quikooo Core v1.0.0<br />
                  Tier-2/3 Hyperlocal System
                </div>
              </div>
            </aside>

            {/* Dynamic Route View with Suspense */}
            <main className="admin-main-content">
              <Suspense fallback={<SkeletonPage />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/admin/overview" replace />} />
                  <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
                  <Route path="/admin/login" element={<Navigate to="/admin/overview" replace />} />
                  <Route path="/admin/overview" element={<Overview />} />
                  <Route path="/admin/zones" element={<ZonesPage />} />
                  <Route path="/admin/finance" element={<FinancePage />} />
                  <Route path="/admin/settlements" element={<SettlementsPage />} />
                  <Route path="/admin/users" element={<UsersPage />} />
                  <Route path="/admin/audit" element={<AuditPage />} />
                  <Route path="*" element={<Navigate to="/admin/overview" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>

          {/* Mobile Bottom Navigation Bar (Fixed for mobile screens) */}
          <nav className="admin-bottom-nav" aria-label="Mobile bottom navigation">
            {navItems.map((item) => (
              <PrefetchLink
                key={item.to}
                to={item.to}
                prefetch={item.prefetch}
                className={`bottom-nav-item ${isCurrent(item.to) ? 'active' : ''}`}
              >
                <span className="bottom-nav-icon">{item.icon}</span>
                <span>{item.label.split(' ')[0]}</span>
              </PrefetchLink>
            ))}
          </nav>
        </div>
      </div>
    </ToastProvider>
  );
}
