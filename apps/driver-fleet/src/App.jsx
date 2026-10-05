import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PrefetchLink from './components/PrefetchLink.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import { SkeletonPage } from './components/Skeleton.jsx';
import ToastProvider from './components/Toast.jsx';
import './theme.css';

// Convert route pages to React.lazy() for instant zero-lag navigation
const TasksPage = lazy(() => import('./pages/TasksPage.jsx'));
const DutyPage = lazy(() => import('./pages/DutyPage.jsx'));
const PayoutPage = lazy(() => import('./pages/PayoutPage.jsx'));

export default function App() {
  const location = useLocation();

  const isCurrent = (path) => {
    if (path === '/driver/tasks' && (location.pathname === '/' || location.pathname === '/driver' || location.pathname === '/driver/tasks')) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <ToastProvider>
      <div className="app-viewport">
        {/* Non-blocking Offline Banner */}
        <OfflineBanner />

      <div className="mobile-shell">
        {/* Desktop Sidebar (lg >= 1024px) */}
        <aside className="desktop-sidebar" aria-label="Rider desktop sidebar">
          <PrefetchLink
            to="/driver/tasks"
            prefetch={() => import('./pages/TasksPage.jsx')}
            className="sidebar-brand"
          >
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <span style={{ fontFamily: 'var(--font-family-display)', fontWeight: 800, fontSize: '1.2rem', color: '#059669' }}>
              Rider Cockpit
            </span>
            <span className="brand-pill" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
              Fleet
            </span>
          </PrefetchLink>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <PrefetchLink
              to="/driver/tasks"
              prefetch={() => import('./pages/TasksPage.jsx')}
              className={`sidebar-nav-item ${isCurrent('/driver/tasks') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>🛵</span>
              <span>Active Tasks</span>
            </PrefetchLink>

            <PrefetchLink
              to="/driver/duty"
              prefetch={() => import('./pages/DutyPage.jsx')}
              className={`sidebar-nav-item ${isCurrent('/driver/duty') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>⏱️</span>
              <span>Duty & Shifts</span>
            </PrefetchLink>

            <PrefetchLink
              to="/driver/payout"
              prefetch={() => import('./pages/PayoutPage.jsx')}
              className={`sidebar-nav-item ${isCurrent('/driver/payout') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>💵</span>
              <span>Earnings (₹25 * n)</span>
            </PrefetchLink>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="mobile-main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <header className="top-nav">
            <PrefetchLink
              to="/driver/tasks"
              prefetch={() => import('./pages/TasksPage.jsx')}
              className="brand-title"
            >
              <span>⚡ Quikooo</span>
              <span className="brand-pill">Rider Cockpit</span>
            </PrefetchLink>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PrefetchLink
                to="/driver/duty"
                prefetch={() => import('./pages/DutyPage.jsx')}
                style={{
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  color: '#FFFFFF',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  minHeight: '36px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                🟢 ON DUTY
              </PrefetchLink>
            </div>
          </header>

          {/* Dynamic Route View with Suspense & Skeleton Layout Fallback */}
          <main style={{ flex: 1 }}>
            <ErrorBoundary>
              <Suspense fallback={<SkeletonPage />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/driver/tasks" replace />} />
                  <Route path="/driver" element={<Navigate to="/driver/tasks" replace />} />
                  <Route path="/driver/tasks" element={<TasksPage />} />
                  <Route path="/driver/duty" element={<DutyPage />} />
                  <Route path="/driver/payout" element={<PayoutPage />} />
                  <Route path="*" element={<Navigate to="/driver/tasks" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        {/* Bottom Tab Navigation Bar (Mobile / Tablet) */}
        <nav className="bottom-nav" aria-label="Rider bottom navigation">
          <PrefetchLink
            to="/driver/tasks"
            prefetch={() => import('./pages/TasksPage.jsx')}
            className={`nav-item ${isCurrent('/driver/tasks') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>🛵</span>
            <span>Tasks</span>
          </PrefetchLink>

          <PrefetchLink
            to="/driver/duty"
            prefetch={() => import('./pages/DutyPage.jsx')}
            className={`nav-item ${isCurrent('/driver/duty') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>⏱️</span>
            <span>Duty</span>
          </PrefetchLink>

          <PrefetchLink
            to="/driver/payout"
            prefetch={() => import('./pages/PayoutPage.jsx')}
            className={`nav-item ${isCurrent('/driver/payout') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>💵</span>
            <span>Earnings</span>
          </PrefetchLink>
        </nav>
      </div>
    </div>
  </ToastProvider>
  );
}
