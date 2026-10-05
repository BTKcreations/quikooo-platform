import React, { Suspense, lazy, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PrefetchLink from './components/PrefetchLink.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import { SkeletonPage } from './components/Skeleton.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import SupportModal from './components/SupportModal.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { useCart } from './store/cart.js';
import './theme.css';

// 1. Convert all route pages to React.lazy() for instant zero-lag navigation
const CustomerHome = lazy(() => import('./pages/CustomerHome.jsx'));
const StorePage = lazy(() => import('./pages/StorePage.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));

export default function App() {
  const location = useLocation();
  const cart = useCart();
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const isCurrent = (path) => {
    if (path === '/customer' && (location.pathname === '/' || location.pathname === '/customer')) {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <ToastProvider>
      <div className="app-viewport">
        {/* Offline Banner: Slim, non-blocking, never blocks nav */}
        <OfflineBanner />

        <div className="mobile-shell">
          {/* Desktop Left Sidebar (visible on lg screens >= 1024px) */}
          <aside className="desktop-sidebar" aria-label="Desktop navigation sidebar">
            <PrefetchLink
              to="/customer"
              prefetch={() => import('./pages/CustomerHome.jsx')}
              className="sidebar-brand"
            >
              <span style={{ fontSize: '1.4rem' }}>⚡</span>
              <span style={{ fontFamily: 'var(--font-family-display)', fontWeight: 800, fontSize: '1.25rem', color: '#059669' }}>
                Quikooo
              </span>
              <span className="brand-pill" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                10-15m
              </span>
            </PrefetchLink>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <PrefetchLink
                to="/customer"
                prefetch={() => import('./pages/CustomerHome.jsx')}
                className={`sidebar-nav-item ${isCurrent('/customer') ? 'active' : ''}`}
              >
                <span style={{ fontSize: '1.25rem' }}>🏠</span>
                <span>Stores & Food</span>
              </PrefetchLink>

              <PrefetchLink
                to="/cart"
                prefetch={() => import('./pages/CartPage.jsx')}
                className={`sidebar-nav-item ${isCurrent('/cart') ? 'active' : ''}`}
              >
                <span style={{ fontSize: '1.25rem' }}>🛒</span>
                <span>My Cart ({cart.itemCount})</span>
              </PrefetchLink>

              <PrefetchLink
                to="/orders"
                prefetch={() => import('./pages/OrdersPage.jsx')}
                className={`sidebar-nav-item ${isCurrent('/orders') ? 'active' : ''}`}
              >
                <span style={{ fontSize: '1.25rem' }}>📦</span>
                <span>Live Orders</span>
              </PrefetchLink>

              <PrefetchLink
                to="/login"
                prefetch={() => import('./pages/LoginPage.jsx')}
                className={`sidebar-nav-item ${isCurrent('/login') ? 'active' : ''}`}
              >
                <span style={{ fontSize: '1.25rem' }}>👤</span>
                <span>Account</span>
              </PrefetchLink>
            </nav>

            <div style={{ marginTop: 'auto', borderTop: '1px solid #F3F4F0', paddingTop: '1rem' }}>
              <button
                onClick={() => setIsSupportOpen(true)}
                className="btn-secondary btn-block"
                style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <span>🎧</span>
                <span>24/7 Support</span>
              </button>
            </div>
          </aside>

          {/* Main content wrapper */}
          <div className="mobile-main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Top Navigation Bar */}
            <header className="top-nav">
              <PrefetchLink
                to="/customer"
                prefetch={() => import('./pages/CustomerHome.jsx')}
                className="brand-title"
              >
                <span>⚡ Quikooo</span>
                <span className="brand-pill">10-15m</span>
              </PrefetchLink>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Persistent Support Entry */}
                <button
                  onClick={() => setIsSupportOpen(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '9999px',
                    color: '#FFFFFF',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    minHeight: '44px',
                  }}
                  aria-label="Open support and help modal"
                >
                  <span>🎧</span>
                  <span>Help</span>
                </button>

                {/* Cart Drawer Trigger */}
                <button
                  onClick={() => setIsCartDrawerOpen(true)}
                  style={{
                    color: '#FFFFFF',
                    background: 'none',
                    border: 'none',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    minHeight: '44px',
                    minWidth: '44px',
                  }}
                  aria-label={`Open shopping cart drawer with ${cart.itemCount} items`}
                >
                  <span style={{ fontSize: '1.35rem' }}>🛒</span>
                  {cart.itemCount > 0 && (
                    <span className="cart-count-badge" style={{ top: '2px', right: '0px' }}>
                      {cart.itemCount}
                    </span>
                  )}
                </button>
              </div>
            </header>

            {/* Dynamic Route View with Suspense & Skeleton Layout Fallback */}
            <main style={{ flex: 1 }}>
              <ErrorBoundary>
                <Suspense fallback={<SkeletonPage />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/customer" replace />} />
                    <Route path="/customer" element={<CustomerHome />} />
                    <Route path="/store/:id" element={<StorePage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/orders/:id" element={<OrdersPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/customer" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>

          {/* Bottom Tab Navigation Bar (Mobile / Tablet) */}
          <nav className="bottom-nav" aria-label="Mobile bottom navigation">
            <PrefetchLink
              to="/customer"
              prefetch={() => import('./pages/CustomerHome.jsx')}
              className={`nav-item ${isCurrent('/customer') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.2rem' }}>🏠</span>
              <span>Stores</span>
            </PrefetchLink>

            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className={`nav-item ${isCurrent('/cart') ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label={`Open Cart (${cart.itemCount} items)`}
            >
              <span style={{ fontSize: '1.2rem' }}>🛒</span>
              <span>Cart</span>
              {cart.itemCount > 0 && (
                <span className="cart-count-badge">
                  {cart.itemCount}
                </span>
              )}
            </button>

            <PrefetchLink
              to="/orders"
              prefetch={() => import('./pages/OrdersPage.jsx')}
              className={`nav-item ${isCurrent('/orders') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.2rem' }}>📦</span>
              <span>Orders</span>
            </PrefetchLink>

            <PrefetchLink
              to="/login"
              prefetch={() => import('./pages/LoginPage.jsx')}
              className={`nav-item ${isCurrent('/login') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.2rem' }}>👤</span>
              <span>Account</span>
            </PrefetchLink>
          </nav>

          {/* Slide-Over Cart Drawer */}
          <CartDrawer
            isOpen={isCartDrawerOpen}
            onClose={() => setIsCartDrawerOpen(false)}
          />

          {/* Persistent Support Modal */}
          <SupportModal
            isOpen={isSupportOpen}
            onClose={() => setIsSupportOpen(false)}
          />
        </div>
      </div>
    </ToastProvider>
  );
}
