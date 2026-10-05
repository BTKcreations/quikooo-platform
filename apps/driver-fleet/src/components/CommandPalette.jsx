import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const DEFAULT_COMMANDS = [
  {
    id: 'cmd-driver-tasks',
    label: 'Active Tasks & Cockpit',
    subtitle: 'Manage pickup & delivery runs with 4-digit OTP handshake',
    icon: '🛵',
    path: '/driver/tasks',
    keywords: ['tasks', 'delivery', 'runs', 'orders', 'pickup', 'handshake', 'active'],
  },
  {
    id: 'cmd-driver-duty',
    label: 'Duty & Shifts',
    subtitle: 'Switch online status, breaks & geofence shift settings',
    icon: '⏱️',
    path: '/driver/duty',
    keywords: ['duty', 'shift', 'online', 'offline', 'breaks', 'hours'],
  },
  {
    id: 'cmd-driver-payout',
    label: 'Rider Earnings (₹25 * n)',
    subtitle: '100% delivery fee pass-through, completed drops & wallet balance',
    icon: '💵',
    path: '/driver/payout',
    keywords: ['earnings', 'payout', 'wallet', 'money', 'drop', 'deliveries', 'settlement'],
  },
  {
    id: 'cmd-toggle-duty',
    label: 'Toggle Duty Status',
    subtitle: 'Go online/offline to pause or resume delivery dispatch',
    icon: '🟢',
    action: 'toggle-duty',
    keywords: ['toggle', 'duty', 'online', 'offline', 'break', 'pause', 'resume'],
  },
  {
    id: 'cmd-simulate-task',
    label: 'Simulate Incoming Task',
    subtitle: 'Test new dispatch assignment with ₹25 payout credit',
    icon: '⚡',
    action: 'simulate-task',
    keywords: ['simulate', 'test', 'dispatch', 'new', 'task', 'run'],
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

  const currentOptionId = filtered[selectedIndex] ? `driver-opt-${filtered[selectedIndex].id}` : undefined;

  return (
    <div
      className="command-palette-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Rider Command Palette"
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
            aria-controls="driver-palette-listbox"
            aria-activedescendant={currentOptionId}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a rider route or command (Ctrl+K)..."
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
          id="driver-palette-listbox"
          role="listbox"
          aria-label="Rider navigation actions"
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
                  id={`driver-opt-${cmd.id}`}
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
          <span style={{ color: '#059669', fontWeight: 600 }}>Quikooo Rider Cockpit</span>
        </div>
      </div>
    </div>
  );
}
