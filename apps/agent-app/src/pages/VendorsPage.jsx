import React, { useState, useEffect } from 'react';
import { getVendors, onboardVendor, toggleVendorStatus } from '../api.js';

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    category: 'Farm Dairy & Veggies',
    address: '',
    itemsCount: 15,
  });

  useEffect(() => {
    async function fetchVendors() {
      try {
        const list = await getVendors();
        setVendors(list);
      } catch (err) {
        console.error('Failed to load vendors:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, []);

  const handleToggleStatus = async (vendorId) => {
    const updated = await toggleVendorStatus(vendorId);
    if (updated) {
      setVendors((prev) => prev.map((v) => (v.id === vendorId ? updated : v)));
      showToast(`Merchant status updated to ${updated.status}`);
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSubmitting(true);
    try {
      const created = await onboardVendor({
        name: form.name.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        category: form.category,
        address: form.address.trim(),
        itemsCount: form.itemsCount,
        zoneId: 'zone-rural-1',
      });

      setVendors((prev) => [created, ...prev.filter((v) => v.id !== created.id)]);
      setShowModal(false);
      setForm({
        name: '',
        ownerName: '',
        phone: '',
        category: 'Farm Dairy & Veggies',
        address: '',
        itemsCount: 15,
      });
      showToast(`🎉 Successfully onboarded merchant: ${created.name}`);
    } catch (err) {
      alert(`Onboarding error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const filteredVendors = vendors.filter((v) => {
    if (filter === 'ACTIVE' && v.status !== 'ACTIVE') return false;
    if (filter === 'PENDING' && v.status !== 'PENDING_KYC') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.ownerName.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q)
      );
    }
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
          <h1 className="page-title">Zone Merchant Directory & Onboarding</h1>
          <p className="page-subtitle">
            Local franchise merchants in <strong>Mandya & Maddur Cluster</strong>. Standard platform terms: 10% commission on original list price.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <span>+</span>
          <span>Onboard New Merchant</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
            onClick={() => setFilter('ALL')}
          >
            All ({vendors.length})
          </button>
          <button
            className={filter === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
            onClick={() => setFilter('ACTIVE')}
          >
            Active ({vendors.filter((v) => v.status === 'ACTIVE').length})
          </button>
          <button
            className={filter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
            onClick={() => setFilter('PENDING')}
          >
            Pending KYC ({vendors.filter((v) => v.status === 'PENDING_KYC').length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by store, owner, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '0.5rem 0.875rem',
            border: '1px solid #D1D5DB',
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            minWidth: '240px',
          }}
        />
      </div>

      {/* Vendors Table */}
      {loading ? (
        <p>Loading merchants...</p>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Store & Owner</th>
                <th>Category</th>
                <th>Contact</th>
                <th>Catalog Items</th>
                <th>Commission Model</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                    No merchants found matching your query.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{vendor.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        Proprietor: {vendor.ownerName} • {vendor.address}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          backgroundColor: '#F3F4F6',
                          color: '#374151',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {vendor.category}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#4B5563' }}>{vendor.phone}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{vendor.itemsCount} products</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem' }}>
                        <span style={{ color: '#059669', fontWeight: 700 }}>10% Platform Comm</span>
                        <div style={{ color: '#6B7280' }}>+5% Customer Markup</div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          vendor.status === 'ACTIVE'
                            ? 'status-active'
                            : vendor.status === 'PENDING_KYC'
                            ? 'status-pending'
                            : 'status-suspended'
                        }`}
                      >
                        {vendor.status === 'ACTIVE' && '● '}
                        {vendor.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => handleToggleStatus(vendor.id)}
                      >
                        {vendor.status === 'ACTIVE' ? 'Suspend' : 'Approve / Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2-Step Onboard Vendor Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', margin: 0 }}>
                🏪 Onboard Merchant Partner
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setWizardStep(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#6B7280',
                  minHeight: '44px',
                  minWidth: '44px',
                }}
              >
                ✕
              </button>
            </div>

            {/* 2-Step Wizard Indicator */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: wizardStep === 1 ? '#D1FAE5' : '#F3F4F6',
                  color: wizardStep === 1 ? '#065F46' : '#6B7280',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  border: wizardStep === 1 ? '1.5px solid #059669' : '1px solid transparent',
                }}
              >
                1. Store Profile & Contact
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: wizardStep === 2 ? '#D1FAE5' : '#F3F4F6',
                  color: wizardStep === 2 ? '#065F46' : '#6B7280',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  border: wizardStep === 2 ? '1.5px solid #059669' : '1px solid transparent',
                }}
              >
                2. Verification & KYC
              </div>
            </div>

            <form onSubmit={handleOnboardSubmit}>
              {wizardStep === 1 ? (
                <div>
                  <div className="form-group">
                    <label className="form-label">Store / Farm Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kaveri Organic Farm & Dairy"
                      className="form-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Proprietor / Owner Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Gowda"
                        className="form-input"
                        value={form.ownerName}
                        onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="+91 98450 12345"
                        className="form-input"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Primary Category *</label>
                      <select
                        className="form-select"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        <option value="Farm Dairy & Veggies">Farm Dairy & Veggies</option>
                        <option value="Groceries & Staples">Groceries & Staples</option>
                        <option value="Fresh Prepared Meals">Fresh Prepared Meals</option>
                        <option value="Poultry & Meat">Poultry & Meat</option>
                        <option value="Bakery & Snacks">Bakery & Snacks</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Initial SKUs Count</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={form.itemsCount}
                        onChange={(e) => setForm({ ...form, itemsCount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowModal(false)}
                      style={{ minHeight: '44px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        if (form.name && form.ownerName && form.phone) {
                          setWizardStep(2);
                        } else {
                          alert('Please enter Store Name, Owner Name and Phone Number');
                        }
                      }}
                      style={{ minHeight: '44px', padding: '0.5rem 1.25rem' }}
                    >
                      Next: Verification & KYC →
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="form-group">
                    <label className="form-label">Physical Address / Village Location *</label>
                    <textarea
                      rows="2"
                      required
                      placeholder="e.g. Near Gejjalagere Gram Panchayat, Mandya"
                      className="form-textarea"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">FSSAI / Trade License No. (Optional)</label>
                      <input
                        type="text"
                        placeholder="FSSAI-2026-XXXX"
                        className="form-input"
                        value={form.fssaiNumber || ''}
                        onChange={(e) => setForm({ ...form, fssaiNumber: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Settlement UPI / Bank Account ID *</label>
                      <input
                        type="text"
                        required
                        placeholder="merchant@upi or IFSC A/C"
                        className="form-input"
                        value={form.settlementUpi || ''}
                        onChange={(e) => setForm({ ...form, settlementUpi: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Business Math Agreement Confirmation */}
                  <div
                    style={{
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      color: '#065F46',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <strong>Official Partner Agreement:</strong> Merchant receives 90% settlement (Original listed price - 10% platform commission). Platform applies +5% customer menu markup for packaging & operations.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setWizardStep(1)}
                      style={{ minHeight: '44px' }}
                    >
                      ← Back to Profile
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting}
                      style={{ minHeight: '44px', padding: '0.5rem 1.25rem' }}
                    >
                      {submitting ? 'Submitting...' : 'Complete Merchant Onboarding'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
