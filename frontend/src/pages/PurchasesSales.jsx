import React, { useState } from 'react';

export default function PurchasesSales({ subItem = 'create-sale', onNavigate }) {
  // Billing state for Create Sale / New Bill
  const [billItems, setBillItems] = useState([
    { id: 1, name: 'Neem Coated Urea (46% N) 45kg', price: 266.5, qty: 5, total: 1332.5 },
    { id: 2, name: 'DAP (18:46:0) 50kg Bag', price: 1350.0, qty: 2, total: 2700.0 }
  ]);
  const [farmerName, setFarmerName] = useState('Ramesh Patil (Wadgaon)');
  const [paymentMode, setPaymentMode] = useState('CASH');

  const grandTotal = billItems.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            03. Purchase & Sales
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Stock In and Customer Billing · Invoicing, GST Calculations & Khata Credit
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
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)'
            }}
          >
            <span>🧾</span> Create Sale / New Bill
          </button>
          <button
            onClick={() => onNavigate && onNavigate('purchase-sales', 'record-purchase')}
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Record Purchase
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
          { id: 'purchase-overview', label: 'Purchase Overview' },
          { id: 'record-purchase', label: 'Record Purchase' },
          { id: 'purchase-history', label: 'Purchase History' },
          { id: 'create-sale', label: 'Create Sale / New Bill' },
          { id: 'sales-history', label: 'Sales History' },
          { id: 'invoices', label: 'Invoices' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate && onNavigate('purchase-sales', tab.id)}
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

      {/* View 1: POS Billing Interface (Create Sale / New Bill) */}
      {subItem === 'create-sale' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem' }}>
          {/* Bill Items Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem' }}>
              Billing Cart · Invoice Generator
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.825rem' }}>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Product</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Rate (₹)</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Quantity</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {billItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{item.name}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>₹{item.price.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{item.qty} Bags</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700' }}>₹{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => alert('Add product dropdown')}
                style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px dashed #94a3b8', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                + Add Another Fertilizer
              </button>
            </div>
          </div>

          {/* Payment & Customer Details Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.25rem' }}>
              Customer & Checkout
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                Select Farmer / Customer
              </label>
              <input
                type="text"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {['CASH', 'UPI / QR', 'CREDIT (KHATA)', 'BANK'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: paymentMode === mode ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: paymentMode === mode ? '#f0fdf4' : '#ffffff',
                      color: paymentMode === mode ? '#166534' : '#475569',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                <span>GST (5% Included):</span>
                <span>₹{(grandTotal * 0.05).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                <span>Net Payable:</span>
                <span style={{ color: '#059669' }}>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => alert(`Bill generated for ₹${grandTotal.toFixed(2)} (${paymentMode})`)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)'
              }}
            >
              Print & Save Invoice 🖨️
            </button>
          </div>
        </div>
      ) : (
        /* History & Invoice Table View */
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem' }}>
            {subItem === 'purchase-overview' && '🏢 Purchase Summary from Manufacturers & Distributors'}
            {subItem === 'record-purchase' && '📥 Record Stock-In Delivery & Supplier Invoice'}
            {subItem === 'purchase-history' && '📜 Purchase Order History & Inward Delivery Vouchers'}
            {subItem === 'sales-history' && '🛒 Sales History & POS Register'}
            {subItem === 'invoices' && '📑 Official GST Invoices & Receipts'}
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.825rem' }}>
                <th style={{ padding: '0.75rem' }}>Doc No.</th>
                <th style={{ padding: '0.75rem' }}>Party Name</th>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Amount</th>
                <th style={{ padding: '0.75rem' }}>Payment Status</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>BILL-2026-902</td>
                <td style={{ padding: '0.75rem', fontWeight: '600' }}>Sanjay Shinde</td>
                <td style={{ padding: '0.75rem', color: '#64748b' }}>23 Oct 2026</td>
                <td style={{ padding: '0.75rem', fontWeight: '700' }}>₹8,450</td>
                <td style={{ padding: '0.75rem' }}><span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Paid</span></td>
                <td style={{ padding: '0.75rem' }}><button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>View PDF</button></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>BILL-2026-901</td>
                <td style={{ padding: '0.75rem', fontWeight: '600' }}>Vithal Ghadge</td>
                <td style={{ padding: '0.75rem', color: '#64748b' }}>23 Oct 2026</td>
                <td style={{ padding: '0.75rem', fontWeight: '700' }}>₹12,600</td>
                <td style={{ padding: '0.75rem' }}><span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Pending</span></td>
                <td style={{ padding: '0.75rem' }}><button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>View PDF</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
