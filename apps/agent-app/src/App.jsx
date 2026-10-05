import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import AgentHome from './pages/AgentHome.jsx';
import VendorsPage from './pages/VendorsPage.jsx';
import DriversPage from './pages/DriversPage.jsx';
import BatchPage from './pages/BatchPage.jsx';
import EarningsPage from './pages/EarningsPage.jsx';
import { isRuralOrderEligible } from './api.js';

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
    <div className="app-viewport">
      <div className="agent-shell">
        {/* Sticky Brand Header */}
        <header className="top-nav">
          <Link to="/agent" className="brand-title">
            <span>⚡ Quikooo</span>
            <span className="brand-pill">Zone Partner</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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

        {/* Dynamic Route View */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/agent" replace />} />
            <Route path="/agent" element={<AgentHome />} />
            <Route path="/agent/vendors" element={<VendorsPage />} />
            <Route path="/agent/drivers" element={<DriversPage />} />
            <Route path="/agent/batch" element={<BatchPage />} />
            <Route path="/agent/earnings" element={<EarningsPage />} />
            <Route path="*" element={<Navigate to="/agent" replace />} />
          </Routes>
        </main>

        {/* Bottom Tab Navigation Bar */}
        <nav className="bottom-nav">
          <Link
            to="/agent"
            className={`nav-item ${isCurrent('/agent') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.25rem' }}>📊</span>
            <span>Overview</span>
          </Link>

          <Link
            to="/agent/vendors"
            className={`nav-item ${isCurrent('/agent/vendors') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.25rem' }}>🏪</span>
            <span>Merchants</span>
          </Link>

          <Link
            to="/agent/drivers"
            className={`nav-item ${isCurrent('/agent/drivers') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.25rem' }}>🛵</span>
            <span>Drivers</span>
          </Link>

          <Link
            to="/agent/batch"
            className={`nav-item ${isCurrent('/agent/batch') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.25rem' }}>📦</span>
            <span>Rural Batch</span>
          </Link>

          <Link
            to="/agent/earnings"
            className={`nav-item ${isCurrent('/agent/earnings') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.25rem' }}>💰</span>
            <span>Earnings</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
