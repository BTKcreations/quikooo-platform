import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PrefetchLink from './components/PrefetchLink.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Skeleton from './components/Skeleton.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import ToastProvider from './components/Toast.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import { isRuralOrderEligible } from './api.js';


// React.lazy for instant navigation with zero lag
const AgentHome = React.lazy(() => import('./pages/AgentHome.jsx'));
const VendorsPage = React.lazy(() => import('./pages/VendorsPage.jsx'));
const DriversPage = React.lazy(() => import('./pages/DriversPage.jsx'));
const BatchPage = React.lazy(() => import('./pages/BatchPage.jsx'));
const EarningsPage = React.lazy(() => import('./pages/EarningsPage.jsx'));

const prefetchMap = {
  '/agent': () => import('./pages/AgentHome.jsx'),
  '/agent/vendors': () => import('./pages/VendorsPage.jsx'),
  '/agent/drivers': () => import('./pages/DriversPage.jsx'),
  '/agent/batch': () => import('./pages/BatchPage.jsx'),
  '/agent/earnings': () => import('./pages/EarningsPage.jsx'),
};

function SkeletonPage() {
  return (
    <div className="page-container" style={{ padding: '1.5rem' }}>
      <Skeleton width="45%" height="32px" style={{ marginBottom: '0.5rem' }} />
      <Skeleton width="70%" height="18px" style={{ marginBottom: '1.5rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Skeleton height="110px" borderRadius="0.75rem" />
        <Skeleton height="110px" borderRadius="0.75rem" />
        <Skeleton height="110px" borderRadius="0.75rem" />
        <Skeleton height="110px" borderRadius="0.75rem" />
      </div>
      <Skeleton height="240px" borderRadius="0.75rem" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [isWindowOpen, setIsWindowOpen] = useState(true);

  useEffect(() => {
    try {
      setIsWindowOpen(isRuralOrderEligible());
    } catch {
      setIsWindowOpen(true);
    }
  }, []);

  const isCurrent = (path) => {
    if (path === '/agent' && (location.pathname === '/' || location.pathname === '/agent')) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="app-viewport">
          <CommandPalette />
          <OfflineBanner />

        <div className="agent-shell">
          {/* Desktop Left Sidebar (>= 1024px) */}
          <aside className="desktop-sidebar">
            <PrefetchLink
              to="/agent"
              prefetch={prefetchMap['/agent']}
              className="sidebar-brand"
            >
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
              <div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.15rem', color: '#059669', lineHeight: 1.1 }}>
                  Quikooo
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600 }}>Zone Franchise</div>
              </div>
            </PrefetchLink>

            <button
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

            <div style={{ padding: '0.5rem 0.75rem', marginBottom: '0.75rem', background: '#F9FAFB', borderRadius: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 700, color: '#111827' }}>Mandya Rural</div>
              <div style={{ color: '#059669', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: isWindowOpen ? '#059669' : '#EF4444' }}></span>
                {isWindowOpen ? 'Ordering Open' : 'Cutoff Locked'}
              </div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <PrefetchLink
                to="/agent"
                prefetch={prefetchMap['/agent']}
                className={`sidebar-nav-item ${isCurrent('/agent') ? 'active' : ''}`}
              >
                <span>📊</span>
                <span>Dashboard</span>
              </PrefetchLink>

              <PrefetchLink
                to="/agent/vendors"
                prefetch={prefetchMap['/agent/vendors']}
                className={`sidebar-nav-item ${isCurrent('/agent/vendors') ? 'active' : ''}`}
              >
                <span>🏪</span>
                <span>Merchants</span>
              </PrefetchLink>

              <PrefetchLink
                to="/agent/drivers"
                prefetch={prefetchMap['/agent/drivers']}
                className={`sidebar-nav-item ${isCurrent('/agent/drivers') ? 'active' : ''}`}
              >
                <span>🛵</span>
                <span>Fleet Drivers</span>
              </PrefetchLink>

              <PrefetchLink
                to="/agent/batch"
                prefetch={prefetchMap['/agent/batch']}
                className={`sidebar-nav-item ${isCurrent('/agent/batch') ? 'active' : ''}`}
              >
                <span>📦</span>
                <span>Rural Batch</span>
              </PrefetchLink>

              <PrefetchLink
                to="/agent/earnings"
                prefetch={prefetchMap['/agent/earnings']}
                className={`sidebar-nav-item ${isCurrent('/agent/earnings') ? 'active' : ''}`}
              >
                <span>💰</span>
                <span>Earnings & Split</span>
              </PrefetchLink>
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="agent-main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Sticky Brand Header */}
            <header className="top-nav">
              <PrefetchLink to="/agent" prefetch={prefetchMap['/agent']} className="brand-title">
                <span>⚡ Quikooo</span>
                <span className="brand-pill">Zone Partner</span>
              </PrefetchLink>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('quikooo:open-command-palette'))}
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.3)',
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
                  aria-label="Open Ctrl+K Palette"
                >
                  <span>🔍</span>
                  <span>Ctrl+K</span>
                </button>
                <span className="zone-chip">
                  <span>🌾</span>
                  <span>Mandya Rural (ZN-RUR-01)</span>
                </span>

                <span
                  style={{
                    fontSize: '0.75rem',
                    backgroundColor: isWindowOpen ? 'rgba(255, 255, 255, 0.25)' : '#EF4444',
                    color: '#FFFFFF',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>{isWindowOpen ? '🟢' : '🔒'}</span>
                  <span>{isWindowOpen ? 'Cutoff 21:00 IST' : 'Cutoff Locked'}</span>
                </span>
              </div>
            </header>

            {/* Dynamic Route View with Suspense */}
            <main style={{ flex: 1 }}>
              <Suspense fallback={<SkeletonPage />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/agent" replace />} />
                  <Route path="/agent" element={<AgentHome />} />
                  <Route path="/agent/vendors" element={<VendorsPage />} />
                  <Route path="/agent/drivers" element={<DriversPage />} />
                  <Route path="/agent/batch" element={<BatchPage />} />
                  <Route path="/agent/earnings" element={<EarningsPage />} />
                  <Route path="*" element={<Navigate to="/agent" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>

          {/* Bottom Tab Navigation Bar (mobile & tablet < 1024px) */}
          <nav className="bottom-nav">
            <PrefetchLink
              to="/agent"
              prefetch={prefetchMap['/agent']}
              className={`nav-item ${isCurrent('/agent') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>📊</span>
              <span>Overview</span>
            </PrefetchLink>

            <PrefetchLink
              to="/agent/vendors"
              prefetch={prefetchMap['/agent/vendors']}
              className={`nav-item ${isCurrent('/agent/vendors') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>🏪</span>
              <span>Merchants</span>
            </PrefetchLink>

            <PrefetchLink
              to="/agent/drivers"
              prefetch={prefetchMap['/agent/drivers']}
              className={`nav-item ${isCurrent('/agent/drivers') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>🛵</span>
              <span>Drivers</span>
            </PrefetchLink>

            <PrefetchLink
              to="/agent/batch"
              prefetch={prefetchMap['/agent/batch']}
              className={`nav-item ${isCurrent('/agent/batch') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>📦</span>
              <span>Batch</span>
            </PrefetchLink>

            <PrefetchLink
              to="/agent/earnings"
              prefetch={prefetchMap['/agent/earnings']}
              className={`nav-item ${isCurrent('/agent/earnings') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>💰</span>
              <span>Earnings</span>
            </PrefetchLink>
          </nav>
        </div>
      </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}
