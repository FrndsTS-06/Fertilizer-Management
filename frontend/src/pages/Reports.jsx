import React, { useState } from 'react';

export default function Reports({ subItem = 'sales-report', onNavigate }) {
  const [dateRange, setDateRange] = useState('this-month');

  return (
    <div>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            05. Reports
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Business Performance and Accounts · GST Filing, Profit Margins & Stock Valuation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => alert('Exporting report as Excel (.xlsx)...')}
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>📊</span> Export Excel
          </button>
          <button
            onClick={() => alert('Exporting report as PDF...')}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)'
            }}
          >
            <span>📄</span> Download PDF
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '0.75rem',
        marginBottom: '1.5rem',
        overflowX: 'auto'
      }}>
        {[
          { id: 'stock-report', label: 'Stock Report' },
          { id: 'purchase-report', label: 'Purchase Report' },
          { id: 'sales-report', label: 'Sales Report' },
          { id: 'customer-dues-report', label: 'Customer Dues Report' },
          { id: 'payment-report', label: 'Payment Report' },
          { id: 'profit-report', label: 'Profit Report', highlight: true },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate && onNavigate('reports', tab.id)}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: subItem === tab.id ? '#0f172a' : '#f1f5f9',
              color: subItem === tab.id ? '#ffffff' : '#475569',
              fontSize: '0.825rem',
              fontWeight: subItem === tab.id ? '700' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range Selector */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Time Period:</span>
          {['today', 'this-week', 'this-month', 'fy-2025-26'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              style={{
                background: dateRange === range ? '#e0f2fe' : 'transparent',
                color: dateRange === range ? '#0284c7' : '#64748b',
                border: dateRange === range ? '1px solid #bae6fd' : '1px solid transparent',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {range.replace('-', ' ').toUpperCase()}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Active View: <b>{subItem.replace('-', ' ').toUpperCase()}</b>
        </span>
      </div>

      {/* Summary KPI Cards for Reports */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>TOTAL TURNOVER</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginTop: '0.25rem' }}>₹4,82,300</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>↑ +18% vs last month</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>GROSS PROFIT</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#059669', marginTop: '0.25rem' }}>₹68,450</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Avg Margin: 14.2%</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>TOTAL OUTSTANDING</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#dc2626', marginTop: '0.25rem' }}>₹48,200</div>
          <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.2rem' }}>12 Farmers</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>CLOSING STOCK VALUE</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0284c7', marginTop: '0.25rem' }}>₹8,12,000</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Warehouse inventory</div>
        </div>
      </div>
    </div>
  );
}
