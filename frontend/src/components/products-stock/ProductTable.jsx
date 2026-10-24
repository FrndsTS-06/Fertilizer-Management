import React, { useState } from 'react';

/**
 * ProductTable - Redesigned with FTS Premium Navy & Electric Blue Theme
 * Columns: Product Photo, Product Name, Product Code, Unit, Current Stock, Stock Status, Actions
 * Palette: #0B1F3A, #2563EB, #FFFFFF, #F1F5F9, #1E293B, #06B6D4
 */
export default function ProductTable({
  products = [],
  onViewDetails,
  onUpdateStock,
  onEditProduct,
  pageSize = 8,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  // Status indicator styling (Restrained green, amber, red)
  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return {
          bg: '#ECFDF5',
          color: '#065F46',
          border: '#A7F3D0',
          dot: '#10B981',
          label: 'In Stock',
        };
      case 'Low Stock':
        return {
          bg: '#FFFBEB',
          color: '#92400E',
          border: '#FDE68A',
          dot: '#F59E0B',
          label: 'Low Stock',
        };
      case 'Out of Stock':
      default:
        return {
          bg: '#FEF2F2',
          color: '#991B1B',
          border: '#FECACA',
          dot: '#EF4444',
          label: 'Out of Stock',
        };
    }
  };

  // Pagination calculations
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedProducts = products.slice(startIndex, startIndex + pageSize);

  // Empty state
  if (totalItems === 0) {
    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '3.5rem 2rem',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          backgroundColor: '#F1F5F9',
          color: '#2563EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          margin: '0 auto 1rem auto',
        }}>
          📦
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0B1F3A', margin: '0 0 0.5rem 0' }}>
          No Matching Products Found
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto' }}>
          There are no products matching your current search query or filter selection.
          Try clearing your query or adjusting the filters above.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)',
    }}>
      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.875rem',
        }}>
          <thead>
            <tr style={{
              backgroundColor: '#0B1F3A', // Navy Heading background
              color: '#FFFFFF',
              borderBottom: '2px solid #1E293B',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              fontWeight: '700',
            }}>
              <th style={{ padding: '0.9rem 1.25rem', width: '70px' }}>Photo</th>
              <th style={{ padding: '0.9rem 1rem' }}>Product Name</th>
              <th style={{ padding: '0.9rem 1rem' }}>Product Code</th>
              <th style={{ padding: '0.9rem 1rem' }}>Unit</th>
              <th style={{ padding: '0.9rem 1rem' }}>Current Stock</th>
              <th style={{ padding: '0.9rem 1rem' }}>Stock Status</th>
              <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((prod, idx) => {
              const badge = getStatusBadge(prod.status);
              const isEven = idx % 2 === 1;

              return (
                <tr
                  key={prod.id}
                  style={{
                    backgroundColor: isEven ? '#F8FAFC' : '#FFFFFF', // Alternating subtle surface
                    borderBottom: '1px solid #E2E8F0',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isEven ? '#F8FAFC' : '#FFFFFF')}
                >
                  {/* 1. Product Photo (consistently sized and cropped) */}
                  <td style={{ padding: '0.75rem 1.25rem', verticalAlign: 'middle' }}>
                    <img
                      src={prod.photo}
                      alt={prod.name}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#F1F5F9',
                        display: 'block',
                      }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60';
                      }}
                    />
                  </td>

                  {/* 2. Product Name */}
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <div style={{
                      fontWeight: '700',
                      color: '#0B1F3A',
                      lineHeight: '1.3',
                    }}>
                      {prod.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                      {prod.category} · <span style={{ color: '#06B6D4', fontWeight: '600' }}>{prod.brand || 'Standard'}</span>
                    </div>
                  </td>

                  {/* 3. Product Code */}
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      fontSize: '0.825rem',
                      color: '#2563EB', // Electric Blue
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(37, 99, 235, 0.2)',
                    }}>
                      {prod.code}
                    </span>
                  </td>

                  {/* 4. Unit */}
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', color: '#1E293B', fontWeight: '600' }}>
                    {prod.unit}
                  </td>

                  {/* 5. Current Stock (with Cyan highlights for neutral count) */}
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{
                        fontWeight: '800',
                        fontSize: '1.05rem',
                        color: prod.stock <= 0 ? '#DC2626' : '#0B1F3A',
                        fontFeatureSettings: '"tnum"',
                      }}>
                        {prod.stock}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        / min {prod.minThreshold}
                      </span>
                    </div>

                    {/* Subtle stock bar with Cyan accent */}
                    <div style={{
                      width: '90px',
                      height: '4px',
                      backgroundColor: '#E2E8F0',
                      borderRadius: '9999px',
                      marginTop: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, (prod.stock / (prod.minThreshold * 2 || 1)) * 100)}%`,
                        backgroundColor: prod.stock <= 0 ? '#EF4444' : prod.stock <= prod.minThreshold ? '#F59E0B' : '#06B6D4', // Cyan
                        borderRadius: '9999px',
                      }} />
                    </div>
                  </td>

                  {/* 6. Stock Status (Restrained green, amber, red) */}
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: badge.dot,
                      }} />
                      {badge.label}
                    </span>
                  </td>

                  {/* 7. Actions: View Details and Update Stock */}
                  <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Update Stock Action Button */}
                      <button
                        onClick={() => onUpdateStock && onUpdateStock(prod)}
                        style={{
                          backgroundColor: '#2563EB', // Electric Blue
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.775rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
                        title="Adjust stock quantity"
                      >
                        Update Stock
                      </button>

                      {/* View Details Action */}
                      <button
                        onClick={() => onViewDetails && onViewDetails(prod)}
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: '#0B1F3A',
                          border: '1px solid #CBD5E1',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.775rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#E2E8F0';
                          e.currentTarget.style.borderColor = '#94A3B8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F1F5F9';
                          e.currentTarget.style.borderColor = '#CBD5E1';
                        }}
                        title="View comprehensive product details"
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer Controls */}
      <div style={{
        padding: '0.85rem 1.5rem',
        borderTop: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
          Showing <b>{startIndex + 1}</b> to <b>{Math.min(startIndex + pageSize, totalItems)}</b> of <b>{totalItems}</b> products
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                padding: '0.35rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: safePage === 1 ? '#F8FAFC' : '#FFFFFF',
                color: safePage === 1 ? '#94A3B8' : '#0B1F3A',
                fontSize: '0.8rem',
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: safePage === pageNum ? '1px solid #2563EB' : '1px solid #CBD5E1',
                  backgroundColor: safePage === pageNum ? '#2563EB' : '#FFFFFF',
                  color: safePage === pageNum ? '#FFFFFF' : '#0B1F3A',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                padding: '0.35rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: safePage === totalPages ? '#F8FAFC' : '#FFFFFF',
                color: safePage === totalPages ? '#94A3B8' : '#0B1F3A',
                fontSize: '0.8rem',
                cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
