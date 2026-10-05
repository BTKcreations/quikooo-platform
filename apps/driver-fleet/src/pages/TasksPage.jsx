import React, { useState, useEffect } from 'react';
import {
  getDriverTasks,
  acceptDeliveryTask,
  pickupDeliveryTask,
  completeDeliveryTask,
  assignDelivery,
  validateDeliveryOtp,
  formatINR,
} from '../api.js';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // { type: 'PICKUP'|'DELIVERY', task: object }
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [notification, setNotification] = useState(null);

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

  // Accept Task action
  const handleAccept = async (task) => {
    try {
      await acceptDeliveryTask(task.id);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'ACCEPTED' } : t))
      );
      showNotification(`✓ Task for Order ${task.orderNumber} accepted! Head to store.`);
    } catch (err) {
      alert(`Accept failed: ${err.message}`);
    }
  };

  // Open Pickup Modal
  const openPickupModal = (task) => {
    setActiveModal({ type: 'PICKUP', task });
    setOtpInput('');
    setOtpError('');
  };

  // Open Complete Delivery Modal
  const openCompleteModal = (task) => {
    setActiveModal({ type: 'DELIVERY', task });
    setOtpInput('');
    setOtpError('');
  };

  // Submit OTP Verification
  const handleOtpSubmit = async () => {
    if (!activeModal) return;
    const { type, task } = activeModal;

    if (!validateDeliveryOtp(otpInput)) {
      setOtpError('Please enter a valid 4-digit numeric OTP (e.g. 4512)');
      return;
    }

    try {
      if (type === 'PICKUP') {
        await pickupDeliveryTask(task.id, otpInput);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'PICKED_UP' } : t))
        );
        showNotification(`🛵 Package picked up from ${task.vendorName}! Start navigation to customer.`);
      } else if (type === 'DELIVERY') {
        await completeDeliveryTask(task.id, otpInput);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'DELIVERED' } : t))
        );
        showNotification(`🎉 Order delivered! ₹25.00 credited to your driver wallet!`);
      }
      setActiveModal(null);
    } catch (err) {
      setOtpError(err.message);
    }
  };

  // Simulate new order assignment
  const handleSimulateNewTask = async () => {
    const randomOrderId = `ord-${Math.floor(200 + Math.random() * 800)}`;
    const newTaskAssignment = await assignDelivery({ orderId: randomOrderId });
    const newTask = {
      id: newTaskAssignment.assignmentId || `task-${Date.now()}`,
      orderId: randomOrderId,
      orderNumber: `QK-20261005-${randomOrderId.substring(4)}`,
      status: 'ASSIGNED',
      payoutAmount: 25.0,
      vendorName: 'Curry & Spice Express',
      vendorAddress: '12th Main Road, Indiranagar (0.5 km)',
      customerName: 'Sneha Kulkarni',
      customerAddress: 'Flat 101, Palm Meadows, Indiranagar',
      customerPhone: '+91 97400 99881',
      itemsCount: 1,
      assignedAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    showNotification(`🔔 New delivery offer received! Earn ₹25.00.`);
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return <span className="badge badge-warning">⚡ New Assignment</span>;
      case 'ACCEPTED':
        return <span className="badge badge-accepted">🛵 Head to Store</span>;
      case 'PICKED_UP':
        return <span className="badge badge-preparing">📦 Out for Delivery</span>;
      case 'DELIVERED':
        return <span className="badge badge-success">✓ Completed (+₹25)</span>;
      default:
        return <span className="badge badge-muted">{status}</span>;
    }
  };

  return (
    <div className="page-content">
      {/* Toast Notification */}
      {notification && (
        <div className="alert-chime-banner" style={{ borderLeft: '4px solid #059669', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#064E3B' }}>
            {notification}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex-row-between mb-3">
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Active Tasks</h2>
          <p className="text-secondary" style={{ fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
            Two-Step OTP Handshake: Pickup from Store → Deliver to Customer
          </p>
        </div>

        <button onClick={handleSimulateNewTask} className="btn-secondary btn-sm">
          + New Task
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🛵</span>
          <h3 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.1rem' }}>No active tasks</h3>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            You are currently online. Click <strong>"+ New Task"</strong> to simulate an incoming delivery offer.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="card"
              style={{
                borderLeft: task.status === 'DELIVERED' ? '4px solid #10B981' : task.status === 'PICKED_UP' ? '4px solid #059669' : '4px solid #F59E0B',
              }}
            >
              {/* Task Header */}
              <div className="flex-row-between mb-2">
                <div>
                  <span style={{ fontFamily: 'var(--font-family-display, Outfit)', fontWeight: 700, fontSize: '1rem' }}>
                    {task.orderNumber}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF', marginLeft: '0.5rem' }}>
                    {task.itemsCount} items
                  </span>
                </div>
                {getStatusBadge(task.status)}
              </div>

              {/* Delivery Partner Fee Tag */}
              <div style={{ display: 'inline-block', backgroundColor: '#ECFDF5', color: '#065F46', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                Earnings: {formatINR(task.payoutAmount || 25.0)} (100% of Delivery Fee)
              </div>

              {/* Two-step Progress Stepper */}
              <div style={{ margin: '0.5rem 0 1rem 0' }}>
                {/* Step 1: Pickup */}
                <div className={`task-step ${task.status !== 'ASSIGNED' ? 'completed' : ''}`}>
                  <div className={`step-marker ${task.status === 'ASSIGNED' ? 'active' : task.status === 'ACCEPTED' ? 'active' : 'completed'}`}>
                    1
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Pickup: {task.vendorName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{task.vendorAddress}</div>
                  </div>
                </div>

                {/* Step 2: Delivery */}
                <div className={`task-step ${task.status === 'DELIVERED' ? 'completed' : ''}`}>
                  <div className={`step-marker ${task.status === 'PICKED_UP' ? 'active' : task.status === 'DELIVERED' ? 'completed' : 'pending'}`}>
                    2
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Drop-off: {task.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      {task.customerAddress} • {task.customerPhone}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lifecycle Stage Action Buttons */}
              {task.status === 'ASSIGNED' && (
                <button
                  onClick={() => handleAccept(task)}
                  className="btn-primary btn-block"
                  style={{ fontSize: '0.9rem' }}
                >
                  Accept Delivery Offer (₹25.00)
                </button>
              )}

              {task.status === 'ACCEPTED' && (
                <button
                  onClick={() => openPickupModal(task)}
                  className="btn-primary btn-block"
                  style={{ fontSize: '0.9rem', backgroundColor: '#047857' }}
                >
                  Arrived at Store • Enter Pickup OTP →
                </button>
              )}

              {task.status === 'PICKED_UP' && (
                <button
                  onClick={() => openCompleteModal(task)}
                  className="btn-primary btn-block"
                  style={{ fontSize: '0.9rem', backgroundColor: '#059669' }}
                >
                  Arrived at Customer • Enter Delivery OTP →
                </button>
              )}

              {task.status === 'DELIVERED' && (
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #A7F3D0', padding: '0.5rem', borderRadius: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#065F46', fontWeight: 600 }}>
                  ✓ Delivery Complete • ₹25.00 Credited to Wallet
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* OTP Verification Modal (Pickup & Delivery) */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="flex-row-between mb-3">
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                {activeModal.type === 'PICKUP' ? '🏪 Vendor Pickup Handshake' : '🏠 Customer Delivery Handshake'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '1rem' }}>
              {activeModal.type === 'PICKUP'
                ? `Ask ${activeModal.task.vendorName} for the 4-digit pickup OTP displayed on their Merchant POS terminal:`
                : `Ask ${activeModal.task.customerName} for the 4-digit delivery completion OTP shown on their Quikooo app:`}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                maxLength={4}
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value.replace(/\D/g, ''));
                  setOtpError('');
                }}
                placeholder="• • • •"
                className="input"
                style={{
                  fontSize: '1.75rem',
                  letterSpacing: '0.4em',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                }}
                autoFocus
              />
              {otpError && (
                <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 500 }}>
                  {otpError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOtpSubmit}
                className="btn-primary"
                style={{ flex: 2 }}
              >
                {activeModal.type === 'PICKUP' ? 'Verify & Confirm Pickup' : 'Verify & Complete (₹25)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
