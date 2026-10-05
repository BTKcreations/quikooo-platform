import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Overview from './pages/Overview.jsx';
import ZonesPage from './pages/ZonesPage.jsx';
import FinancePage from './pages/FinancePage.jsx';
import SettlementsPage from './pages/SettlementsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import AuditPage from './pages/AuditPage.jsx';

export default function App() {
  const location = useLocation();

  const isCurrent = (path) => {
    if (path === '/admin/overview') {
      return location.pathname === '/admin' || location.pathname === '/admin/overview' || location.pathname === '/';
    }
    return location.pathname === path;
  };

  return (
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
              <span>Platform Operations Nominal</span>
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              Super Admin | Port 3004
            </span>
          </div>
        </header>

        {/* Admin Navigation Sub-Bar / Tab Bar */}
        <nav className="sub-nav">
          <Link
            to="/admin/overview"
            className={`nav-tab ${isCurrent('/admin/overview') ? 'active' : ''}`}
          >
            <span>📊</span>
            <span>Overview & KPIs</span>
          </Link>

          <Link
            to="/admin/zones"
            className={`nav-tab ${isCurrent('/admin/zones') ? 'active' : ''}`}
          >
            <span>🗺️</span>
            <span>Zones & Cutoffs</span>
          </Link>

          <Link
            to="/admin/finance"
            className={`nav-tab ${isCurrent('/admin/finance') ? 'active' : ''}`}
          >
            <span>⚖️</span>
            <span>Finance & Ledger</span>
          </Link>

          <Link
            to="/admin/settlements"
            className={`nav-tab ${isCurrent('/admin/settlements') ? 'active' : ''}`}
          >
            <span>💸</span>
            <span>Settlements</span>
          </Link>

          <Link
            to="/admin/users"
            className={`nav-tab ${isCurrent('/admin/users') ? 'active' : ''}`}
          >
            <span>👥</span>
            <span>Users & RBAC</span>
          </Link>

          <Link
            to="/admin/audit"
            className={`nav-tab ${isCurrent('/admin/audit') ? 'active' : ''}`}
          >
            <span>📜</span>
            <span>Audit Trail</span>
          </Link>
        </nav>

        {/* Dynamic Route View */}
        <main style={{ flex: 1 }}>
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
        </main>
      </div>
    </div>
  );
}
