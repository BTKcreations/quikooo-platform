import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import PrefetchLink from './components/PrefetchLink.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { SkeletonPage } from './components/Skeleton.jsx';

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
        <div className="admin-shell">
          {/* Sticky Header with Brand and Live Status */}
          <header className="top-nav">
            <Link to="/admin" className="brand-title">
              <span>⚡ QUIKOOO</span>
              <span className="brand-pill">Admin Console</span>
            </Link>

            <div className="admin-header-actions">
              <span className="live-badge">
                <span className="live-indicator-dot" />
                <span>Nominal (Port 3004)</span>
              </span>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Super Admin
              </span>
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
                  <Route path="/" element={<Navigate to="/admin" replace />} />
                  <Route path="/admin" element={<Overview />} />
                  <Route path="/admin/overview" element={<Overview />} />
                  <Route path="/admin/zones" element={<ZonesPage />} />
                  <Route path="/admin/finance" element={<FinancePage />} />
                  <Route path="/admin/settlements" element={<SettlementsPage />} />
                  <Route path="/admin/users" element={<UsersPage />} />
                  <Route path="/admin/audit" element={<AuditPage />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
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
