import React, { useState, useEffect, useRef } from 'react';
import {
  getDriverTasks,
  acceptDeliveryTask,
  pickupDeliveryTask,
  completeDeliveryTask,
  assignDelivery,
  validateDeliveryOtp,
  calculateEarningsProgress,
  formatINR,
} from '../api.js';
import { SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [notification, setNotification] = useState(null);

  // 4-digit OTP Handshake Modal state
  const [activeModal, setActiveModal] = useState(null); // { type: 'PICKUP'|'DELIVERY', task }
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const otpInputsRef = useRef([]);

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await getDriverTasks();
        setTasks(data || []);
      } catch (err) {
        console.error('Failed to load driver tasks', err);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Accept Task action
  const handleAccept = async (task) => {
    try {
      await acceptDeliveryTask(task.id);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'ACCEPTED' } : t))
      );
      showNotification(`✓ Order ${task.orderNumber} accepted! Proceed to ${task.vendorName}.`);
    } catch (err) {
      alert(`Accept failed: ${err.message}`);
    }
  };

  // Open Handshake Modal with auto-focus
  const openOtpModal = (type, task) => {
    setActiveModal({ type, task });
    setOtpDigits(['', '', '', '']);
    setOtpError('');
    setTimeout(() => {
      otpInputsRef.current[0]?.focus();
    }, 100);
  };

  // 4-Digit OTP Auto-Advance Input Handler
  const handleDigitChange = (index, value) => {
    const char = value.slice(-1); // Take last char
    if (char && !/^\d$/.test(char)) return; // Only numeric

    const nextDigits = [...otpDigits];
    nextDigits[index] = char;
    setOtpDigits(nextDigits);
    setOtpError('');

    // Auto-advance to next input if digit entered
    if (char && index < 3) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Move back to previous input on backspace
        otpInputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handlePasteOtp = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{4}$/.test(pasteData)) {
      const chars = pasteData.split('');
      setOtpDigits(chars);
      otpInputsRef.current[3]?.focus();
    }
  };

  const handleOtpSubmit = async () => {
    if (!activeModal) return;
    const { type, task } = activeModal;
    const fullOtp = otpDigits.join('');

    if (!validateDeliveryOtp(fullOtp)) {
      setOtpError('Please enter the complete 4-digit numeric OTP.');
      return;
    }

    try {
      if (type === 'PICKUP') {
        await pickupDeliveryTask(task.id, fullOtp);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'PICKED_UP' } : t))
        );
        showNotification(`🛵 Food bag picked up from ${task.vendorName}! Head to customer address.`);
      } else if (type === 'DELIVERY') {
        await completeDeliveryTask(task.id, fullOtp);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'DELIVERED' } : t))
        );
        showNotification(`🎉 Order delivered! ₹25.00 credited immediately to your driver wallet!`);
      }
      setActiveModal(null);
    } catch (err) {
      setOtpError(err.message || 'OTP verification failed');
    }
  };

  const handleSimulateNewTask = async () => {
    const randomOrderId = `ord-${Math.floor(200 + Math.random() * 800)}`;
    const newTaskAssignment = await assignDelivery({ orderId: randomOrderId });
    const newTask = {
      id: newTaskAssignment.assignmentId || `task-${Date.now()}`,
      orderId: randomOrderId,
      orderNumber: `QK-20261005-${randomOrderId.substring(4)}`,
      status: 'ASSIGNED',
      payoutAmount: 25.0,
      vendorName: 'Royal Spice Kitchen',
      vendorAddress: 'HAL 2nd Stage, Indiranagar (0.6 km)',
      customerName: 'Vikram Joshi',
      customerAddress: 'Flat 102, Sunrise Towers, Domlur',
      customerPhone: '+91 97700 88991',
      expectedPickupOtp: '6721',
      expectedDeliveryOtp: '4512',
      itemsCount: 1,
      assignedAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    showNotification(`⚡ NEW DISPATCH: Order ${newTask.orderNumber} assigned!`);
  };

  // Earnings progress ring calculations (10 completed out of 16 daily target)
  const completedTrips = tasks.filter((t) => t.status === 'DELIVERED').length + 8; // Including past shifts
  const progressMetrics = calculateEarningsProgress(completedTrips, 16);

  // SVG Progress Ring Parameters
  const strokeWidth = 8;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressMetrics.percent / 100) * circumference;

  return (
    <div className="page-content">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="alert-chime-banner" style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0', color: '#064E3B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
            <span>🛵</span>
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#064E3B', fontWeight: 700, minHeight: '44px', minWidth: '44px' }}
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* Prominent Duty Toggle & Rider Status */}
      <div
        className="card"
        style={{
          marginBottom: '1rem',
          padding: '1rem',
          borderLeft: isOnDuty ? '4px solid #059669' : '4px solid #EF4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: isOnDuty ? '#10B981' : '#EF4444',
                boxShadow: isOnDuty ? '0 0 0 3px rgba(16, 185, 129, 0.25)' : 'none',
              }}
            />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: isOnDuty ? '#065F46' : '#991B1B' }}>
              {isOnDuty ? 'ONLINE • READY FOR DISPATCH' : 'OFFLINE • ON REST BREAK'}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4B5563', marginTop: '0.2rem' }}>
            Zone: Indiranagar Urban (2.0 km geofence) • GPS Active
          </div>
        </div>

        {/* Duty Toggle Button (min 44px) */}
        <button
          onClick={() => {
            setIsOnDuty(!isOnDuty);
            showNotification(isOnDuty ? 'Duty paused — You are now resting.' : '🟢 You are ON DUTY! Ready to accept tasks.');
          }}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: isOnDuty ? '#059669' : '#DC2626',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            minHeight: '44px',
            minWidth: '100px',
          }}
          aria-label="Toggle duty status"
        >
          {isOnDuty ? 'GO OFF-DUTY' : 'GO ON-DUTY'}
        </button>
      </div>

      {/* Earnings Progress Ring & Daily KPI Card */}
      <div className="card mb-3" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
            Today's Target Progress
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669', marginTop: '0.2rem' }}>
            {formatINR(progressMetrics.earned)} earned
          </div>
          <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>
            {progressMetrics.completed} of {progressMetrics.target} trips completed (100% ₹25 payout)
          </div>
        </div>

        {/* SVG Progress Ring */}
        <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="45"
              cy="45"
              r={radius}
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx="45"
              cy="45"
              r={radius}
              stroke="#059669"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '0.9rem',
              color: '#064E3B',
            }}
          >
            {progressMetrics.percent}%
          </div>
        </div>
      </div>

      {/* Task List Header */}
      <div className="flex-row-between mb-3">
        <div>
          <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Active Dispatch Tasks</h2>
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
            {tasks.filter((t) => t.status !== 'DELIVERED').length} active runs
          </span>
        </div>

        <button
          onClick={handleSimulateNewTask}
          className="btn-secondary btn-sm"
          style={{ minHeight: '44px', padding: '0.4rem 0.85rem' }}
        >
          + Simulate Order
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && <SkeletonCard lines={3} />}

      {/* Empty State */}
      {!loading && tasks.length === 0 && (
        <EmptyState
          icon="🛵"
          title="No delivery tasks"
          description="You have no pending delivery dispatches right now. Tap simulate to test incoming order."
          actionText="+ Simulate Task"
          onAction={handleSimulateNewTask}
        />
      )}

      {/* Big Thumb-Friendly Task Cards (Min 44px Touch Targets) */}
      <div className="grid-cards">
        {tasks.map((task) => {
          const isAssigned = task.status === 'ASSIGNED';
          const isAccepted = task.status === 'ACCEPTED';
          const isPickedUp = task.status === 'PICKED_UP';
          const isDelivered = task.status === 'DELIVERED';

          return (
            <div
              key={task.id}
              className="card"
              style={{
                borderLeft: isDelivered ? '4px solid #9CA3AF' : isPickedUp ? '4px solid #059669' : '4px solid #F59E0B',
                padding: '1.1rem',
              }}
            >
              {/* Header */}
              <div className="flex-row-between mb-2">
                <div>
                  <span style={{ fontFamily: 'var(--font-family-display)', fontWeight: 800, fontSize: '1.05rem' }}>
                    {task.orderNumber}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    {task.itemsCount || 1} package • Express 2.0 km geofence
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem' }}>
                    +₹{task.payoutAmount.toFixed(2)}
                  </span>
                  <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                    100% Payout
                  </div>
                </div>
              </div>

              {/* Step 1: Store Pickup Info */}
              <div
                style={{
                  backgroundColor: isAccepted ? '#ECFDF5' : '#F9FAFB',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '0.6rem',
                  border: isAccepted ? '1px solid #A7F3D0' : '1px solid #F3F4F0',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                  🏪 1. Store Pickup
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                  {task.vendorName}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#4B5563' }}>
                  {task.vendorAddress}
                </div>
              </div>

              {/* Step 2: Customer Drop Info */}
              <div
                style={{
                  backgroundColor: isPickedUp ? '#ECFDF5' : '#F9FAFB',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  border: isPickedUp ? '1px solid #A7F3D0' : '1px solid #F3F4F0',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                  📍 2. Customer Delivery Destination
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                  {task.customerName} ({task.customerPhone})
                </div>
                <div style={{ fontSize: '0.78rem', color: '#4B5563' }}>
                  {task.customerAddress}
                </div>
              </div>

              {/* Big Thumb-Friendly One-Tap Action Buttons (min 48px) */}
              <div>
                {isAssigned && (
                  <button
                    onClick={() => handleAccept(task)}
                    className="btn-primary btn-block"
                    style={{ minHeight: '48px', fontSize: '1rem', fontWeight: 700 }}
                  >
                    ⚡ Accept Delivery Run (₹25.00)
                  </button>
                )}

                {isAccepted && (
                  <button
                    onClick={() => openOtpModal('PICKUP', task)}
                    className="btn-primary btn-block"
                    style={{ minHeight: '48px', fontSize: '1rem', fontWeight: 700, backgroundColor: '#047857' }}
                  >
                    📦 At Store: Enter Pickup OTP
                  </button>
                )}

                {isPickedUp && (
                  <button
                    onClick={() => openOtpModal('DELIVERY', task)}
                    className="btn-primary btn-block"
                    style={{ minHeight: '48px', fontSize: '1rem', fontWeight: 700, backgroundColor: '#065F46' }}
                  >
                    ✅ At Doorstep: Enter Customer OTP & Complete
                  </button>
                )}

                {isDelivered && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '0.5rem',
                      color: '#059669',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    🎉 Delivery Complete • ₹25.00 Payout Credited
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4-Digit OTP Input Modal with Auto-Advance */}
      {activeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
            padding: '1rem',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>
              {activeModal.type === 'PICKUP' ? '🏪' : '🤝'}
            </div>

            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', color: '#111827' }}>
              {activeModal.type === 'PICKUP' ? 'Store Pickup Handshake' : 'Customer Delivery Handshake'}
            </h3>

            <p style={{ margin: '0 0 1rem 0', fontSize: '0.825rem', color: '#4B5563' }}>
              {activeModal.type === 'PICKUP'
                ? `Ask ${activeModal.task.vendorName} for their 4-digit Pickup OTP.`
                : `Ask customer ${activeModal.task.customerName} for their 4-digit Delivery OTP.`}
            </p>

            {otpError && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.5rem', borderRadius: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                {otpError}
              </div>
            )}

            {/* 4-digit Auto-Advancing Input Boxes */}
            <div className="otp-container" onPaste={handlePasteOtp}>
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputsRef.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={otpDigits[idx]}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  className="otp-box"
                  aria-label={`Digit ${idx + 1} of 4`}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '1.25rem' }}>
              💡 Demo code: <strong>{activeModal.type === 'PICKUP' ? activeModal.task.expectedPickupOtp || '4512' : activeModal.task.expectedDeliveryOtp || '8934'}</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveModal(null)}
                className="btn-secondary btn-block"
                style={{ minHeight: '48px', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleOtpSubmit}
                disabled={otpDigits.join('').length !== 4}
                className="btn-primary btn-block"
                style={{ minHeight: '48px', fontSize: '0.95rem', fontWeight: 700 }}
              >
                Verify & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
