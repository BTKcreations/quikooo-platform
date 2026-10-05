import React, { useState, useEffect } from 'react';
import { fetchAuditLogs, validateAuditEntry } from '../api';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAuditLogs().then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.actor?.toLowerCase().includes(term) ||
      log.entity?.toLowerCase().includes(term) ||
      log.action?.toLowerCase().includes(term) ||
      log.new?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Immutable Platform Audit Trail</h1>
          <p className="page-subtitle">Track admin commission, system config, territory, settlement, and refund mutations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '260px' }}
            placeholder="Search actor, entity, action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-card">
        <h2 className="card-title">
          <span>Audit Events Log ({filteredLogs.length})</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>
            Tamper-evident system log
          </span>
        </h2>

        {loading ? (
          <p>Loading audit entries...</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp (Time)</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Old State</th>
                  <th>New State</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isValid = validateAuditEntry(log);
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        <code>{new Date(log.time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</code>
                      </td>
                      <td>
                        <strong>{log.actor}</strong>
                      </td>
                      <td>
                        <span className="status-pill neutral">
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <code style={{ color: 'var(--color-brand-dark)', fontWeight: 600 }}>{log.entity}</code>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#991B1B', maxWidth: '200px', wordBreak: 'break-word' }}>
                        {log.old}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#064E3B', fontWeight: 600, maxWidth: '240px', wordBreak: 'break-word' }}>
                        {log.new}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {log.ip || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
