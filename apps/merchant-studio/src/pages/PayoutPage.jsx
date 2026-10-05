import React, { useState, useEffect } from 'react';
import { getOrders, calculateSettlement, formatINR } from '../api.js';

export default function PayoutPage() {
  const [orders, setOrders] = useState([]);
  const [customPrice, setCustomPrice] = useState(100);
  const [withdrawalRequested, setWithdrawalRequested] = useState(false);

  useEffect(() => {
    async function loadData() {
      const data = await getOrders();
      setOrders(data || []);
    }
    loadData();
  }, []);

  // Canonical settlement calculation for the interactive calculator
  const interactiveSettlement = calculateSettlement(customPrice, 10);
  const customerMenuPriceExample = Math.round(Number(customPrice) * 1.05 * 100) / 100;

  // Aggregate metrics
  const totalOriginal = orders.reduce((sum, o) => sum + (o.totalOriginalPrice || 100), 0);
  const totalCommission = Math.round(totalOriginal * 0.1 * 100) / 100;
  const totalSettlement = Math.round(totalOriginal * 0.9 * 100) / 100;

  const handleWithdrawal = () => {
    setWithdrawalRequested(true);
    setTimeout(() => {
      alert(`Withdrawal request of ${formatINR(totalSettlement)} submitted successfully! Settling to Bank Account / UPI within 2 hours.`);
      setWithdrawalRequested(false);
    }, 800);
  };

  return (
    <div className="page-content">
      {/* Title */}
      <div className="mb-3">
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Merchant Payout & Settlements</h2>
        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
          Single Source of Truth: Original listed price minus 10% Quikooo platform commission
        </p>
      </div>

      {/* CANONICAL 90 PER 100 SETTLEMENT EXAMPLE CARD */}
      <div
        className="card mb-4"
        style={{
          border: '2px solid var(--color-brand-primary, #059669)',
          backgroundColor: '#F0FDF4',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⭐</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#064E3B' }}>
            Official Business Model Math (Canonical Example)
          </span>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#1F2937', lineHeight: '1.5' }}>
          <div className="flex-row-between" style={{ padding: '0.2rem 0' }}>
            <span>1. Original Listed Food Price:</span>
            <strong>₹100.00</strong>
          </div>
          <div className="flex-row-between" style={{ padding: '0.2rem 0', color: '#6B7280' }}>
            <span>2. Customer Menu Price (+5% markup):</span>
            <span>₹105.00</span>
          </div>
          <div className="flex-row-between" style={{ padding: '0.2rem 0', color: '#DC2626' }}>
            <span>3. Quikooo Commission (10% on original ₹100):</span>
            <strong>- ₹10.00</strong>
          </div>
          <div
            className="flex-row-between"
            style={{
              padding: '0.4rem 0',
              borderTop: '1px dashed #059669',
              marginTop: '0.35rem',
              color: '#065F46',
              fontSize: '0.95rem',
            }}
          >
            <strong>4. Net Vendor Settlement (Original - 10%):</strong>
            <strong style={{ fontSize: '1.15rem', color: '#059669' }}>₹90.00</strong>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.5rem', fontStyle: 'italic' }}>
          * Commission is charged strictly on the original listed price (never on the marked-up customer price).
        </div>
      </div>

      {/* Interactive Settlement Calculator */}
      <div className="card mb-4">
        <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
          Interactive Settlement Calculator
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>
          Test the exact 90% payout for any item price:
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Original Price: ₹</span>
          <input
            type="number"
            value={customPrice}
            onChange={(e) => setCustomPrice(Math.max(0, Number(e.target.value)))}
            className="input"
            style={{ width: '120px', padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ backgroundColor: '#F9FAFB', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.85rem' }}>
          <div className="flex-row-between" style={{ marginBottom: '0.25rem' }}>
            <span className="text-secondary">Original Listed Price:</span>
            <strong>{formatINR(interactiveSettlement.originalPrice)}</strong>
          </div>
          <div className="flex-row-between" style={{ marginBottom: '0.25rem', color: '#4B5563' }}>
            <span className="text-secondary">Customer Menu Price (+5%):</span>
            <span>{formatINR(customerMenuPriceExample)}</span>
          </div>
          <div className="flex-row-between" style={{ marginBottom: '0.25rem', color: '#DC2626' }}>
            <span>Platform Commission ({interactiveSettlement.commissionPercent}%):</span>
            <span>- {formatINR(interactiveSettlement.commissionAmount)}</span>
          </div>
          <div className="flex-row-between" style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.35rem', marginTop: '0.25rem' }}>
            <strong style={{ color: '#059669' }}>Net Vendor Payout (90%):</strong>
            <strong style={{ color: '#059669', fontSize: '1rem' }}>
              {formatINR(interactiveSettlement.vendorSettlement)}
            </strong>
          </div>
        </div>
      </div>

      {/* Settlement Balance & Withdrawal Card */}
      <div className="card mb-4" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex-row-between mb-2">
          <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Available Settlement Balance
          </span>
          <span className="badge badge-success">Daily Payouts Enabled</span>
        </div>

        <div style={{ fontFamily: 'var(--font-family-display, Outfit)', fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginBottom: '0.5rem' }}>
          {formatINR(totalSettlement)}
        </div>

        <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '1rem' }}>
          From {orders.length} orders (Gross Sales: {formatINR(totalOriginal)} • Commission: -{formatINR(totalCommission)})
        </div>

        <button
          onClick={handleWithdrawal}
          disabled={withdrawalRequested || totalSettlement === 0}
          className="btn-primary btn-block"
        >
          {withdrawalRequested ? 'Processing Transfer...' : `Withdraw ${formatINR(totalSettlement)} to Bank / UPI`}
        </button>
      </div>

      {/* Line Item Settlement List */}
      <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Settlement Ledger by Order</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {orders.map((order) => {
          const orig = order.totalOriginalPrice || 100;
          const comm = Math.round(orig * 0.1 * 100) / 100;
          const net = Math.round((orig - comm) * 100) / 100;

          return (
            <div key={order.id} className="card" style={{ padding: '0.75rem' }}>
              <div className="flex-row-between" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{order.orderNumber}</span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  Settled (90%)
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.4rem' }}>
                {order.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </div>

              <div className="flex-row-between" style={{ fontSize: '0.8rem', borderTop: '1px solid #F3F4F0', paddingTop: '0.35rem' }}>
                <span className="text-secondary">
                  Listed: {formatINR(orig)} <span style={{ color: '#DC2626' }}>(-10% Comm: {formatINR(comm)})</span>
                </span>
                <strong style={{ color: '#059669', fontSize: '0.9rem' }}>
                  Net: {formatINR(net)}
                </strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
