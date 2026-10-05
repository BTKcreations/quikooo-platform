import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PrefetchLink from './components/PrefetchLink.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import { SkeletonPage } from './components/Skeleton.jsx';
import './theme.css';

// Convert route pages to React.lazy() for instant zero-lag navigation
const MerchantHome = lazy(() => import('./pages/MerchantHome.jsx'));
const OrdersBoard = lazy(() => import('./pages/OrdersBoard.jsx'));
const PayoutPage = lazy(() => import('./pages/PayoutPage.jsx'));

export default function App() {
  const location = useLocation();

  const isCurrent = (path) => {
    if (path === '/merchant' && (location.pathname === '/' || location.pathname === '/merchant')) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <div className="app-viewport">
      {/* Non-blocking Offline Banner */}
      <OfflineBanner />

      <div className="mobile-shell">
        {/* Desktop Sidebar (lg >= 1024px) */}
        <aside className="desktop-sidebar" aria-label="Merchant desktop sidebar">
          <PrefetchLink
            to="/merchant"
            prefetch={() => import('./pages/MerchantHome.jsx')}
            className="sidebar-brand"
          >
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <span style={{ fontFamily: 'var(--font-family-display)', fontWeight: 800, fontSize: '1.2rem', color: '#059669' }}>
              Merchant POS
            </span>
            <span className="brand-pill" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
              Kitchen
            </span>
          </PrefetchLink>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <PrefetchLink
              to="/merchant"
              prefetch={() => import('./pages/MerchantHome.jsx')}
              className={`sidebar-nav-item ${isCurrent('/merchant') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>📊</span>
              <span>Kitchen Dashboard</span>
            </PrefetchLink>

            <PrefetchLink
              to="/merchant/orders"
              prefetch={() => import('./pages/OrdersBoard.jsx')}
              className={`sidebar-nav-item ${isCurrent('/merchant/orders') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>👨‍🍳</span>
              <span>Orders POS Board</span>
            </PrefetchLink>

            <PrefetchLink
              to="/merchant/payout"
              prefetch={() => import('./pages/PayoutPage.jsx')}
              className={`sidebar-nav-item ${isCurrent('/merchant/payout') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.25rem' }}>💰</span>
              <span>Settlement (90%)</span>
            </PrefetchLink>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="mobile-main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <header className="top-nav">
            <PrefetchLink
              to="/merchant"
              prefetch={() => import('./pages/MerchantHome.jsx')}
              className="brand-title"
            >
              <span>⚡ Quikooo</span>
              <span className="brand-pill">Merchant POS</span>
            </PrefetchLink>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                }}
              >
                🏪 Kitchen Live
              </span>
            </div>
          </header>

          {/* Dynamic Route View with Suspense & Skeleton Layout Fallback */}
          <main style={{ flex: 1 }}>
            <ErrorBoundary>
              <Suspense fallback={<SkeletonPage />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/merchant" replace />} />
                  <Route path="/merchant" element={<MerchantHome />} />
                  <Route path="/merchant/orders" element={<OrdersBoard />} />
                  <Route path="/merchant/payout" element={<PayoutPage />} />
                  <Route path="*" element={<Navigate to="/merchant" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        {/* Bottom Tab Navigation Bar (Mobile / Tablet) */}
        <nav className="bottom-nav" aria-label="Merchant bottom navigation">
          <PrefetchLink
            to="/merchant"
            prefetch={() => import('./pages/MerchantHome.jsx')}
            className={`nav-item ${isCurrent('/merchant') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>📊</span>
            <span>Dashboard</span>
          </PrefetchLink>

          <PrefetchLink
            to="/merchant/orders"
            prefetch={() => import('./pages/OrdersBoard.jsx')}
            className={`nav-item ${isCurrent('/merchant/orders') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>👨‍🍳</span>
            <span>Orders POS</span>
          </PrefetchLink>

          <PrefetchLink
            to="/merchant/payout"
            prefetch={() => import('./pages/PayoutPage.jsx')}
            className={`nav-item ${isCurrent('/merchant/payout') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>💰</span>
            <span>Settlement</span>
          </PrefetchLink>
        </nav>
      </div>
    </div>
  );
}
