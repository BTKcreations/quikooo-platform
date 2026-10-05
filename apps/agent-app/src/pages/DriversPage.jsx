import React, { useState, useEffect } from 'react';
import { getDrivers, onboardDriver, approveDriver, formatINR } from '../api.js';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    vehicle: 'Hero Splendor (KA-11-E-4512)',
  });

  useEffect(() => {
    async function fetchDrivers() {
      try {
        const list = await getDrivers();
        setDrivers(list);
      } catch (err) {
        console.error('Failed to load drivers:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDrivers();
  }, []);

  const handleApprove = async (driverId) => {
    const updated = await approveDriver(driverId);
    if (updated) {
      setDrivers((prev) => prev.map((d) => (d.id === driverId ? updated : d)));
      showToast(`Driver ${updated.name} approved for duty!`);
    }
  };

  const handleToggleDuty = (driverId) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === driverId) {
          const nextStatus = d.status === 'ON_DUTY' ? 'AVAILABLE' : 'ON_DUTY';
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );
    showToast('Driver duty status updated.');
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSubmitting(true);
    try {
      const created = await onboardDriver({
        name: form.name.trim(),
        phone: form.phone.trim(),
        vehicle: form.vehicle.trim(),
        zoneId: 'zone-rural-1',
      });

      setDrivers((prev) => [created, ...prev.filter((d) => d.id !== created.id)]);
      setShowModal(false);
      setForm({ name: '', phone: '', vehicle: '' });
      showToast(`🎉 Driver ${created.name} registered to fleet!`);
    } catch (err) {
      alert(`Onboard error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const filteredDrivers = drivers.filter((d) => {
    if (filter === 'ON_DUTY' && d.status !== 'ON_DUTY') return false;
    if (filter === 'PENDING' && d.status !== 'PENDING_APPROVAL') return false;
    return true;
  });

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '4.5rem',
            right: '1.5rem',
            backgroundColor: '#065F46',
            color: '#FFFFFF',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            zIndex: 99,
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Zone Delivery Partner Fleet</h1>
          <p className="page-subtitle">
            Local rider partners in <strong>Mandya Rural Cluster</strong>. Riders receive 100% of customer delivery fee (₹25.00 per trip).
          </p>
        </div>

        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <span>+</span>
          <span>Register New Rider</span>
        </button>
      </div>

      {/* Driver Economics Policy Alert */}
      <div className="alert-card info">
        <div style={{ fontSize: '1.5rem' }}>🛵</div>
        <div>
          <strong style={{ fontSize: '0.95rem' }}>Strict Logistics Payout Formula: ₹25.00 * n Deliveries</strong>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
            All customer delivery fees (₹25.00) flow 100% directly to delivery partner wallets upon two-step OTP handshake completion. Delivery inflow is never commingled with platform revenue or agent commissions.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          className={filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
          onClick={() => setFilter('ALL')}
        >
          All Fleet ({drivers.length})
        </button>
        <button
          className={filter === 'ON_DUTY' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
          onClick={() => setFilter('ON_DUTY')}
        >
          On Duty ({drivers.filter((d) => d.status === 'ON_DUTY').length})
        </button>
        <button
          className={filter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
          onClick={() => setFilter('PENDING')}
        >
          Pending Approval ({drivers.filter((d) => d.status === 'PENDING_APPROVAL').length})
        </button>
      </div>

      {/* Drivers Table */}
      {loading ? (
        <p>Loading fleet...</p>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver Partner</th>
                <th>Vehicle</th>
                <th>Contact</th>
                <th>Trips Completed</th>
                <th>Cumulative Payout (₹25/trip)</th>
                <th>Rating</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr key={driver.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#111827' }}>{driver.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      ID: {driver.id} • Joined: {driver.joinedDate}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: '#374151' }}>{driver.vehicle}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#4B5563' }}>{driver.phone}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{driver.tripsCompleted}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#059669', fontFamily: 'Outfit' }}>
                      {formatINR(driver.payoutTally || driver.tripsCompleted * 25.0)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#F59E0B' }}>★ {driver.rating}</span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        driver.status === 'ON_DUTY'
                          ? 'status-active'
                          : driver.status === 'AVAILABLE'
                          ? 'status-dispatch'
                          : driver.status === 'PENDING_APPROVAL'
                          ? 'status-pending'
                          : 'status-suspended'
                      }`}
                    >
                      {driver.status === 'ON_DUTY' && '🟢 '}
                      {driver.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {driver.status === 'PENDING_APPROVAL' ? (
                      <button
                        className="btn-success"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => handleApprove(driver.id)}
                      >
                        Approve Rider
                      </button>
                    ) : (
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => handleToggleDuty(driver.id)}
                      >
                        {driver.status === 'ON_DUTY' ? 'Set Available' : 'Set On Duty'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Onboard Driver Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', margin: 0 }}>
                🛵 Register Rider Partner
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#6B7280',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit}>
              <div className="form-group">
                <label className="form-label">Rider Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Praveen Kumar Gowda"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 99160 44556"
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Type & Registration Plate *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hero Splendor Plus (KA-11-Q-7788)"
                  className="form-input"
                  value={form.vehicle}
                  onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                />
              </div>

              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#1E40AF',
                  marginBottom: '1.25rem',
                }}
              >
                <strong>Logistics Agreement:</strong> Rider is credited flat ₹25.00 per completed delivery upon verified two-step OTP handshake. Payouts can be withdrawn daily.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Register Rider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
