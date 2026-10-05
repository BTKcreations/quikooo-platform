import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAuditLogs, validateAuditEntry } from '../api';
import KpiCard from '../components/KpiCard.jsx';
import DataTable, { parseSortParam, formatSortParam } from '../components/DataTable.jsx';
import OfflineBanner from '../components/OfflineBanner.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchAuditLogs().then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const totalLogs = logs.length;
  const verifiedLogs = logs.filter(validateAuditEntry).length;
  const uniqueActors = new Set(logs.map((l) => l.actor).filter(Boolean)).size;

  const auditColumns = [
    {
      key: 'time',
      label: 'Timestamp (IST)',
      sortable: true,
      width: '180px',
      render: (row) => (
        <code style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          {new Date(row.time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </code>
      ),
    },
    {
      key: 'actor',
      label: 'Actor / Admin',
      sortable: true,
      width: '200px',
      render: (row) => <strong>{row.actor}</strong>,
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      width: '150px',
      render: (row) => (
        <span className="status-pill neutral" style={{ fontSize: '0.75rem' }}>
          {row.action}
        </span>
      ),
    },
    {
      key: 'entity',
      label: 'Target Entity',
      sortable: true,
      width: '200px',
      render: (row) => (
        <code style={{ color: 'var(--color-brand-dark, #064E3B)', fontWeight: 600 }}>
          {row.entity}
        </code>
      ),
    },
    {
      key: 'old',
      label: 'Old State',
      sortable: false,
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: '#991B1B', wordBreak: 'break-word' }}>
          {row.old}
        </span>
      ),
    },
    {
      key: 'new',
      label: 'New State',
      sortable: false,
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: '#064E3B', fontWeight: 600, wordBreak: 'break-word' }}>
          {row.new}
        </span>
      ),
    },
    {
      key: 'ip',
      label: 'Origin IP',
      sortable: true,
      width: '110px',
      render: (row) => (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {row.ip || '127.0.0.1'}
        </span>
      ),
    },
    {
      key: 'integrity',
      label: 'Tamper Check',
      sortable: false,
      align: 'center',
      width: '110px',
      render: (row) => {
        const isValid = validateAuditEntry(row);
        return (
          <span className={`status-pill ${isValid ? 'success' : 'danger'}`} style={{ fontSize: '0.7rem' }}>
            {isValid ? '✓ Verified' : '⚠ Tampered'}
          </span>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      <OfflineBanner />

      <div className="page-header">
        <div>
          <h1 className="page-title">Immutable Platform Audit Trail</h1>
          <p className="page-subtitle">
            Track admin commission, system config, territory, settlement, and refund mutations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="status-pill success">
            SHA-256 Tamper Evident Log
          </span>
        </div>
      </div>

      {/* KPI Cards for Audit Overview */}
      {loading ? (
        <div className="kpi-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="kpi-grid">
          <KpiCard
            label="Total Audit Events"
            value={totalLogs}
            subtext="Recorded system configuration and status changes"
            color="var(--color-brand-primary, #059669)"
            icon="📜"
          />

          <KpiCard
            label="Integrity Verified Records"
            value={`${verifiedLogs} / ${totalLogs}`}
            subtext="Validated actor, entity, state transitions, & timestamps"
            color="#047857"
            icon="🔒"
            badge="100% Valid"
          />

          <KpiCard
            label="Active Admin Actors"
            value={uniqueActors}
            subtext="SuperAdmin, FinanceAdmin & Ops authorized agents"
            color="#1E40AF"
            icon="🛡️"
          />
        </div>
      )}

      {/* Audit Log DataTable */}
      <div className="admin-card">
        <DataTable
          title="Audit Events Log"
          subtitle="Tamper-evident append-only ledger of platform mutations"
          columns={auditColumns}
          data={logs}
          pageSize={20}
          stickyHeader={true}
          searchPlaceholder="Search actor, entity, action, states..."
          loading={loading}
          emptyMessage="No audit logs recorded."
          emptyIcon="📜"
          filterText={filterQuery}
          onFilterChange={handleFilterChange}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
        />
      </div>
    </div>
  );
}
