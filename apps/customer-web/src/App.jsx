import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import CustomerHome from './pages/CustomerHome.jsx';
import StorePage from './pages/StorePage.jsx';
import CartPage from './pages/CartPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { useCart } from './store/cart.js';
import './theme.css';

export default function App() {
  const location = useLocation();
  const cart = useCart();

  const isCurrent = (path) => {
    if (path === '/customer' && (location.pathname === '/' || location.pathname === '/customer')) {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-viewport">
      <div className="mobile-shell">
        {/* Sticky Brand Header */}
        <header className="top-nav">
          <Link to="/customer" className="brand-title">
            <span>⚡ Quikooo</span>
            <span className="brand-pill">10-15m</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              to="/cart"
              style={{
                color: '#FFFFFF',
                textDecoration: 'none',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '0.25rem',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>🛒</span>
              {cart.itemCount > 0 && (
                <span className="cart-count-badge" style={{ top: '-4px', right: '-8px' }}>
                  {cart.itemCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Dynamic Route View */}
        <main style={{ flex: 1 }}>
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
        </main>

        {/* Bottom Tab Navigation Bar */}
        <nav className="bottom-nav">
          <Link
            to="/customer"
            className={`nav-item ${isCurrent('/customer') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>🏠</span>
            <span>Stores</span>
          </Link>

          <Link
            to="/cart"
            className={`nav-item ${isCurrent('/cart') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>🛒</span>
            <span>Cart</span>
            {cart.itemCount > 0 && (
              <span className="cart-count-badge">
                {cart.itemCount}
              </span>
            )}
          </Link>

          <Link
            to="/orders"
            className={`nav-item ${isCurrent('/orders') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>📦</span>
            <span>Orders</span>
          </Link>

          <Link
            to="/login"
            className={`nav-item ${isCurrent('/login') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>👤</span>
            <span>Account</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
