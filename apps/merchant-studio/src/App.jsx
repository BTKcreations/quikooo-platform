import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import MerchantHome from './pages/MerchantHome.jsx';
import OrdersBoard from './pages/OrdersBoard.jsx';
import PayoutPage from './pages/PayoutPage.jsx';

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
      <div className="mobile-shell">
        {/* Sticky Brand Header */}
        <header className="top-nav">
          <Link to="/merchant" className="brand-title">
            <span>⚡ Quikooo</span>
            <span className="brand-pill">Merchant POS</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              🏪 Kitchen Live
            </span>
          </div>
        </header>

        {/* Dynamic Route View */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/merchant" replace />} />
            <Route path="/merchant" element={<MerchantHome />} />
            <Route path="/merchant/orders" element={<OrdersBoard />} />
            <Route path="/merchant/payout" element={<PayoutPage />} />
            <Route path="*" element={<Navigate to="/merchant" replace />} />
          </Routes>
        </main>

        {/* Bottom Tab Navigation Bar */}
        <nav className="bottom-nav">
          <Link
            to="/merchant"
            className={`nav-item ${isCurrent('/merchant') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>📊</span>
            <span>Dashboard</span>
          </Link>

          <Link
            to="/merchant/orders"
            className={`nav-item ${isCurrent('/merchant/orders') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>👨‍🍳</span>
            <span>Orders POS</span>
          </Link>

          <Link
            to="/merchant/payout"
            className={`nav-item ${isCurrent('/merchant/payout') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>💰</span>
            <span>Settlement</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
