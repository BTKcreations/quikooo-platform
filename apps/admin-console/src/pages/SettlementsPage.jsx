import React, { useState, useEffect } from 'react';
import { fetchSettlements, processSettlement } from '../api';

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  const loadSettlements = async () => {
    setLoading(true);
    const data = await fetchSettlements();
    setSettlements(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSettlements();
  }, []);

  const handleProcess = async (settlementId) => {
    try {
      const updated = await processSettlement(settlementId, `UTR-${Date.now().toString().slice(-6)}`);
      setActionMessage({ type: 'success', text: `Settlement ${updated.id} successfully processed with ref ${updated.transactionRef}!` });
      loadSettlements();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Merchant, Franchise & Driver Settlements</h1>
          <p className="page-subtitle">Idempotent weekly disbursement batches, payout automation, and audit-locked settlement logs</p>
        </div>
      </div>

      {actionMessage && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          backgroundColor: actionMessage.type === 'success' ? '#D1FAE5' : '#FEE2E2',
          color: actionMessage.type === 'success' ? '#064E3B' : '#991B1B',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}>
          {actionMessage.text}
        </div>
      )}

      {/* Hardened Financial Safeguards Notice */}
      <div className="reconcile-banner" style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E40AF' }}>
              Financial Hardening: Idempotency & Paid-Lock Protocol
            </div>
            <div style={{ fontSize: '0.8rem', color: '#1D4ED8' }}>
              • <strong>Idempotency Key:</strong> Deterministic <code>SETTLE_[TYPE]_[ENTITY]_[START]_[END]</code> prevents duplicate banking transfers.<br />
              • <strong>No Edit-After-Paid:</strong> Paid records are strictly immutable. Post-disbursement corrections require explicit <code>REVERSAL</code> adjustment entries.<br />
              • <strong>Formulas:</strong> Vendor = Food - 10% Commission (Canonical 100 → <strong>₹90.00</strong>) | Agent = Net Adjusted Pool × 60% (Canonical 13.94 → <strong>₹8.36</strong>) | Delivery = 25 × n
            </div>
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="admin-card">
        <h2 className="card-title">Settlement Disbursement Records ({settlements.length})</h2>
        {loading ? (
          <p>Loading settlements...</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Settlement ID / Idempotent Key</th>
                  <th>Type</th>
                  <th>Recipient / Entity</th>
                  <th>Settlement Period</th>
                  <th>Gross Basis</th>
                  <th>Deductions / Comm</th>
                  <th>Net Payout (INR)</th>
                  <th>Status</th>
                  <th>Bank Ref</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div><strong>{item.id}</strong></div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        <code>{item.idempotentKey}</code>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${
                        item.settlementType === 'VENDOR' ? 'primary' : item.settlementType === 'AGENT' ? 'success' : 'neutral'
                      }`}>
                        {item.settlementType}
                      </span>
                    </td>
                    <td>
                      <div><strong>{item.recipientName}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        {item.zoneName || 'All Zones'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {item.periodStart} to {item.periodEnd}
                    </td>
                    <td>₹{item.foodTotal ? item.foodTotal.toFixed(2) : '-'}</td>
                    <td>₹{item.commissionAmount ? item.commissionAmount.toFixed(2) : '-'}</td>
                    <td>
                      <strong style={{
                        fontSize: '1rem',
                        color: item.settlementType === 'VENDOR' && item.netPayout === 90 ? '#047857' : 'inherit',
                      }}>
                        ₹{item.netPayout.toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-pill ${item.status === 'PAID' ? 'success' : 'warning'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {item.transactionRef ? (
                        <code>{item.transactionRef}</code>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>Pending Transfer</span>
                      )}
                    </td>
                    <td>
                      {item.status === 'PENDING' ? (
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleProcess(item.id)}
                        >
                          💸 Disburse
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          Locked (Paid)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
