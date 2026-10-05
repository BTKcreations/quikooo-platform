import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const DEFAULT_COMMANDS = [
  {
    id: 'cmd-agent-home',
    label: 'Zone Franchise Dashboard',
    subtitle: 'Mandya rural territory overview, active merchants & orders',
    icon: '📊',
    path: '/agent',
    keywords: ['dashboard', 'home', 'zone', 'mandya', 'franchise', 'kpi'],
  },
  {
    id: 'cmd-agent-vendors',
    label: 'Merchants & Onboarding',
    subtitle: 'Manage local kitchens, grocers & product catalog compliance',
    icon: '🏪',
    path: '/agent/vendors',
    keywords: ['merchants', 'vendors', 'stores', 'kitchens', 'sellers', 'onboarding'],
  },
  {
    id: 'cmd-agent-drivers',
    label: 'Fleet Drivers & Attendance',
    subtitle: 'Track active riders, shifts & rural morning cluster dispatches',
    icon: '🛵',
    path: '/agent/drivers',
    keywords: ['drivers', 'fleet', 'riders', 'shifts', 'attendance'],
  },
  {
    id: 'cmd-agent-batch',
    label: 'Rural Batch Operations',
    subtitle: '21:00 cutoff manifest, village clusters & 05:00-08:00 dispatch',
    icon: '📦',
    path: '/agent/batch',
    keywords: ['batch', 'manifest', 'rural', 'cutoff', 'dispatch', 'hamlets', 'villages'],
  },
  {
    id: 'cmd-agent-earnings',
    label: 'Earnings & 60/40 Split',
    subtitle: 'Agent 60% franchise commission, daily margin pool & settlements',
    icon: '💰',
    path: '/agent/earnings',
    keywords: ['earnings', 'split', 'revenue', 'commission', 'payout', '60/40', 'margin'],
  },
  {
    id: 'cmd-dispatch-batch',
    label: 'One-Tap Batch Dispatch',
    subtitle: 'Promote scheduled orders to morning dispatch state',
    icon: '⚡',
    action: 'dispatch-batch',
    keywords: ['dispatch', 'batch', 'one-tap', 'morning', 'promote'],
  },
];

function simpleFuzzy(query, text) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const t = (text || '').toLowerCase();
  if (t.includes(q)) return true;

  const parts = q.split(/\s+/);
  return parts.every((p) => t.includes(p));
}

export default function CommandPalette({ isOpen: propIsOpen, onClose, onAction }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigate = useNavigate();
  const inputRef = useRef(null);

  const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setInternalOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClose();
      }
    }

    function handleCustomOpen() {
      setInternalOpen(true);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('quikooo:open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('quikooo:open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleClose = () => {
    setInternalOpen(false);
    onClose?.();
  };

  const filtered = DEFAULT_COMMANDS.filter((cmd) => {
    if (!query.trim()) return true;
    const matchLabel = simpleFuzzy(query, cmd.label);
    const matchSubtitle = simpleFuzzy(query, cmd.subtitle);
    const matchKeywords = cmd.keywords?.some((k) => simpleFuzzy(query, k));
    return matchLabel || matchSubtitle || matchKeywords;
  });

  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  const executeCommand = (cmd) => {
    handleClose();
    if (cmd.path) {
      navigate(cmd.path);
    } else if (cmd.action) {
      if (onAction) {
        onAction(cmd.action);
      } else {
        window.dispatchEvent(new CustomEvent(`quikooo:${cmd.action}`));
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        executeCommand(filtered[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  const currentOptionId = filtered[selectedIndex] ? `agent-opt-${filtered[selectedIndex].id}` : undefined;

  return (
    <div
      className="command-palette-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Zone Partner Command Palette"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '3rem 1rem 1rem 1rem',
      }}
    >
      <div
        className="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          borderRadius: '1rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #E5E7EB',
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.85rem 1rem',
            borderBottom: '1px solid #F3F4F0',
            gap: '0.75rem',
            backgroundColor: '#FAFAFA',
          }}
        >
          <span style={{ fontSize: '1.2rem', color: '#059669' }}>⚡</span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="agent-palette-listbox"
            aria-activedescendant={currentOptionId}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a zone route or batch command (Ctrl+K)..."
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              outline: 'none',
              fontSize: '1rem',
              color: '#111827',
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: '#E5E7EB',
              color: '#4B5563',
              padding: '0.2rem 0.45rem',
              borderRadius: '0.25rem',
              border: '1px solid #D1D5DB',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          id="agent-palette-listbox"
          role="listbox"
          aria-label="Agent navigation actions"
          style={{
            maxHeight: '360px',
            overflowY: 'auto',
            padding: '0.5rem',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6B7280', fontSize: '0.875rem' }}>
              No commands matching "{query}"
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  id={`agent-opt-${cmd.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isSelected ? '#ECFDF5' : 'transparent',
                    color: isSelected ? '#065F46' : '#111827',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{cmd.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.9rem' }}>
                      {cmd.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: isSelected ? '#047857' : '#6B7280',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {cmd.subtitle}
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                      ↵ Enter
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 1rem',
            borderTop: '1px solid #F3F4F0',
            backgroundColor: '#F9FAFB',
            fontSize: '0.72rem',
            color: '#6B7280',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span style={{ color: '#059669', fontWeight: 600 }}>Quikooo Zone Partner</span>
        </div>
      </div>
    </div>
  );
}
