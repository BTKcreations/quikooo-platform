import React, { useState, useEffect } from 'react';
import { fetchOverviewKPIs } from '../api';

export default function Overview() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewKPIs().then((data) => {
      setKpis(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading platform overview...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Operations Overview</h1>
          <p className="page-subtitle">Real-time GMV, Order Economics & 60/40 Agent-Quikooo Split KPIs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="status-pill success">System Nominal</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Cutoff Window: 21:00 IST
          </span>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Gross Merchandise Value (GMV)</div>
          <div className="kpi-value" style={{ color: 'var(--color-brand-primary)' }}>
            ₹{kpis.gmv?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="kpi-subtext">Across {kpis.ordersCount} completed orders</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Quikooo Gross Margin</div>
          <div className="kpi-value">
            ₹{kpis.grossMargin?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="kpi-subtext">
            <strong>₹{kpis.grossPerOrder?.toFixed(2)}</strong> gross / order (5% markup + 10% comm)
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Agent Franchise Share (60%)</div>
          <div className="kpi-value" style={{ color: '#047857' }}>
            ₹{kpis.agentSplit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="kpi-subtext">Allocated to local zone agents from net pool</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Quikooo Platform Share (40%)</div>
          <div className="kpi-value" style={{ color: '#0284C7' }}>
            ₹{kpis.quikoooSplit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="kpi-subtext">Retained corporate revenue after GST</div>
        </div>
      </div>

      {/* Secondary Economics Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Delivery Fee Inflow (25 * n)</div>
          <div className="kpi-value">
            ₹{kpis.deliveryInflow?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="kpi-subtext" style={{ color: '#059669' }}>
            100% Pass-Through (₹25 payout to driver)
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Applicable GST / Tax (18%)</div>
          <div className="kpi-value" style={{ color: '#D97706' }}>
            ₹{kpis.taxCollected?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="kpi-subtext">Remitted to statutory authorities</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Active Operating Zones</div>
          <div className="kpi-value">{kpis.activeZones}</div>
          <div className="kpi-subtext">Urban, Sub-Urban & Rural clusters</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Fleet & Merchant Network</div>
          <div className="kpi-value">
            {kpis.activeMerchants} <span style={{ fontSize: '1rem', color: '#6B7280' }}>Stores</span> / {kpis.activeDrivers} <span style={{ fontSize: '1rem', color: '#6B7280' }}>Drivers</span>
          </div>
          <div className="kpi-subtext">Active on ground network</div>
        </div>
      </div>

      {/* Official Unit Economics Reference Card */}
      <div className="admin-card">
        <h2 className="card-title">Canonical Unit Economics (Original Listed Price = ₹100.00)</h2>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Formula / Config</th>
                <th>Amount (INR)</th>
                <th>Destination Account</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Original Listed Price</strong></td>
                <td>Merchant base price</td>
                <td>₹100.00</td>
                <td>Reference base</td>
                <td>Excludes markup</td>
              </tr>
              <tr>
                <td><strong>Menu Markup (+5%)</strong></td>
                <td>RESTAURANT_MENU_ADJUSTMENT_PERCENT</td>
                <td>+ ₹5.00</td>
                <td>QUIKOOO_PLATFORM_REVENUE</td>
                <td>Paid by customer</td>
              </tr>
              <tr>
                <td><strong>Customer Food Subtotal</strong></td>
                <td>Original (100) + Markup (5)</td>
                <td>₹105.00</td>
                <td>ESCROW_CUSTOMER_RECEIVABLE</td>
                <td>Customer menu display price</td>
              </tr>
              <tr>
                <td><strong>Platform Commission (10%)</strong></td>
                <td>RESTAURANT_PLATFORM_COMMISSION_PERCENT</td>
                <td>- ₹10.00</td>
                <td>QUIKOOO_PLATFORM_REVENUE</td>
                <td>Calculated strictly on ₹100 base</td>
              </tr>
              <tr>
                <td><strong>Vendor Net Settlement</strong></td>
                <td>₹100.00 - ₹10.00</td>
                <td><strong style={{ color: '#047857' }}>₹90.00</strong></td>
                <td>VENDOR_PAYABLE</td>
                <td>Disbursed to merchant</td>
              </tr>
              <tr>
                <td><strong>Customer Platform Fee</strong></td>
                <td>CUSTOMER_PLATFORM_FEE</td>
                <td>+ ₹5.00</td>
                <td>QUIKOOO_PLATFORM_REVENUE</td>
                <td>Fixed platform convenience fee</td>
              </tr>
              <tr>
                <td><strong>Customer Delivery Fee</strong></td>
                <td>CUSTOMER_DELIVERY_FEE</td>
                <td>+ ₹25.00</td>
                <td>ESCROW_CUSTOMER_RECEIVABLE</td>
                <td>Fixed logistics fee</td>
              </tr>
              <tr style={{ backgroundColor: '#F0FDF4' }}>
                <td><strong>Customer Total Payable</strong></td>
                <td>105 + 5 + 25</td>
                <td><strong>₹135.00</strong></td>
                <td>ESCROW_CUSTOMER_RECEIVABLE</td>
                <td>Customer gateway invoice total</td>
              </tr>
              <tr>
                <td><strong>Delivery Driver Payout</strong></td>
                <td>DELIVERY_PARTNER_PAYOUT</td>
                <td>₹25.00</td>
                <td>DELIVERY_PARTNER_PAYABLE</td>
                <td>100% pass-through to delivery partner</td>
              </tr>
              <tr style={{ backgroundColor: '#EFF6FF' }}>
                <td><strong>Platform Gross Margin</strong></td>
                <td>Markup (5) + Comm (10)</td>
                <td><strong style={{ color: '#1E40AF' }}>₹15.00</strong></td>
                <td>PLATFORM_GROSS_MARGIN</td>
                <td>₹15 gross earned per order</td>
              </tr>
              <tr>
                <td><strong>GST on Margin (18%)</strong></td>
                <td>18% Statutory Rate</td>
                <td>₹3.06</td>
                <td>TAX_PAYABLE</td>
                <td>GST liability pool</td>
              </tr>
              <tr style={{ backgroundColor: '#FEF3C7' }}>
                <td><strong>Net Revenue Pool</strong></td>
                <td>Gross Margin less GST</td>
                <td><strong>₹13.94</strong></td>
                <td>NET_ADJUSTED_POOL</td>
                <td>Divisible between Agent & Quikooo</td>
              </tr>
              <tr style={{ fontWeight: 600 }}>
                <td><strong>Agent Franchise Share (60%)</strong></td>
                <td>AGENT_SHARE_PERCENT</td>
                <td><strong style={{ color: '#047857' }}>₹8.36</strong></td>
                <td>AGENT_COMMISSION_PAYABLE</td>
                <td>Local zone partner earnings</td>
              </tr>
              <tr style={{ fontWeight: 600 }}>
                <td><strong>Quikooo HQ Share (40%)</strong></td>
                <td>QUIKOOO_SHARE_PERCENT</td>
                <td><strong style={{ color: '#0369A1' }}>₹5.58</strong></td>
                <td>QUIKOOO_PLATFORM_REVENUE</td>
                <td>Corporate retained margin</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
