import React from 'react';

/**
 * StockSummaryCards - Redesigned with FTS Premium Navy & Electric Blue Theme
 * Shared Palette: #0B1F3A, #2563EB, #FFFFFF, #F1F5F9, #1E293B, #06B6D4
 */
export default function StockSummaryCards({ summary, activeStatus, onFilterStatus }) {
  const cards = [
    {
      id: 'total',
      filterValue: 'All',
      title: 'Total Products',
      value: summary?.totalProducts ?? 0,
      unit: 'SKUs Cataloged',
      icon: '📦',
      accentColor: '#2563EB', // Electric Blue
      badgeBg: 'rgba(37, 99, 235, 0.08)',
      highlightBorder: '#2563EB',
    },
    {
      id: 'stock',
      filterValue: 'In Stock',
      title: 'Total Stock Quantity',
      value: summary?.totalAvailableStock ?? 0,
      unit: 'Bags & Units on Hand',
      icon: '📊',
      accentColor: '#06B6D4', // Electric Cyan highlight
      badgeBg: 'rgba(6, 182, 212, 0.1)',
      highlightBorder: '#06B6D4',
    },
    {
      id: 'low',
      filterValue: 'Low Stock',
      title: 'Low Stock',
      value: summary?.lowStockCount ?? 0,
      unit: 'Items Below Threshold',
      icon: '⚠️',
      accentColor: '#D97706', // Restrained Amber
      badgeBg: '#FFFBEB',
      highlightBorder: '#F59E0B',
      isWarning: (summary?.lowStockCount ?? 0) > 0,
    },
    {
      id: 'out',
      filterValue: 'Out of Stock',
      title: 'Out of Stock',
      value: summary?.outOfStockCount ?? 0,
      unit: 'Reorder Immediately',
      icon: '🚫',
      accentColor: '#DC2626', // Restrained Red
      badgeBg: '#FEF2F2',
      highlightBorder: '#EF4444',
      isDanger: (summary?.outOfStockCount ?? 0) > 0,
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1.25rem',
      marginBottom: '1.75rem',
    }}>
      {cards.map((card) => {
        const isSelected = activeStatus === card.filterValue;

        return (
          <div
            key={card.id}
            onClick={() => onFilterStatus && onFilterStatus(card.filterValue)}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '1.25rem 1.4rem',
              border: isSelected
                ? `2px solid ${card.highlightBorder}`
                : '1px solid #E2E8F0',
              boxShadow: isSelected
                ? `0 6px 16px rgba(37, 99, 235, 0.12), 0 0 0 1px ${card.highlightBorder}`
                : '0 1px 3px rgba(11, 31, 58, 0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top decorative accent pill */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: isSelected ? card.accentColor : 'transparent',
              transition: 'background-color 0.2s ease',
            }} />

            {/* Title & Icon Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{
                  fontSize: '0.775rem',
                  fontWeight: '700',
                  color: '#1E293B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {card.title}
                </span>
                <div style={{
                  fontSize: '2.1rem',
                  fontWeight: '800',
                  color: card.isDanger ? '#DC2626' : card.isWarning ? '#D97706' : '#0B1F3A',
                  lineHeight: '1.15',
                  marginTop: '0.4rem',
                  letterSpacing: '-0.025em',
                  fontFeatureSettings: '"tnum"',
                }}>
                  {card.value.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: card.badgeBg,
                color: card.accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                border: `1px solid ${card.accentColor}25`,
              }}>
                {card.icon}
              </div>
            </div>

            {/* Bottom Subtext & Active Filter Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #F1F5F9',
            }}>
              <span style={{
                fontSize: '0.75rem',
                color: '#64748B',
                fontWeight: '500',
              }}>
                {card.unit}
              </span>

              <span style={{
                fontSize: '0.725rem',
                fontWeight: '700',
                color: isSelected ? card.accentColor : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                {isSelected ? (
                  <>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: card.accentColor,
                    }} />
                    Active Filter
                  </>
                ) : (
                  'Filter'
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
