import React, { useState, useEffect } from 'react';
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
import OtpInput from '../components/OtpInput.jsx';
import EarningsRing from '../components/EarningsRing.jsx';
import { useToast } from '../components/Toast.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PrefetchLink from '../components/PrefetchLink.jsx';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnDuty, setIsOnDuty] = useState(true);

  // 4-digit OTP Handshake Modal state
  const [activeModal, setActiveModal] = useState(null); // { type: 'PICKUP' | 'DELIVERY', task }
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await getDriverTasks();
        setTasks(data || []);
      } catch (err) {
        console.error('Failed to load driver tasks', err);
        showToast('Failed to load tasks. Using cached runs.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, [showToast]);

  // One-tap Accept Task action
  const handleAccept = async (task) => {
    try {
      await acceptDeliveryTask(task.id);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'ACCEPTED' } : t))
      );
      showToast(`✓ Order ${task.orderNumber} accepted! Proceed to ${task.vendorName}.`, 'success');
    } catch (err) {
      showToast(`Accept failed: ${err.message}`, 'error');
    }
  };

  // Open Handshake Modal with cleared state
  const openOtpModal = (type, task) => {
    setActiveModal({ type, task });
    setOtpValue('');
    setOtpError('');
  };

  const handleOtpSubmit = async (overrideOtp) => {
    if (!activeModal || submitting) return;
    const { type, task } = activeModal;
    const fullOtp = overrideOtp || otpValue;

    if (!validateDeliveryOtp(fullOtp)) {
      setOtpError('Please enter the complete 4-digit numeric OTP.');
      return;
    }

    setSubmitting(true);
    setOtpError('');

    try {
      if (type === 'PICKUP') {
        await pickupDeliveryTask(task.id, fullOtp);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'PICKED_UP' } : t))
        );
        showToast(`🛵 Food picked up from ${task.vendorName}! Head to customer address.`, 'success');
      } else if (type === 'DELIVERY') {
        await completeDeliveryTask(task.id, fullOtp);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'DELIVERED' } : t))
        );
        showToast(`🎉 Order delivered! ₹25.00 credited immediately to your driver wallet!`, 'success');
      }
      setActiveModal(null);
      setOtpValue('');
    } catch (err) {
      setOtpError(err.message || 'OTP verification failed');
      showToast(err.message || 'OTP verification failed', 'error');
    } finally {
      setSubmitting(false);
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
    showToast(`⚡ NEW DISPATCH: Order ${newTask.orderNumber} assigned!`, 'info');
  };

  // Find first assigned task for thumb zone sticky CTA
  const firstAssignedTask = tasks.find((t) => t.status === 'ASSIGNED');

  // Earnings progress ring calculations (e.g. 10 completed out of 16 daily target)
  const completedTrips = tasks.filter((t) => t.status === 'DELIVERED').length + 8; // Including past shifts
  const progressMetrics = calculateEarningsProgress(completedTrips, 16);

  return (
    <div>
      {/* Duty Toggle Sticky Header */}
      <div className="sticky-duty-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isOnDuty ? '#10B981' : '#EF4444',
              boxShadow: isOnDuty ? '0 0 0 4px rgba(16, 185, 129, 0.25)' : 'none',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.925rem', color: isOnDuty ? '#065F46' : '#991B1B' }}>
              {isOnDuty ? 'ONLINE • READY FOR DISPATCH' : 'OFFLINE • ON REST BREAK'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '1px' }}>
              {isOnDuty
                ? 'Indiranagar Urban (2.0 km geofence) • GPS Active'
                : 'Dispatch paused • Switch on to receive deliveries'}
            </div>
          </div>
        </div>

        {/* Big 48px+ Thumb Duty Toggle */}
        <button
          onClick={() => {
            const next = !isOnDuty;
            setIsOnDuty(next);
            showToast(
              next ? '🟢 You are ON DUTY! Ready to accept tasks.' : 'Duty paused — You are now resting.',
              next ? 'success' : 'info'
            );
          }}
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: isOnDuty ? '#059669' : '#DC2626',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            minHeight: '48px',
            minWidth: '110px',
            boxShadow: 'var(--shadow-sm)',
            transition: 'background-color 0.2s ease',
          }}
          aria-label="Toggle duty status"
        >
          {isOnDuty ? 'GO OFF-DUTY' : 'GO ON-DUTY'}
        </button>
      </div>

      <div className="page-content">
        {/* Offline State Banner when rider paused duty */}
        {!isOnDuty && (
          <div
            className="card mb-3"
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '0.75rem',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>☕</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#991B1B', fontSize: '1.15rem', fontWeight: 800 }}>
              You Are Currently Offline
            </h3>
            <p style={{ margin: '0 0 1.25rem', color: '#7F1D1D', fontSize: '0.85rem', lineHeight: 1.4 }}>
              You are currently resting. While offline, new delivery dispatches (₹25 per drop) will not be assigned to your cockpit.
            </p>
            <button
              onClick={() => {
                setIsOnDuty(true);
                showToast('🟢 You are ON DUTY! Ready to accept tasks.', 'success');
              }}
              className="btn-primary"
              style={{
                minHeight: '48px',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 800,
                backgroundColor: '#059669',
              }}
            >
              ⚡ Go On-Duty Now
            </button>
          </div>
        )}

        {/* Daily Target Progress with SVG EarningsRing */}
        <div
          className="card mb-3"
          style={{
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Today's Target Progress
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669', marginTop: '0.2rem' }}>
              {formatINR(progressMetrics.earned)} earned
            </div>
            <div style={{ fontSize: '0.8rem', color: '#4B5563', marginTop: '0.25rem' }}>
              {progressMetrics.completed} of {progressMetrics.target} trips completed (100% ₹25 payout)
            </div>
            <div style={{ marginTop: '0.6rem' }}>
              <PrefetchLink
                to="/driver/payout"
                prefetch={() => import('./PayoutPage.jsx')}
                style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, textDecoration: 'none' }}
              >
                View Earnings Ledger →
              </PrefetchLink>
            </div>
          </div>

          <EarningsRing
            completed={progressMetrics.completed}
            target={progressMetrics.target}
            size={90}
            strokeWidth={8}
          />
        </div>

        {/* Task List Header */}
        <div className="flex-row-between mb-3">
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>Active Dispatch Tasks</h2>
            <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
              {tasks.filter((t) => t.status !== 'DELIVERED').length} active runs
            </span>
          </div>

          <button
            onClick={handleSimulateNewTask}
            className="btn-secondary btn-sm"
            style={{ minHeight: '48px', padding: '0.5rem 1rem', fontWeight: 700 }}
          >
            + Simulate Order
          </button>
        </div>

        {/* Skeleton Loading State */}
        {loading && (
          <div className="grid-cards">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
        )}

        {/* Empty State */}
        {!loading && tasks.length === 0 && (
          <EmptyState
            icon="🛵"
            title="No delivery tasks"
            description="You have no pending delivery dispatches right now. Tap simulate to test incoming order dispatch."
            actionText="+ Simulate Task"
            onAction={handleSimulateNewTask}
          />
        )}

        {/* Big 48px+ Thumb Task Cards */}
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
                  borderLeft: isDelivered
                    ? '5px solid #9CA3AF'
                    : isPickedUp
                    ? '5px solid #059669'
                    : isAccepted
                    ? '5px solid #10B981'
                    : '5px solid #F59E0B',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                }}
              >
                <div>
                  {/* Header */}
                  <div className="flex-row-between mb-2">
                    <div>
                      <span style={{ fontFamily: 'var(--font-family-display)', fontWeight: 800, fontSize: '1.1rem' }}>
                        {task.orderNumber}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                        {task.itemsCount || 1} package • Express 2.0 km geofence
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem', fontWeight: 800 }}>
                        +₹{task.payoutAmount.toFixed(2)}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800, marginTop: '2px' }}>
                        100% Payout
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Store Pickup Info */}
                  <div
                    style={{
                      backgroundColor: isAccepted ? '#ECFDF5' : '#F9FAFB',
                      borderRadius: '0.5rem',
                      padding: '0.85rem',
                      marginBottom: '0.65rem',
                      border: isAccepted ? '1px solid #A7F3D0' : '1px solid #E5E7EB',
                    }}
                  >
                    <div className="flex-row-between">
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>
                        🏪 1. Store Pickup
                      </div>
                      {isPickedUp && (
                        <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 800 }}>✓ PICKED UP</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', marginTop: '3px' }}>
                      {task.vendorName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#4B5563', marginTop: '2px' }}>
                      {task.vendorAddress}
                    </div>
                  </div>

                  {/* Step 2: Customer Delivery Destination Info */}
                  <div
                    style={{
                      backgroundColor: isPickedUp ? '#ECFDF5' : '#F9FAFB',
                      borderRadius: '0.5rem',
                      padding: '0.85rem',
                      marginBottom: '0.85rem',
                      border: isPickedUp ? '1px solid #A7F3D0' : '1px solid #E5E7EB',
                    }}
                  >
                    <div className="flex-row-between">
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>
                        📍 2. Customer Delivery Destination
                      </div>
                      {isDelivered && (
                        <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 800 }}>✓ DELIVERED</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', marginTop: '3px' }}>
                      {task.customerName} ({task.customerPhone})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#4B5563', marginTop: '2px' }}>
                      {task.customerAddress}
                    </div>
                  </div>
                </div>

                {/* Big 48px+ Thumb One-Tap Action Buttons */}
                <div>
                  {isAssigned && (
                    <button
                      onClick={() => handleAccept(task)}
                      className="btn-primary btn-block"
                      style={{
                        minHeight: '48px',
                        fontSize: '1rem',
                        fontWeight: 800,
                        backgroundColor: '#059669',
                      }}
                      aria-label={`Accept delivery run ${task.orderNumber}`}
                    >
                      ⚡ One-Tap Accept Run (₹25.00)
                    </button>
                  )}

                  {isAccepted && (
                    <button
                      onClick={() => openOtpModal('PICKUP', task)}
                      className="btn-primary btn-block"
                      style={{
                        minHeight: '48px',
                        fontSize: '1rem',
                        fontWeight: 800,
                        backgroundColor: '#047857',
                      }}
                      aria-label={`Enter pickup OTP for ${task.orderNumber}`}
                    >
                      📦 At Store: Enter Pickup OTP
                    </button>
                  )}

                  {isPickedUp && (
                    <button
                      onClick={() => openOtpModal('DELIVERY', task)}
                      className="btn-primary btn-block"
                      style={{
                        minHeight: '48px',
                        fontSize: '1rem',
                        fontWeight: 800,
                        backgroundColor: '#065F46',
                      }}
                      aria-label={`Enter customer OTP for ${task.orderNumber}`}
                    >
                      ✅ At Doorstep: Enter Customer OTP & Complete
                    </button>
                  )}

                  {isDelivered && (
                    <div
                      style={{
                        minHeight: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ECFDF5',
                        borderRadius: '0.5rem',
                        color: '#059669',
                        fontWeight: 800,
                        fontSize: '0.925rem',
                      }}
                    >
                      🎉 Delivery Complete • ₹25.00 Credited
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Thumb-Zone Sticky Accept CTA */}
        {firstAssignedTask && (
          <div className="sticky-thumb-accept">
            <button
              onClick={() => handleAccept(firstAssignedTask)}
              className="btn-primary btn-block"
              style={{
                minHeight: '52px',
                fontSize: '1rem',
                fontWeight: 800,
                backgroundColor: '#059669',
                boxShadow: '0 8px 24px rgba(5, 150, 105, 0.45)',
                border: '2px solid #34D399',
              }}
              aria-label={`Accept new order dispatch ${firstAssignedTask.orderNumber}`}
            >
              ⚡ Accept {firstAssignedTask.orderNumber} (₹25.00)
            </button>
          </div>
        )}
      </div>

      {/* 4-Digit OTP Handshake Modal (Merchant Pickup + Customer Delivery) */}
      {activeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
            padding: '1rem',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="otp-modal-title"
        >
          <div
            className="card"
            style={{
              maxWidth: '420px',
              width: '100%',
              padding: '1.75rem 1.5rem',
              textAlign: 'center',
              borderRadius: '1rem',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>
              {activeModal.type === 'PICKUP' ? '🏪' : '🤝'}
            </div>

            <h3 id="otp-modal-title" style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>
              {activeModal.type === 'PICKUP' ? 'Merchant Pickup Handshake' : 'Customer Delivery Handshake'}
            </h3>

            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.4 }}>
              {activeModal.type === 'PICKUP'
                ? `Ask merchant ${activeModal.task.vendorName} for their 4-digit Pickup OTP.`
                : `Ask customer ${activeModal.task.customerName} for their 4-digit Delivery OTP.`}
            </p>

            {otpError && (
              <div
                style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                }}
              >
                {otpError}
              </div>
            )}

            {/* 4-Digit Auto-Advancing Numeric OtpInput */}
            <OtpInput
              value={otpValue}
              onChange={(val) => {
                setOtpValue(val);
                setOtpError('');
              }}
              onComplete={(val) => {
                handleOtpSubmit(val);
              }}
              length={4}
              error={!!otpError}
              disabled={submitting}
              autoFocus
            />

            <div style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0.75rem 0 1.5rem 0' }}>
              💡 Demo code: <strong>{activeModal.type === 'PICKUP' ? activeModal.task.expectedPickupOtp || '4512' : activeModal.task.expectedDeliveryOtp || '8934'}</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setOtpValue('');
                  setOtpError('');
                }}
                className="btn-secondary btn-block"
                style={{ minHeight: '48px', fontSize: '0.95rem', fontWeight: 600 }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleOtpSubmit()}
                disabled={otpValue.length !== 4 || submitting}
                className="btn-primary btn-block"
                style={{
                  minHeight: '48px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  backgroundColor: '#059669',
                }}
              >
                {submitting ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
