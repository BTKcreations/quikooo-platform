import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import TasksPage from './pages/TasksPage.jsx';
import DutyPage from './pages/DutyPage.jsx';
import PayoutPage from './pages/PayoutPage.jsx';

export default function App() {
  const location = useLocation();

  const isCurrent = (path) => {
    if (path === '/driver' && (location.pathname === '/' || location.pathname === '/driver')) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <div className="app-viewport">
      <div className="mobile-shell">
        {/* Sticky Header */}
        <header className="top-nav">
          <Link to="/driver" className="brand-title">
            <span>⚡ Quikooo</span>
            <span className="brand-pill">Rider Cockpit</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link
              to="/driver/duty"
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'rgba(255,255,255,0.25)',
                color: '#FFFFFF',
                padding: '0.2rem 0.5rem',
                borderRadius: '9999px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              🟢 ON DUTY
            </Link>
          </div>
        </header>

        {/* Dynamic Route View */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/driver/tasks" replace />} />
            <Route path="/driver" element={<Navigate to="/driver/tasks" replace />} />
            <Route path="/driver/tasks" element={<TasksPage />} />
            <Route path="/driver/duty" element={<DutyPage />} />
            <Route path="/driver/payout" element={<PayoutPage />} />
            <Route path="*" element={<Navigate to="/driver/tasks" replace />} />
          </Routes>
        </main>

        {/* Bottom Tab Navigation Bar */}
        <nav className="bottom-nav">
          <Link
            to="/driver/tasks"
            className={`nav-item ${isCurrent('/driver/tasks') || isCurrent('/driver') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>🛵</span>
            <span>Tasks</span>
          </Link>

          <Link
            to="/driver/duty"
            className={`nav-item ${isCurrent('/driver/duty') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>⏱️</span>
            <span>Duty</span>
          </Link>

          <Link
            to="/driver/payout"
            className={`nav-item ${isCurrent('/driver/payout') ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>💵</span>
            <span>Earnings</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
