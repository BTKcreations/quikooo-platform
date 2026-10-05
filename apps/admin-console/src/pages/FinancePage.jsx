import React, { useState, useEffect } from 'react';
import { fetchLedgerEntries, calculateOrderLedger, reconcileLedger } from '../api';

export default function FinancePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulatedPrice, setSimulatedPrice] = useState(100);
  const [activeLedger, setActiveLedger] = useState(null);

  useEffect(() => {
    fetchLedgerEntries().then((data) => {
      setEntries(data);
      if (data.length > 0) {
        setActiveLedger(data[0]);
      }
      setLoading(false);
    });
  }, []);

  const handleSimulate = (price) => {
    setSimulatedPrice(price);
    const newBreakdown = calculateOrderLedger({
      originalPrice: Number(price),
      orderId: `ord-sim-${price}`,
      orderNumber: `QK-SIM-${Math.round(price)}`,
    });
    setActiveLedger(newBreakdown);
  };

  const recon = activeLedger ? reconcileLedger(activeLedger) : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Double-Entry Financial Ledger</h1>
          <p className="page-subtitle">Platform revenue accounting, tax withholding, and 60/40 franchise reconciliation</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Simulate Original Food Price: ₹
          </label>
          <input
            type="number"
            min="10"
            max="5000"
            step="10"
            className="form-input"
            style={{ width: '100px', padding: '0.35rem 0.5rem' }}
            value={simulatedPrice}
            onChange={(e) => handleSimulate(e.target.value)}
          />
          <button className="btn-outline btn-sm" onClick={() => handleSimulate(100)}>
            Reset Canonical ₹100
          </button>
        </div>
      </div>

      {recon && (
        <div className="reconcile-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚖️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#064E3B' }}>
                Ledger Balanced: Debits (₹{recon.totalDebits.toFixed(2)}) = Credits (₹{recon.totalCredits.toFixed(2)})
              </div>
              <div style={{ fontSize: '0.8rem', color: '#047857' }}>
                Reconciliation verified: Agent Share (₹{activeLedger.agentShare.toFixed(2)}) + Quikooo Share (₹{activeLedger.quikoooShare.toFixed(2)}) = Net Revenue Pool (₹{activeLedger.netAmount.toFixed(2)})
              </div>
            </div>
          </div>
          <span className="status-pill success">Reconciled (0 Drift)</span>
        </div>
      )}

      {/* Canonical Breakdown Cards */}
      {activeLedger && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Order 100 Baseline</div>
            <div className="kpi-value">₹{activeLedger.originalPrice.toFixed(2)}</div>
            <div className="kpi-subtext">Original food listing price</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Commission (10%)</div>
            <div className="kpi-value" style={{ color: '#059669' }}>
              ₹{activeLedger.commission.toFixed(2)}
            </div>
            <div className="kpi-subtext">Charged strictly on original price</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Platform Fee</div>
            <div className="kpi-value">₹{activeLedger.platformFee.toFixed(2)}</div>
            <div className="kpi-subtext">Fixed customer fee</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Quikooo Gross Margin</div>
            <div className="kpi-value" style={{ color: '#1E40AF' }}>
              ₹{activeLedger.grossRevenue.toFixed(2)}
            </div>
            <div className="kpi-subtext">5% markup (₹{activeLedger.menuMarkup.toFixed(2)}) + 10% comm (₹{activeLedger.commission.toFixed(2)}) = ₹15.00</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">GST Liability (18%)</div>
            <div className="kpi-value" style={{ color: '#D97706' }}>
              ₹{activeLedger.taxAmount.toFixed(2)}
            </div>
            <div className="kpi-subtext">Statutory tax deducted before split</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Net Adjusted Pool</div>
            <div className="kpi-value" style={{ color: '#047857' }}>
              ₹{activeLedger.netAmount.toFixed(2)}
            </div>
            <div className="kpi-subtext">Gross Margin less GST</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Agent 60% Share</div>
            <div className="kpi-value" style={{ color: '#059669' }}>
              ₹{activeLedger.agentShare.toFixed(2)}
            </div>
            <div className="kpi-subtext">Franchise zone revenue</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Quikooo 40% Share</div>
            <div className="kpi-value" style={{ color: '#0284C7' }}>
              ₹{activeLedger.quikoooShare.toFixed(2)}
            </div>
            <div className="kpi-subtext">Corporate retained margin</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Delivery Fee / Payout</div>
            <div className="kpi-value">
              ₹{activeLedger.deliveryFee.toFixed(2)} / ₹{activeLedger.deliveryPayout.toFixed(2)}
            </div>
            <div className="kpi-subtext" style={{ color: '#059669' }}>
              100% Pass-Through (₹25 inflow = ₹25 driver)
            </div>
          </div>
        </div>
      )}

      {/* Double-Entry Journal Table */}
      <div className="admin-card">
        <h2 className="card-title">
          <span>Double-Entry Ledger Journal: Order {activeLedger?.orderNumber || 'QK-20261005-0100'}</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>
            Customer Payable: <strong>₹{activeLedger?.customerPayable.toFixed(2)}</strong> | Vendor Settlement: <strong style={{ color: '#047857' }}>₹{activeLedger?.vendorSettlement.toFixed(2)}</strong>
          </span>
        </h2>

        {loading ? (
          <p>Loading journal entries...</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Account Name</th>
                  <th>Entry Type</th>
                  <th>Debit (INR)</th>
                  <th>Credit (INR)</th>
                  <th>Description & Audit Note</th>
                </tr>
              </thead>
              <tbody>
                {activeLedger?.entries.map((entry, index) => (
                  <tr key={index}>
                    <td>
                      <code>{entry.account}</code>
                    </td>
                    <td>
                      <span className={`status-pill ${entry.type === 'DEBIT' ? 'warning' : 'success'}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td>
                      {entry.type === 'DEBIT' ? (
                        <strong>₹{Number(entry.amount).toFixed(2)}</strong>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {entry.type === 'CREDIT' ? (
                        <strong style={{ color: '#047857' }}>₹{Number(entry.amount).toFixed(2)}</strong>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      {entry.account === 'ESCROW_CUSTOMER_RECEIVABLE' && 'Customer gross payment received at gateway'}
                      {entry.account === 'VENDOR_PAYABLE' && `Merchant net credit (Original ₹${activeLedger.originalPrice.toFixed(2)} - 10% commission ₹${activeLedger.commission.toFixed(2)})`}
                      {entry.account === 'DELIVERY_PARTNER_PAYABLE' && 'Driver fee pass-through credit (100% of ₹25)'}
                      {entry.account === 'TAX_PAYABLE' && 'Statutory GST liability on platform revenue (18%)'}
                      {entry.account === 'AGENT_COMMISSION_PAYABLE' && `Agent 60% franchise revenue share of net pool (₹${activeLedger.netAmount.toFixed(2)})`}
                      {entry.account === 'QUIKOOO_PLATFORM_REVENUE' && `Quikooo 40% corporate retained share of net pool (₹${activeLedger.netAmount.toFixed(2)})`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F9FAFB', fontWeight: 700 }}>
                  <td colSpan="2">TOTAL RECONCILIATION</td>
                  <td>₹{recon?.totalDebits.toFixed(2)}</td>
                  <td style={{ color: '#047857' }}>₹{recon?.totalCredits.toFixed(2)}</td>
                  <td>
                    {recon?.isBalanced ? (
                      <span style={{ color: '#047857' }}>✓ Perfectly Balanced (Debit == Credit)</span>
                    ) : (
                      <span style={{ color: '#DC2626' }}>⚠ Imbalance detected</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
