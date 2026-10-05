import React, { useState } from 'react';
import {
  getCompletedTrips,
  calculateDriverPayout,
  DELIVERY_PARTNER_PAYOUT_RATE,
  formatINR,
} from '../api.js';

export default function PayoutPage() {
  const [trips] = useState(getCompletedTrips());
  const [withdrawalState, setWithdrawalState] = useState(null);

  const deliveryCount = trips.length;
  const totalPayout = calculateDriverPayout(deliveryCount, DELIVERY_PARTNER_PAYOUT_RATE);

  const handleWithdraw = () => {
    setWithdrawalState('PROCESSING');
    setTimeout(() => {
      setWithdrawalState('SUCCESS');
      alert(`Withdrawal of ${formatINR(totalPayout)} initiated to your registered UPI ID (rider@okhdfcbank). Expected credit within 15 minutes!`);
      setTimeout(() => setWithdrawalState(null), 1000);
    }, 700);
  };

  return (
    <div className="page-content">
      <div className="mb-3">
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Rider Partner Earnings</h2>
        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
          Flat ₹25.00 per completed delivery (100% passed to partner)
        </p>
      </div>

      {/* CANONICAL DRIVER EARNINGS FORMULA CARD */}
      <div
        className="card mb-4"
        style={{
          border: '2px solid var(--color-brand-primary, #059669)',
          backgroundColor: '#F0FDF4',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#064E3B' }}>
            Official Delivery Earnings Formula
          </span>
        </div>

        <div style={{ fontSize: '0.9rem', color: '#1F2937', marginBottom: '0.5rem' }}>
          <div className="flex-row-between" style={{ padding: '0.25rem 0' }}>
            <span>Rate Per Delivery:</span>
            <strong>₹25.00 / trip</strong>
          </div>
          <div className="flex-row-between" style={{ padding: '0.25rem 0' }}>
            <span>Completed Deliveries:</span>
            <strong>{deliveryCount} trips</strong>
          </div>
          <div
            className="flex-row-between"
            style={{
              borderTop: '1px dashed #059669',
              paddingTop: '0.5rem',
              marginTop: '0.25rem',
              color: '#065F46',
            }}
          >
            <strong>Total Payout ({deliveryCount} × ₹25.00):</strong>
            <strong style={{ fontSize: '1.2rem', color: '#059669' }}>
              {formatINR(totalPayout)}
            </strong>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#047857', fontStyle: 'italic' }}>
          * Quikooo passes 100% of customer delivery fee directly to rider partners without deduction.
        </div>
      </div>

      {/* Wallet Balance & Instant Withdrawal Card */}
      <div className="card mb-4">
        <div className="flex-row-between mb-2">
          <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Available Wallet Balance
          </span>
          <span className="badge badge-success">Instant Payout</span>
        </div>

        <div style={{ fontFamily: 'var(--font-family-display, Outfit)', fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginBottom: '0.5rem' }}>
          {formatINR(totalPayout)}
        </div>

        <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '1rem' }}>
          Earned from {deliveryCount} completed delivery runs today
        </div>

        <button
          onClick={handleWithdraw}
          disabled={withdrawalState === 'PROCESSING' || totalPayout === 0}
          className="btn-primary btn-block"
        >
          {withdrawalState === 'PROCESSING'
            ? 'Processing Instant Transfer...'
            : `Withdraw ${formatINR(totalPayout)} via UPI`}
        </button>
      </div>

      {/* Line Item Trip History */}
      <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Today's Delivery Trips</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {trips.map((trip) => (
          <div key={trip.id} className="card" style={{ padding: '0.75rem' }}>
            <div className="flex-row-between" style={{ marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{trip.orderNumber}</span>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                +₹25.00 Credited
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#4B5563', marginBottom: '0.35rem' }}>
              {trip.vendorName} → {trip.customerArea} ({trip.distanceKm} km)
            </div>

            <div className="flex-row-between text-secondary" style={{ fontSize: '0.75rem', borderTop: '1px solid #F3F4F0', paddingTop: '0.35rem' }}>
              <span>Delivered at {new Date(trip.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <strong style={{ color: '#059669' }}>Earnings: ₹25.00</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
