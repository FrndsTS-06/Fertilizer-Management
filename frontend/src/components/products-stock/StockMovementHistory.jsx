import React, { useState } from 'react';

/**
 * StockMovementHistory - Redesigned with FTS Navy & Electric Blue Theme
 * Dedicated view or drawer showing stock movements (Purchases, Sales, Manual Adjustments).
 * Palette: #0B1F3A, #2563EB, #FFFFFF, #F1F5F9, #1E293B, #06B6D4
 */
export default function StockMovementHistory({ movements = [], onRefresh, isDrawer = false, onClose }) {
  const [filterType, setFilterType] = useState('All');
  const [searchProduct, setSearchProduct] = useState('');

  const filteredMovements = movements.filter((m) => {
    if (filterType !== 'All' && m.type !== filterType) return false;
    if (searchProduct) {
      const q = searchProduct.toLowerCase();
      return (
        m.productName.toLowerCase().includes(q) ||
        m.productCode.toLowerCase().includes(q) ||
        (m.reference && m.reference.toLowerCase().includes(q)) ||
        (m.reason && m.reason.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case 'PURCHASE':
        return { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', label: '📥 Purchase' };
      case 'SALE':
        return { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', label: '🛒 Customer Sale' };
      case 'ADJUSTMENT':
      default:
        return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: '⚖️ Manual Adjustment' };
    }
  };

  const content = (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: isDrawer ? '0' : '12px',
      border: isDrawer ? 'none' : '1px solid #E2E8F0',
      overflow: 'hidden',
      boxShadow: isDrawer ? 'none' : '0 1px 3px rgba(11, 31, 58, 0.04)',
    }}>
      {/* Table Header Filter Bar */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        backgroundColor: '#0B1F3A', // Navy
        color: '#FFFFFF',
      }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
            Stock Movement History & Audit Ledger
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#06B6D4', margin: '2px 0 0 0', fontWeight: '600' }}>
            Comprehensive log of automatic Purchases, Sales, and Manual Adjustments
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search by product, reason, reference..."
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #1E293B',
              backgroundColor: '#FFFFFF',
              color: '#0B1F3A',
              fontSize: '0.825rem',
              width: '260px',
              outline: 'none',
            }}
          />

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #1E293B',
              backgroundColor: '#FFFFFF',
              color: '#0B1F3A',
              fontSize: '0.825rem',
              outline: 'none',
              fontWeight: '600',
            }}
          >
            <option value="All">All Types</option>
            <option value="PURCHASE">Purchases (Stock In)</option>
            <option value="SALE">Sales (Stock Out)</option>
            <option value="ADJUSTMENT">Manual Adjustments</option>
          </select>

          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563EB', // Electric Blue
                color: '#FFFFFF',
                fontSize: '0.825rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              🔄 Refresh
            </button>
          )}

          {isDrawer && onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#FFFFFF',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Movement Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{
              backgroundColor: '#F8FAFC',
              borderBottom: '2px solid #E2E8F0',
              color: '#1E293B',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: '700',
            }}>
              <th style={{ padding: '0.85rem 1.25rem' }}>Timestamp</th>
              <th style={{ padding: '0.85rem 1rem' }}>Product Details</th>
              <th style={{ padding: '0.85rem 1rem' }}>Type</th>
              <th style={{ padding: '0.85rem 1rem' }}>Quantity Change</th>
              <th style={{ padding: '0.85rem 1rem' }}>Stock Balance</th>
              <th style={{ padding: '0.85rem 1rem' }}>Reason / Notes</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Reference No.</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                  No stock movement records found for this filter.
                </td>
              </tr>
            ) : (
              filteredMovements.map((m, idx) => {
                const badge = getTypeBadge(m.type);
                const isPositive = m.changeQty > 0;
                const isEven = idx % 2 === 1;

                return (
                  <tr
                    key={m.id}
                    style={{
                      backgroundColor: isEven ? '#F8FAFC' : '#FFFFFF',
                      borderBottom: '1px solid #E2E8F0',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isEven ? '#F8FAFC' : '#FFFFFF')}
                  >
                    {/* Timestamp */}
                    <td style={{ padding: '0.85rem 1.25rem', color: '#64748B', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                        {new Date(m.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Product Details */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '700', color: '#0B1F3A' }}>{m.productName}</div>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}>
                        {m.productCode}
                      </span>
                    </td>

                    {/* Type */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        fontSize: '0.75rem',
                        fontWeight: '700',
                      }}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Quantity Change */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        fontWeight: '800',
                        fontSize: '0.95rem',
                        color: isPositive ? '#059669' : '#DC2626',
                        fontFeatureSettings: '"tnum"',
                      }}>
                        {isPositive ? `+${m.changeQty}` : m.changeQty}
                      </span>
                    </td>

                    {/* Balance */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600' }}>
                        <span style={{ color: '#64748B' }}>{m.previousStock}</span>
                        <span style={{ color: '#94A3B8' }}>→</span>
                        <span style={{ color: '#0B1F3A', fontWeight: '800' }}>{m.newStock}</span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td style={{ padding: '0.85rem 1rem', color: '#334155', maxWidth: '240px' }}>
                      {m.reason}
                    </td>

                    {/* Reference */}
                    <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748B' }}>
                      {m.reference || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isDrawer) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(11, 31, 58, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '850px',
          height: '100%',
          backgroundColor: '#FFFFFF',
          boxShadow: '-4px 0 25px rgba(11, 31, 58, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
