import React, { useState, useMemo } from 'react';
import EmptyState from './EmptyState.jsx';
import { Skeleton } from './Skeleton.jsx';

/**
 * Pure helper function to paginate an array of items.
 *
 * @param {Array} items - Array of data rows
 * @param {number} page - Current page (1-indexed)
 * @param {number} pageSize - Number of items per page (default: 20)
 * @returns {Array} - Paginated slice of items
 */
export function paginateData(items = [], page = 1, pageSize = 20) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.max(1, parseInt(pageSize, 10) || 20);
  const startIndex = (safePage - 1) * size;
  return items.slice(startIndex, startIndex + size);
}

/**
 * Pure helper returning full pagination metadata and sliced items.
 */
export function paginateTable(items = [], page = 1, pageSize = 20) {
  const totalItems = Array.isArray(items) ? items.length : 0;
  const size = Math.max(1, parseInt(pageSize, 10) || 20);
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const safePage = Math.min(Math.max(1, parseInt(page, 10) || 1), totalPages);
  const startIndex = (safePage - 1) * size;
  const pagedItems = Array.isArray(items) ? items.slice(startIndex, startIndex + size) : [];

  return {
    items: pagedItems,
    page: safePage,
    pageSize: size,
    totalPages,
    totalItems,
    startIndex,
    endIndex: Math.min(startIndex + size, totalItems),
  };
}

export default function DataTable({
  columns = [],
  data = [],
  pageSize = 20,
  stickyHeader = true,
  searchPlaceholder = 'Filter records...',
  loading = false,
  emptyMessage = 'No matching records found',
  emptyTitle = 'No data available',
  emptyIcon = '🔍',
  actions,
  title,
  subtitle,
  footer,
  rowKey = (row, index) => row.id || row.code || index,
  className = '',
  maxHeight = '650px',
}) {
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Reset to page 1 whenever filter changes
  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
    setCurrentPage(1);
  };

  // Sort handler
  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key: columnKey, direction: 'asc' };
    });
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!filterText.trim()) return data;

    const term = filterText.toLowerCase().trim();
    return data.filter((row) => {
      // Check column explicit filter values or fall back to row object values
      for (const col of columns) {
        if (col.filterValue && typeof col.filterValue === 'function') {
          const val = col.filterValue(row);
          if (val !== undefined && val !== null && String(val).toLowerCase().includes(term)) {
            return true;
          }
        }
        if (col.key && row[col.key] !== undefined && row[col.key] !== null) {
          if (String(row[col.key]).toLowerCase().includes(term)) {
            return true;
          }
        }
      }

      // Check all own values in row object
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return JSON.stringify(val).toLowerCase().includes(term);
        }
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, filterText, columns]);

  // Sorted dataset
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    const { key, direction } = sortConfig;
    return [...filteredData].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Numeric comparison
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination calculation
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = useMemo(() => {
    return paginateData(sortedData, activePage, pageSize);
  }, [sortedData, activePage, pageSize]);

  const startEntry = totalItems === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const endEntry = Math.min(activePage * pageSize, totalItems);

  return (
    <div className={`data-table-container ${className}`}>
      {/* Table Header Controls (Title, Filter Input, Custom Actions) */}
      <div
        className="data-table-toolbar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          {title && (
            <h2 className="card-title" style={{ margin: 0 }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <input
              type="text"
              className="form-input data-table-filter-input"
              placeholder={searchPlaceholder}
              value={filterText}
              onChange={handleFilterChange}
              style={{
                paddingRight: filterText ? '2rem' : '0.85rem',
                fontSize: '0.85rem',
                paddingTop: '0.45rem',
                paddingBottom: '0.45rem',
              }}
              aria-label="Filter table data"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => {
                  setFilterText('');
                  setCurrentPage(1);
                }}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
                aria-label="Clear filter"
              >
                ✕
              </button>
            )}
          </div>

          {actions && <div>{actions}</div>}
        </div>
      </div>

      {/* Table Scroll Container with Sticky Header */}
      <div
        className="table-responsive data-table-scroll-wrapper"
        style={{
          maxHeight: maxHeight,
          overflowY: maxHeight !== 'none' ? 'auto' : 'visible',
          border: '1px solid var(--color-surface-subtle, #F3F4F0)',
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <table className="admin-table">
          <thead
            style={
              stickyHeader
                ? {
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#F9FAFB',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }
                : undefined
            }
          >
            <tr>
              {columns.map((col, idx) => {
                const isSortable = col.sortable !== false;
                const isSorted = sortConfig.key === col.key;
                return (
                  <th
                    key={col.key || idx}
                    style={{
                      width: col.width,
                      textAlign: col.align || 'left',
                      cursor: isSortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      backgroundColor: '#F9FAFB',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => isSortable && col.key && handleSort(col.key)}
                    aria-sort={isSorted ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                      }}
                    >
                      <span>{col.label}</span>
                      {isSortable && col.key && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: isSorted ? 'var(--color-brand-primary, #059669)' : '#9CA3AF',
                          }}
                        >
                          {isSorted ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} style={{ padding: '0.85rem 1rem' }}>
                      <Skeleton height="1.1rem" width={cIdx === 0 ? '70%' : '50%'} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={filterText ? `No records matching "${filterText}".` : emptyMessage}
                    actionText={filterText ? 'Clear filter' : undefined}
                    onAction={filterText ? () => setFilterText('') : undefined}
                  />
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => (
                <tr key={rowKey(row, rIdx)}>
                  {columns.map((col, cIdx) => (
                    <td
                      key={col.key || cIdx}
                      style={{
                        textAlign: col.align || 'left',
                        verticalAlign: 'middle',
                      }}
                    >
                      {col.render ? col.render(row, rIdx) : (row[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>

      {/* Pagination Footer (20/page) */}
      {!loading && totalItems > 0 && (
        <div
          className="data-table-pagination"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.75rem 0.25rem 0.25rem 0.25rem',
            fontSize: '0.825rem',
            color: 'var(--color-text-secondary, #4B5563)',
          }}
        >
          <div>
            Showing <strong>{startEntry}</strong> to <strong>{endEntry}</strong> of <strong>{totalItems}</strong> records
            {filterText && ` (filtered from ${data.length})`}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={activePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                opacity: activePage <= 1 ? 0.5 : 1,
                cursor: activePage <= 1 ? 'not-allowed' : 'pointer',
              }}
              aria-label="Previous page"
            >
              ← Prev
            </button>

            <span style={{ padding: '0 0.5rem', fontWeight: 600 }}>
              Page {activePage} of {totalPages}
            </span>

            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                opacity: activePage >= totalPages ? 0.5 : 1,
                cursor: activePage >= totalPages ? 'not-allowed' : 'pointer',
              }}
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
