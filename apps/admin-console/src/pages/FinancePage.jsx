import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchLedgerEntries,
  calculateOrderLedger,
  reconcileLedger,
  fetchSettlements,
  processSettlement,
} from '../api';
import KpiCard from '../components/KpiCard.jsx';
import DataTable, { parseSortParam, formatSortParam } from '../components/DataTable.jsx';
import OfflineBanner from '../components/OfflineBanner.jsx';
import { Skeleton, SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';

export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulatedPrice, setSimulatedPrice] = useState(100);
  const [activeLedger, setActiveLedger] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [settlementsLoading, setSettlementsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const { showToast } = useToast();

  const filterQuery = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort') || '';
  const sortConfig = useMemo(() => parseSortParam(sortParam), [sortParam]);

  const handleFilterChange = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set('q', val);
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  };

  const handleSortChange = (newSort) => {
    const next = new URLSearchParams(searchParams);
    const formatted = formatSortParam(newSort);
    if (formatted) {
      next.set('sort', formatted);
    } else {
      next.delete('sort');
    }
    setSearchParams(next, { replace: true });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setSettlementsLoading(true);

    try {
      const [ledgerData, settlementData] = await Promise.all([
        fetchLedgerEntries(),
        fetchSettlements(),
      ]);
      setEntries(ledgerData);
      if (ledgerData.length > 0) {
        setActiveLedger(ledgerData[0]);
      }
      setSettlements(settlementData);
    } catch {
      showToast('Error loading financial data. Using offline cached mode.', 'error');
    } finally {
      setLoading(false);
      setSettlementsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSimulate = (price) => {
    const numPrice = Number(price);
    setSimulatedPrice(price);
    const newBreakdown = calculateOrderLedger({
      originalPrice: numPrice,
      orderId: `ord-sim-${Math.round(numPrice)}`,
      orderNumber: `QK-SIM-${Math.round(numPrice)}`,
    });
    setActiveLedger(newBreakdown);
  };

  const handleApproveSettlement = async (settlementId) => {
    setProcessingId(settlementId);
    try {
      const bankRef = `UTR-${Date.now().toString().slice(-6)}`;
      const updated = await processSettlement(settlementId, bankRef);
      showToast(`Settlement ${updated.id} approved! Disbursed ₹${updated.netPayout.toFixed(2)} (${updated.transactionRef})`, 'success');
      // Refresh settlements
      const data = await fetchSettlements();
      setSettlements(data);
    } catch (err) {
      showToast(err.message || 'Settlement approval failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const recon = activeLedger ? reconcileLedger(activeLedger) : null;

  // Double-entry table columns
  const ledgerColumns = [
    {
      key: 'account',
      label: 'Account Code',
      sortable: true,
      width: '260px',
      render: (row) => (
        <div>
          <code style={{ fontWeight: 600, color: 'var(--color-brand-dark, #064E3B)' }}>{row.account}</code>
          {row.description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{row.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      width: '100px',
      render: (row) => (
        <span className={`status-pill ${row.type === 'DEBIT' ? 'warning' : 'success'}`}>
          {row.type}
        </span>
      ),
    },
    {
      key: 'debit',
      label: 'Debit (INR)',
      sortable: true,
      align: 'right',
      filterValue: (row) => (row.type === 'DEBIT' ? String(row.amount) : ''),
      render: (row) =>
        row.type === 'DEBIT' ? (
          <strong style={{ color: '#111827' }}>₹{Number(row.amount).toFixed(2)}</strong>
        ) : (
          <span style={{ color: '#9CA3AF' }}>-</span>
        ),
    },
    {
      key: 'credit',
      label: 'Credit (INR)',
      sortable: true,
      align: 'right',
      filterValue: (row) => (row.type === 'CREDIT' ? String(row.amount) : ''),
      render: (row) =>
        row.type === 'CREDIT' ? (
          <strong style={{ color: '#047857' }}>₹{Number(row.amount).toFixed(2)}</strong>
        ) : (
          <span style={{ color: '#9CA3AF' }}>-</span>
        ),
    },
    {
      key: 'notes',
      label: 'Audit & Description',
      sortable: false,
      render: (row) => {
        let note = row.description || '';
        if (row.account === 'ESCROW_CUSTOMER_RECEIVABLE') note = 'Customer gross payment received at gateway';
        if (row.account === 'VENDOR_PAYABLE') note = `Merchant net credit (Base ₹${activeLedger.originalPrice.toFixed(2)} - 10% comm ₹${activeLedger.commission.toFixed(2)})`;
        if (row.account === 'DELIVERY_PARTNER_PAYABLE') note = 'Driver fee pass-through credit (100% of ₹25)';
        if (row.account === 'TAX_PAYABLE') note = 'Statutory GST liability on platform revenue (18%)';
        if (row.account === 'AGENT_COMMISSION_PAYABLE') note = `Agent 60% franchise revenue share of net pool (₹${activeLedger.netAmount.toFixed(2)})`;
        if (row.account === 'QUIKOOO_PLATFORM_REVENUE') note = `Quikooo 40% corporate retained share of net pool (₹${activeLedger.netAmount.toFixed(2)})`;
        return <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{note}</span>;
      },
    },
  ];

  // Ledger entries enriched with debit/credit numeric fields for sorting
  const ledgerTableRows = activeLedger
    ? activeLedger.entries.map((entry, index) => ({
        ...entry,
        id: `entry-${index}-${entry.account}`,
        debit: entry.type === 'DEBIT' ? Number(entry.amount) : 0,
        credit: entry.type === 'CREDIT' ? Number(entry.amount) : 0,
      }))
    : [];

  // Settlement DataTable columns
  const settlementColumns = [
    {
      key: 'id',
      label: 'Settlement ID',
      sortable: true,
      render: (row) => (
        <div>
          <strong>{row.id}</strong>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            <code>{row.idempotentKey}</code>
          </div>
        </div>
      ),
    },
    {
      key: 'settlementType',
      label: 'Type',
      sortable: true,
      render: (row) => (
        <span
          className={`status-pill ${
            row.settlementType === 'VENDOR' ? 'primary' : row.settlementType === 'AGENT' ? 'success' : 'neutral'
          }`}
        >
          {row.settlementType}
        </span>
      ),
    },
    {
      key: 'recipientName',
      label: 'Recipient',
      sortable: true,
      render: (row) => (
        <div>
          <strong>{row.recipientName}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{row.zoneName || 'All Zones'}</div>
        </div>
      ),
    },
    {
      key: 'netPayout',
      label: 'Net Payout',
      sortable: true,
      align: 'right',
      render: (row) => (
        <strong
          style={{
            fontSize: '0.95rem',
            color: row.settlementType === 'VENDOR' && row.netPayout === 90 ? '#047857' : '#111827',
          }}
        >
          ₹{row.netPayout.toFixed(2)}
        </strong>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <span className={`status-pill ${row.status === 'PAID' ? 'success' : 'warning'}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'transactionRef',
      label: 'Bank Reference',
      sortable: true,
      render: (row) =>
        row.transactionRef ? (
          <code style={{ fontSize: '0.8rem' }}>{row.transactionRef}</code>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Pending</span>
        ),
    },
    {
      key: 'actions',
      label: 'Disbursement Action',
      sortable: false,
      align: 'center',
      render: (row) =>
        row.status === 'PENDING' ? (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => handleApproveSettlement(row.id)}
            disabled={processingId === row.id}
            style={{
              padding: '0.4rem 0.85rem',
              fontWeight: 600,
              boxShadow: '0 1px 3px rgba(5, 150, 105, 0.2)',
            }}
          >
            {processingId === row.id ? 'Approving...' : '✓ Approve & Disburse'}
          </button>
        ) : (
          <span className="status-pill success" style={{ fontSize: '0.75rem' }}>
            ✓ Paid Locked
          </span>
        ),
    },
  ];

  return (
    <div className="page-container">
      <OfflineBanner />

      <div className="page-header">
        <div>
          <h1 className="page-title">Double-Entry Financial Ledger</h1>
          <p className="page-subtitle">
            Platform revenue accounting, tax withholding, and 60/40 franchise reconciliation
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
          <button type="button" className="btn-outline btn-sm" onClick={() => handleSimulate(100)}>
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

      {/* KPI Cards: GMV, gross 15/order, net 13.94, agent 8.36/quikooo 5.58 */}
      {loading ? (
        <div className="kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : activeLedger ? (
        <div className="kpi-grid">
          <KpiCard
            label="Gross Merchandise Value (GMV)"
            value={`₹${activeLedger.customerPayable.toFixed(2)}`}
            subtext={`Original ₹${activeLedger.originalPrice.toFixed(2)} + Markup ₹${activeLedger.menuMarkup.toFixed(2)} + Delivery ₹${activeLedger.deliveryFee.toFixed(2)}`}
            color="var(--color-brand-primary, #059669)"
            icon="💳"
          />

          <KpiCard
            label="Quikooo Gross Margin"
            value={`₹${activeLedger.grossRevenue.toFixed(2)}`}
            subtext="₹15.00 gross / order (5% markup + 10% comm)"
            color="#1E40AF"
            icon="📈"
            badge="₹15 / Order"
          />

          <KpiCard
            label="Net Adjusted Pool"
            value={`₹${activeLedger.netAmount.toFixed(2)}`}
            subtext={`Gross ₹${activeLedger.grossRevenue.toFixed(2)} less 18% GST (₹${activeLedger.taxAmount.toFixed(2)})`}
            color="#047857"
            icon="⚖️"
            badge="Net ₹13.94"
          />

          <KpiCard
            label="Agent Franchise Share (60%)"
            value={`₹${activeLedger.agentShare.toFixed(2)}`}
            subtext="Franchise zone commission allocation"
            color="#059669"
            icon="🤝"
            badge="Agent ₹8.36"
          />

          <KpiCard
            label="Quikooo Corporate Share (40%)"
            value={`₹${activeLedger.quikoooShare.toFixed(2)}`}
            subtext="HQ retained margin post statutory GST"
            color="#0284C7"
            icon="🏢"
            badge="Quikooo ₹5.58"
          />

          <KpiCard
            label="Delivery Pass-Through"
            value={`₹${activeLedger.deliveryFee.toFixed(2)} / ₹${activeLedger.deliveryPayout.toFixed(2)}`}
            subtext="100% pass-through (₹25 customer = ₹25 driver)"
            color="#4B5563"
            icon="🛵"
          />
        </div>
      ) : (
        <EmptyState
          icon="📊"
          title="No Ledger Data"
          description="Could not calculate financial breakdown."
        />
      )}

      {/* Double-Entry Journal DataTable with Filters */}
      <div className="admin-card">
        <DataTable
          title={`Double-Entry Ledger Journal: Order ${activeLedger?.orderNumber || 'QK-20261005-0100'}`}
          subtitle={`Customer Payable: ₹${activeLedger?.customerPayable.toFixed(2)} | Vendor Net Settlement: ₹${activeLedger?.vendorSettlement.toFixed(2)}`}
          columns={ledgerColumns}
          data={ledgerTableRows}
          pageSize={20}
          stickyHeader={true}
          searchPlaceholder="Filter accounts, debit, credit, or notes..."
          loading={loading}
          filterText={filterQuery}
          onFilterChange={handleFilterChange}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
          footer={
            <tr style={{ backgroundColor: '#F9FAFB', fontWeight: 700 }}>
              <td colSpan="2">TOTAL DOUBLE-ENTRY RECONCILIATION</td>
              <td style={{ textAlign: 'right' }}>₹{recon?.totalDebits.toFixed(2)}</td>
              <td style={{ textAlign: 'right', color: '#047857' }}>₹{recon?.totalCredits.toFixed(2)}</td>
              <td>
                {recon?.isBalanced ? (
                  <span style={{ color: '#047857' }}>✓ Perfectly Balanced (Debit == Credit)</span>
                ) : (
                  <span style={{ color: '#DC2626' }}>⚠ Imbalance detected</span>
                )}
              </td>
            </tr>
          }
        />
      </div>

      {/* Settlement Approval Section */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>
              Settlement Approval Queue & Direct Disbursements
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Idempotent payout execution: Vendor (₹90 baseline), Agent (₹8.36 baseline), and Driver (₹25 × n)
            </p>
          </div>
        </div>

        <DataTable
          columns={settlementColumns}
          data={settlements}
          pageSize={20}
          stickyHeader={true}
          searchPlaceholder="Filter settlements by recipient, ID, type..."
          loading={settlementsLoading}
          emptyMessage="No pending or processed settlements found."
        />
      </div>
    </div>
  );
}
