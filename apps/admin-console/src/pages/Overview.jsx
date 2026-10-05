import React, { useState, useEffect } from 'react';
import { fetchOverviewKPIs } from '../api';
import KpiCard from '../components/KpiCard.jsx';
import DataTable from '../components/DataTable.jsx';
import OfflineBanner from '../components/OfflineBanner.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Overview() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewKPIs().then((data) => {
      setKpis(data);
      setLoading(false);
    });
  }, []);

  const unitEconomicsColumns = [
    {
      key: 'component',
      label: 'Component',
      sortable: true,
      render: (row) => <strong>{row.component}</strong>,
    },
    {
      key: 'formula',
      label: 'Formula / Config',
      sortable: true,
      render: (row) => <code style={{ fontSize: '0.8rem' }}>{row.formula}</code>,
    },
    {
      key: 'amount',
      label: 'Amount (INR)',
      sortable: true,
      align: 'right',
      render: (row) => (
        <strong style={{ color: row.amountColor || 'inherit' }}>
          {row.amount}
        </strong>
      ),
    },
    {
      key: 'destination',
      label: 'Destination Account',
      sortable: true,
      render: (row) => (
        <code style={{ fontSize: '0.75rem', color: 'var(--color-brand-dark, #064E3B)' }}>
          {row.destination}
        </code>
      ),
    },
    {
      key: 'notes',
      label: 'Notes & Economic Rule',
      sortable: false,
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
          {row.notes}
        </span>
      ),
    },
  ];

  const unitEconomicsData = [
    {
      id: 'ue-1',
      component: 'Original Listed Price',
      formula: 'Merchant base price',
      amount: '₹100.00',
      destination: 'REFERENCE_BASE',
      notes: 'Excludes customer markup',
    },
    {
      id: 'ue-2',
      component: 'Menu Markup (+5%)',
      formula: 'RESTAURANT_MENU_ADJUSTMENT_PERCENT',
      amount: '+ ₹5.00',
      amountColor: '#059669',
      destination: 'QUIKOOO_PLATFORM_REVENUE',
      notes: 'Paid by customer on order total',
    },
    {
      id: 'ue-3',
      component: 'Customer Food Subtotal',
      formula: 'Original (100) + Markup (5)',
      amount: '₹105.00',
      destination: 'ESCROW_CUSTOMER_RECEIVABLE',
      notes: 'Customer menu display price',
    },
    {
      id: 'ue-4',
      component: 'Platform Commission (10%)',
      formula: 'RESTAURANT_PLATFORM_COMMISSION_PERCENT',
      amount: '- ₹10.00',
      amountColor: '#D97706',
      destination: 'QUIKOOO_PLATFORM_REVENUE',
      notes: 'Calculated strictly on ₹100 original base',
    },
    {
      id: 'ue-5',
      component: 'Vendor Net Settlement',
      formula: '₹100.00 - ₹10.00',
      amount: '₹90.00',
      amountColor: '#047857',
      destination: 'VENDOR_PAYABLE',
      notes: 'Canonical disbursement to merchant',
    },
    {
      id: 'ue-6',
      component: 'Customer Platform Fee',
      formula: 'CUSTOMER_PLATFORM_FEE',
      amount: '+ ₹5.00',
      destination: 'QUIKOOO_PLATFORM_REVENUE',
      notes: 'Fixed platform convenience fee',
    },
    {
      id: 'ue-7',
      component: 'Customer Delivery Fee',
      formula: 'CUSTOMER_DELIVERY_FEE',
      amount: '+ ₹25.00',
      destination: 'ESCROW_CUSTOMER_RECEIVABLE',
      notes: 'Fixed logistics fee',
    },
    {
      id: 'ue-8',
      component: 'Customer Total Payable',
      formula: '105 + 5 + 25',
      amount: '₹135.00',
      amountColor: '#1E40AF',
      destination: 'ESCROW_CUSTOMER_RECEIVABLE',
      notes: 'Gateway invoice total paid by customer',
    },
    {
      id: 'ue-9',
      component: 'Delivery Driver Payout',
      formula: 'DELIVERY_PARTNER_PAYOUT',
      amount: '₹25.00',
      amountColor: '#059669',
      destination: 'DELIVERY_PARTNER_PAYABLE',
      notes: '100% pass-through to delivery partner',
    },
    {
      id: 'ue-10',
      component: 'Platform Gross Margin',
      formula: 'Markup (5) + Comm (10)',
      amount: '₹15.00',
      amountColor: '#1E40AF',
      destination: 'PLATFORM_GROSS_MARGIN',
      notes: 'Canonical ₹15 gross earned per order',
    },
    {
      id: 'ue-11',
      component: 'GST on Margin (18%)',
      formula: '18% Statutory Rate',
      amount: '₹3.06',
      amountColor: '#D97706',
      destination: 'TAX_PAYABLE',
      notes: 'Remitted to statutory tax pool',
    },
    {
      id: 'ue-12',
      component: 'Net Adjusted Revenue Pool',
      formula: 'Gross Margin (15) less GST (3.06)',
      amount: '₹13.94',
      amountColor: '#047857',
      destination: 'NET_ADJUSTED_POOL',
      notes: 'Canonical divisible 60/40 pool',
    },
    {
      id: 'ue-13',
      component: 'Agent Franchise Share (60%)',
      formula: 'AGENT_SHARE_PERCENT',
      amount: '₹8.36',
      amountColor: '#059669',
      destination: 'AGENT_COMMISSION_PAYABLE',
      notes: 'Canonical 60% share to local zone agent',
    },
    {
      id: 'ue-14',
      component: 'Quikooo HQ Share (40%)',
      formula: 'QUIKOOO_SHARE_PERCENT',
      amount: '₹5.58',
      amountColor: '#0284C7',
      destination: 'QUIKOOO_PLATFORM_REVENUE',
      notes: 'Canonical 40% corporate retained share',
    },
  ];

  return (
    <div className="page-container">
      <OfflineBanner />

      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Operations Overview</h1>
          <p className="page-subtitle">
            Real-time GMV, Order Economics & 60/40 Agent-Quikooo Split KPIs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="status-pill success">System Nominal</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Cutoff Window: 21:00 IST
          </span>
        </div>
      </div>

      {/* Top Level KPIs */}
      {loading ? (
        <div className="kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : kpis ? (
        <div className="kpi-grid">
          <KpiCard
            label="Gross Merchandise Value (GMV)"
            value={`₹${kpis.gmv?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtext={`Across ${kpis.ordersCount} completed orders`}
            color="var(--color-brand-primary, #059669)"
            icon="💰"
          />

          <KpiCard
            label="Quikooo Gross Margin"
            value={`₹${kpis.grossMargin?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtext={`₹${kpis.grossPerOrder?.toFixed(2)} gross / order (5% markup + 10% comm)`}
            color="#1E40AF"
            icon="📈"
            badge="₹15 / Order"
          />

          <KpiCard
            label="Agent Franchise Share (60%)"
            value={`₹${kpis.agentSplit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtext="Allocated to local zone agents from net pool"
            color="#047857"
            icon="🤝"
            badge="60% Franchise"
          />

          <KpiCard
            label="Quikooo Platform Share (40%)"
            value={`₹${kpis.quikoooSplit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtext="Retained corporate revenue after GST"
            color="#0284C7"
            icon="🏢"
            badge="40% HQ"
          />
        </div>
      ) : (
        <EmptyState
          icon="📊"
          title="No Platform Metrics"
          description="Could not load executive KPI figures."
        />
      )}

      {/* Secondary Economics Grid */}
      {loading ? (
        <div className="kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : kpis ? (
        <div className="kpi-grid">
          <KpiCard
            label="Delivery Fee Inflow (25 × n)"
            value={`₹${kpis.deliveryInflow?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtext="100% Pass-Through (₹25 payout to driver)"
            color="#059669"
            icon="🛵"
          />

          <KpiCard
            label="Applicable GST / Tax (18%)"
            value={`₹${kpis.taxCollected?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtext="Remitted to statutory authorities"
            color="#D97706"
            icon="🏛️"
          />

          <KpiCard
            label="Active Operating Zones"
            value={kpis.activeZones}
            subtext="Urban, Sub-Urban & Rural clusters"
            icon="🗺️"
          />

          <KpiCard
            label="Fleet & Merchant Network"
            value={`${kpis.activeMerchants} Stores / ${kpis.activeDrivers} Drivers`}
            subtext="Active on ground delivery and merchant network"
            icon="👥"
          />
        </div>
      ) : null}

      {/* Official Unit Economics Reference Card with DataTable */}
      <div className="admin-card">
        <DataTable
          title="Canonical Unit Economics Breakdown"
          subtitle="Governing financial equation for Order 100 benchmark (Food listed ₹100.00)"
          columns={unitEconomicsColumns}
          data={unitEconomicsData}
          pageSize={20}
          stickyHeader={true}
          searchPlaceholder="Filter economics components or accounts..."
          loading={loading}
        />
      </div>
    </div>
  );
}
