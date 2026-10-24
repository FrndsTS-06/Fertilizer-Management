import React from 'react';

export default function Dashboard({ subItem = 'sales-summary', onNavigate }) {
  return (
    <div>
      {/* Page Title & Subtitle */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            01. Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Business Overview & Real-time Retail Analytics
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate && onNavigate('purchase-sales', 'create-sale')}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)'
            }}
          >
            <span>⚡</span> Quick Sale / New Bill
          </button>
          <button
            onClick={() => onNavigate && onNavigate('products-stock', 'update-stock')}
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Update Stock
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Card 1: Today's Sales */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Today's Revenue</span>
            <span style={{ fontSize: '1.25rem', background: '#dcfce7', padding: '0.25rem 0.5rem', borderRadius: '8px' }}>💰</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 0.2rem 0' }}>₹84,520</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>↑ +14.2% from yesterday</div>
        </div>

        {/* Card 2: Stock Summary */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total Stock in Bags</span>
            <span style={{ fontSize: '1.25rem', background: '#e0f2fe', padding: '0.25rem 0.5rem', borderRadius: '8px' }}>📦</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 0.2rem 0' }}>1,480 Bags</div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '600' }}>42 active SKUs</div>
        </div>

        {/* Card 3: Low-Stock Alerts */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #fed7aa',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#c2410c', textTransform: 'uppercase' }}>Low Stock Alerts</span>
            <span style={{ fontSize: '1.25rem', background: '#ffedd5', padding: '0.25rem 0.5rem', borderRadius: '8px' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#ea580c', margin: '0.5rem 0 0.2rem 0' }}>3 Items</div>
          <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>Urea, Potash, Zinc Sulfate</div>
        </div>

        {/* Card 4: Customer Outstanding */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Farmer Khata Dues</span>
            <span style={{ fontSize: '1.25rem', background: '#fef2f2', padding: '0.25rem 0.5rem', borderRadius: '8px' }}>🌾</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#991b1b', margin: '0.5rem 0 0.2rem 0' }}>₹48,200</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Across 12 pending farmers</div>
        </div>
      </div>

      {/* Dynamic Sub-item Sections */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            {subItem === 'sales-summary' && '📊 Daily Sales Breakdown & Peak Hours'}
            {subItem === 'stock-summary' && '📦 Warehouse Stock Distribution by Category'}
            {subItem === 'low-stock-alerts' && '⚠️ Immediate Reorder & Low-Stock Warnings'}
            {subItem === 'recent-transactions' && '🧾 Real-Time Recent Billing Transactions'}
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Filtered by active sub-view: <b>{subItem}</b></span>
        </div>

        {subItem === 'low-stock-alerts' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.75rem' }}>Product</th>
                <th style={{ padding: '0.75rem' }}>Brand / Supplier</th>
                <th style={{ padding: '0.75rem' }}>Remaining Stock</th>
                <th style={{ padding: '0.75rem' }}>Threshold</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontWeight: '600' }}>Neem Coated Urea (46% N)</td>
                <td style={{ padding: '0.75rem' }}>IFFCO</td>
                <td style={{ padding: '0.75rem', color: '#ef4444', fontWeight: '700' }}>12 Bags</td>
                <td style={{ padding: '0.75rem' }}>50 Bags</td>
                <td style={{ padding: '0.75rem' }}><span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>CRITICAL</span></td>
                <td style={{ padding: '0.75rem' }}><button style={{ background: '#059669', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>Order Purchase</button></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontWeight: '600' }}>MOP (Muriate of Potash)</td>
                <td style={{ padding: '0.75rem' }}>KRIBHCO</td>
                <td style={{ padding: '0.75rem', color: '#ea580c', fontWeight: '700' }}>18 Bags</td>
                <td style={{ padding: '0.75rem' }}>30 Bags</td>
                <td style={{ padding: '0.75rem' }}><span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>LOW</span></td>
                <td style={{ padding: '0.75rem' }}><button style={{ background: '#059669', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>Order Purchase</button></td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.75rem' }}>Bill No.</th>
                <th style={{ padding: '0.75rem' }}>Customer / Farmer</th>
                <th style={{ padding: '0.75rem' }}>Items Purchased</th>
                <th style={{ padding: '0.75rem' }}>Amount</th>
                <th style={{ padding: '0.75rem' }}>Payment Mode</th>
                <th style={{ padding: '0.75rem' }}>Time</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: '600' }}>INV-2026-0891</td>
                <td style={{ padding: '0.75rem' }}>Shivaji Patil (Wadgaon)</td>
                <td style={{ padding: '0.75rem' }}>5 Bags DAP 18:46:0</td>
                <td style={{ padding: '0.75rem', fontWeight: '700' }}>₹6,750</td>
                <td style={{ padding: '0.75rem' }}><span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Cash</span></td>
                <td style={{ padding: '0.75rem', color: '#64748b' }}>20 mins ago</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: '600' }}>INV-2026-0890</td>
                <td style={{ padding: '0.75rem' }}>Anand Deshmukh (Pimpal)</td>
                <td style={{ padding: '0.75rem' }}>10 Bags NPK 10:26:26 + 1L Micronutrient</td>
                <td style={{ padding: '0.75rem', fontWeight: '700' }}>₹15,400</td>
                <td style={{ padding: '0.75rem' }}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>UPI / QR</span></td>
                <td style={{ padding: '0.75rem', color: '#64748b' }}>1 hour ago</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: '600' }}>INV-2026-0889</td>
                <td style={{ padding: '0.75rem' }}>Balasaheb Shinde</td>
                <td style={{ padding: '0.75rem' }}>4 Bags Urea</td>
                <td style={{ padding: '0.75rem', fontWeight: '700' }}>₹1,066</td>
                <td style={{ padding: '0.75rem' }}><span style={{ background: '#fef2f2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Credit (Khata)</span></td>
                <td style={{ padding: '0.75rem', color: '#64748b' }}>2 hours ago</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
