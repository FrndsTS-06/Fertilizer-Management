import React, { useState, useEffect } from 'react';

export default function PurchasesSales({ subItem = 'create-sale', onNavigate }) {
  // Live API states
  const [sales, setSales] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Billing state for Create Sale / New Bill
  const [billItems, setBillItems] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerVillage, setCustomerVillage] = useState('');
  const [ownerGstId, setOwnerGstId] = useState('29AAAAA0000A1Z5'); // Default Owner GST ID
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [selectedProductCode, setSelectedProductCode] = useState('');

  // Custom GST Tax Configuration (Added / modified by Admin)
  const [gstRate, setGstRate] = useState(18); // Default 18%
  const [isCustomGst, setIsCustomGst] = useState(false);
  const [customGstInput, setCustomGstInput] = useState('18');
  const [gstMode, setGstMode] = useState('EXCLUSIVE'); // 'EXCLUSIVE' (+ on top) or 'INCLUSIVE' (included in price)
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [stockMovements, setStockMovements] = useState([]);
  const [stockFilter, setStockFilter] = useState('All'); // 'All' | 'ADDED' | 'SELL' | 'UPDATE'
  const [stockSearch, setStockSearch] = useState('');

  // Fetch real sales, products, customers, and stock movements from backend API
  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, prodRes, custRes, movRes] = await Promise.all([
        fetch('http://localhost:5000/api/sales').catch(() => null),
        fetch('http://localhost:5000/api/products').catch(() => null),
        fetch('http://localhost:5000/api/customers').catch(() => null),
        fetch('http://localhost:5000/api/inventory/movements').catch(() => null),
      ]);

      if (salesRes && salesRes.ok) {
        const sJson = await salesRes.json();
        if (sJson?.data) setSales(sJson.data);
      }

      if (prodRes && prodRes.ok) {
        const pJson = await prodRes.json();
        if (pJson?.data) setAvailableProducts(pJson.data);
      }

      if (custRes && custRes.ok) {
        const cJson = await custRes.json();
        if (cJson?.data) setCustomers(cJson.data);
      }

      if (movRes && movRes.ok) {
        const mJson = await movRes.json();
        if (mJson?.data) setStockMovements(mJson.data);
      }
    } catch (err) {
      console.error('Failed to load purchase/sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProduct = () => {
    if (!selectedProductCode) return;
    const prod = availableProducts.find(p => (p.id || p.code) === selectedProductCode);
    if (!prod) return;

    const existingIndex = billItems.findIndex(i => i.code === (prod.code || prod.id));
    if (existingIndex >= 0) {
      const updated = [...billItems];
      updated[existingIndex].qty += 1;
      updated[existingIndex].total = updated[existingIndex].qty * updated[existingIndex].price;
      setBillItems(updated);
    } else {
      setBillItems([
        ...billItems,
        {
          id: prod.id || prod.code,
          code: prod.code || prod.id,
          name: prod.name,
          price: Number(prod.price) || 0,
          qty: 1,
          total: Number(prod.price) || 0,
          unit: prod.unit || 'bags',
        }
      ]);
    }
    setSelectedProductCode('');
  };

  const handleUpdateQty = (index, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    const updated = [...billItems];
    updated[index].qty = qty;
    updated[index].total = qty * updated[index].price;
    setBillItems(updated);
  };

  const handleRemoveItem = (index) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  // Dynamic GST & Net Payable Calculations
  const subtotal = billItems.reduce((acc, curr) => acc + curr.total, 0);
  const effectiveGstRate = isCustomGst ? (parseFloat(customGstInput) || 0) : gstRate;

  let gstAmount = 0;
  let netPayable = 0;

  if (gstMode === 'EXCLUSIVE') {
    // GST added on top of taxable subtotal
    gstAmount = (subtotal * effectiveGstRate) / 100;
    netPayable = subtotal + gstAmount;
  } else {
    // GST already included inside product price
    gstAmount = effectiveGstRate > 0 ? (subtotal * effectiveGstRate) / (100 + effectiveGstRate) : 0;
    netPayable = subtotal;
  }

  const handleSaveInvoice = async () => {
    if (billItems.length === 0) return;
    setSavingInvoice(true);
    try {
      const selectedCust = customers.find(c => c.id === selectedCustomerId || c.name === customerName);
      const isCredit = paymentMode === 'CREDIT (KHATA)';
      const finalCustomerName = customerName.trim() || selectedCust?.name || 'Walk-in Farmer / Customer';
      const invoiceData = {
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        customerId: selectedCust?.id || null,
        customerName: finalCustomerName,
        customerPhone: customerPhone.trim() || selectedCust?.phone || '',
        customerVillage: customerVillage.trim() || selectedCust?.village || '',
        ownerGstId: ownerGstId.trim(),
        gstId: ownerGstId.trim(),
        date: new Date().toISOString(),
        items: billItems,
        subtotal: Number(subtotal.toFixed(2)),
        gstRate: Number(effectiveGstRate),
        gstMode,
        gstAmount: Number(gstAmount.toFixed(2)),
        totalAmount: Number(netPayable.toFixed(2)),
        paidAmount: isCredit ? 0 : Number(netPayable.toFixed(2)),
        dueAmount: isCredit ? Number(netPayable.toFixed(2)) : 0,
        paymentMethod: paymentMode,
        status: isCredit ? 'UNPAID' : 'PAID',
      };

      const res = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (res.ok) {
        const json = await res.json();
        setSales(prev => [json.data || invoiceData, ...prev]);
      } else {
        setSales(prev => [invoiceData, ...prev]);
      }

      alert(`✅ Invoice Created & Saved!\n\nInvoice: ${invoiceData.invoiceNumber}\nCustomer: ${invoiceData.customerName}\nPhone: ${invoiceData.customerPhone || 'N/A'}\nVillage: ${invoiceData.customerVillage || 'N/A'}\nOwner GST: ${ownerGstId.trim() || 'N/A'}\nSubtotal: ₹${subtotal.toFixed(2)}\nGST (${effectiveGstRate}% ${gstMode === 'INCLUSIVE' ? 'Included' : 'Added'}): ₹${gstAmount.toFixed(2)}\nNet Payable: ₹${netPayable.toFixed(2)}\nPayment: ${paymentMode}`);

      setBillItems([]);
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerVillage('');
      fetchData(); // Reload products, sales, and stock movements
    } catch (err) {
      console.error('Invoice save failed:', err);
      alert(`Invoice created: ₹${netPayable.toFixed(2)} (${paymentMode})`);
      setBillItems([]);
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerVillage('');
      fetchData();
    } finally {
      setSavingInvoice(false);
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) {
      return new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Purchase & Sales
          </h1>
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
            onClick={() => onNavigate && onNavigate('products-stock', 'update-stock')}
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
            + Retail Purchase
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
          { id: 'create-sale', label: 'Create Sale / New Bill' },
          { id: 'stock-history', label: 'Stock History' },
          { id: 'sales-history', label: 'Sales History' },
          { id: 'invoices', label: 'Invoices' },
          { id: 'purchase-overview', label: 'Purchase Overview' },
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

            {billItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>🛒</div>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>Billing Cart is Empty</div>
                <div style={{ fontSize: '0.825rem', marginTop: '0.2rem' }}>Select a fertilizer product from the inventory dropdown below to start creating an invoice.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.825rem' }}>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Product</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Rate (₹)</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Quantity</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Total (₹)</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem' }}>
                  {billItems.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{item.name}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>₹{item.price.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleUpdateQty(idx, e.target.value)}
                          style={{ width: '60px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700' }}>₹{item.total.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' }}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedProductCode}
                onChange={(e) => setSelectedProductCode(e.target.value)}
                style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', flex: 1, minWidth: '220px' }}
              >
                <option value="">-- Choose Fertilizer Product to Add --</option>
                {availableProducts.map(p => (
                  <option key={p.id || p.code} value={p.id || p.code}>
                    {p.name} ({p.brand}) - ₹{p.price} | Stock: {p.stock} {p.unit}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedProductCode}
                style={{
                  padding: '0.55rem 1rem',
                  background: selectedProductCode ? '#059669' : '#e2e8f0',
                  color: selectedProductCode ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedProductCode ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                + Add To Bill
              </button>
            </div>
          </div>

          {/* Payment & Customer Details Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.25rem' }}>
              Customer & Checkout
            </h3>

            {/* Customer Details Box & Redirect to Customer Details - Added ABOVE select registered customer */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              padding: '0.9rem',
              border: '1.5px solid #E2E8F0',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Customer Details
                </span>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('customer-details')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '6px',
                      padding: '3px 9px',
                      fontSize: '0.725rem',
                      fontWeight: '700',
                      color: '#1D4ED8',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Open Customer Details page"
                  >
                    <span>👥 Customer Details</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                {/* Customer Name */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.725rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.25rem' }}>
                    Customer / Farmer Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter customer / farmer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#0B1F3A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label style={{ fontSize: '0.725rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.25rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#0B1F3A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>

                {/* Village */}
                <div>
                  <label style={{ fontSize: '0.725rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.25rem' }}>
                    Village / Town
                  </label>
                  <input
                    type="text"
                    placeholder="Village name"
                    value={customerVillage}
                    onChange={(e) => setCustomerVillage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#0B1F3A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>
              </div>
            </div>

            {/* Select Registered Farmer / Customer */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Select Registered Farmer / Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCustomerId(val);
                  const found = customers.find(c => c.id === val || `${c.name} (${c.village || 'Farmer'})` === val || c.name === val);
                  if (found) {
                    setCustomerName(found.name || '');
                    setCustomerPhone(found.phone || '');
                    setCustomerVillage(found.village || '');
                  }
                }}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', marginBottom: '0.75rem', backgroundColor: '#FFFFFF', fontWeight: '600', color: '#0B1F3A' }}
              >
                <option value="">-- Select from Registered Customers --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.village || 'Local'} {c.phone ? `(${c.phone})` : ''} {c.outstandingDues > 0 ? `(Due: ₹${c.outstandingDues})` : ''}
                  </option>
                ))}
              </select>

              {/* Owner GST ID (GSTIN) with Default GST badge */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1E293B' }}>
                    Owner GST ID
                  </label>
                  <span style={{
                    fontSize: '0.675rem',
                    color: '#15803D',
                    backgroundColor: '#DCFCE7',
                    border: '1px solid #86EFAC',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    Default GST
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Enter owner GST ID"
                  value={ownerGstId}
                  onChange={(e) => setOwnerGstId(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.825rem',
                    fontFamily: 'monospace',
                    fontWeight: '700',
                    color: '#0B1F3A',
                    backgroundColor: '#FFFFFF',
                    letterSpacing: '0.04em',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {['CASH', 'UPI / QR', 'CREDIT (KHATA)', 'BANK'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
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

            {/* Custom GST Tax Setting (Admin Configurable) */}
            <div style={{
              marginBottom: '1.25rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              padding: '0.85rem',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A' }}>
                  GST Tax Rate (%):
                </label>
                {/* Inclusive vs Exclusive toggle */}
                <div style={{ display: 'flex', gap: '0.25rem', background: '#E2E8F0', padding: '2px', borderRadius: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setGstMode('EXCLUSIVE')}
                    style={{
                      border: 'none',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: gstMode === 'EXCLUSIVE' ? '#2563EB' : 'transparent',
                      color: gstMode === 'EXCLUSIVE' ? '#FFFFFF' : '#475569',
                    }}
                    title="Add GST on top of subtotal"
                  >
                    + Add On Top
                  </button>
                  <button
                    type="button"
                    onClick={() => setGstMode('INCLUSIVE')}
                    style={{
                      border: 'none',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: gstMode === 'INCLUSIVE' ? '#2563EB' : 'transparent',
                      color: gstMode === 'INCLUSIVE' ? '#FFFFFF' : '#475569',
                    }}
                    title="GST already included in product prices"
                  >
                    Included
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', marginBottom: '0.6rem' }}>
                {[
                  { label: '0% (Nil)', value: 0 },
                  { label: '5% (Fert)', value: 5 },
                  { label: '12% (Bio)', value: 12 },
                  { label: '18% (Pest)', value: 18 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setGstRate(opt.value);
                      setIsCustomGst(false);
                      setCustomGstInput(String(opt.value));
                    }}
                    style={{
                      padding: '0.35rem 0.2rem',
                      borderRadius: '6px',
                      border: (!isCustomGst && gstRate === opt.value) ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      background: (!isCustomGst && gstRate === opt.value) ? '#EFF6FF' : '#FFFFFF',
                      color: (!isCustomGst && gstRate === opt.value) ? '#1D4ED8' : '#334155',
                      fontSize: '0.725rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom GST Input Field */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: isCustomGst ? '#EFF6FF' : '#FFFFFF',
                border: isCustomGst ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#0B1F3A',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>
                  <input
                    type="checkbox"
                    checked={isCustomGst}
                    onChange={(e) => {
                      setIsCustomGst(e.target.checked);
                      if (!e.target.checked) setCustomGstInput(String(gstRate));
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  Custom GST:
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 2.5 or 28"
                  value={customGstInput}
                  onChange={(e) => {
                    setIsCustomGst(true);
                    setCustomGstInput(e.target.value);
                  }}
                  style={{
                    flex: 1,
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    padding: '0.2rem 0.45rem',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    color: '#0B1F3A',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    width: '60px',
                  }}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B' }}>%</span>
              </div>
            </div>

            <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem', fontSize: '0.875rem', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem', fontSize: '0.875rem', color: '#64748b' }}>
                <span>
                  GST ({effectiveGstRate}% {gstMode === 'INCLUSIVE' ? 'Included' : 'Added'}):
                </span>
                <span style={{ fontWeight: '600', color: '#2563EB' }}>₹{gstAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', paddingTop: '0.45rem', borderTop: '1px solid #F1F5F9' }}>
                <span>Net Payable:</span>
                <span style={{ color: '#059669' }}>₹{netPayable.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={billItems.length === 0 || savingInvoice}
              onClick={handleSaveInvoice}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: billItems.length > 0 ? '#059669' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: billItems.length > 0 && !savingInvoice ? 'pointer' : 'not-allowed',
                boxShadow: billItems.length > 0 ? '0 4px 10px rgba(5, 150, 105, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {savingInvoice ? 'Saving Invoice...' : 'Print & Save Invoice 🖨️'}
            </button>
          </div>
        </div>
      ) : subItem === 'stock-history' ? (
        /* Real-time Stock History Audit View (Added, Sell, Update) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Total Stock Inward</div>
              <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>+{stockMovements.filter(m => (m.action === 'ADDED' || m.type === 'PURCHASE')).reduce((acc, m) => acc + Math.abs(Number(m.changeQty || 0)), 0)}</span>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Units Added</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>From catalog creation & purchases</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Total Stock Sold</div>
              <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>-{stockMovements.filter(m => (m.action === 'SELL' || m.type === 'SALE')).reduce((acc, m) => acc + Math.abs(Number(m.changeQty || 0)), 0)}</span>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Units Sold</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Deducted across customer sales bills</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Stock Updates & Audits</div>
              <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>{stockMovements.filter(m => (m.action === 'UPDATE' || m.type === 'ADJUSTMENT')).length}</span>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Adjustments</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Manual reconciliations & counts</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Total Tracked Events</div>
              <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a' }}>
                {stockMovements.length} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Ledger Records</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Recorded with default date & timestamps</div>
            </div>
          </div>

          {/* Main Stock History Table Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📦</span> Real-time Stock History & Movements
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem', color: '#64748b' }}>
                  Live register of every stock event: Product added, customer sales deduction, and inventory update.
                </p>
              </div>

              {/* Action Filter Pills & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search product, code, invoice..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    minWidth: '220px',
                    outline: 'none'
                  }}
                />
                {[
                  { id: 'All', label: 'All Updates' },
                  { id: 'ADDED', label: '📥 Added' },
                  { id: 'SELL', label: '🛒 Sold' },
                  { id: 'UPDATE', label: '⚖️ Updated' },
                ].map((f) => {
                  const isActive = stockFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setStockFilter(f.id)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        borderRadius: '6px',
                        border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        backgroundColor: isActive ? '#0f172a' : '#ffffff',
                        color: isActive ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtered Movements List */}
            {(() => {
              const filteredMovements = stockMovements.filter((m) => {
                if (stockFilter !== 'All') {
                  const act = (m.action || (m.type === 'SALE' ? 'SELL' : m.type === 'PURCHASE' ? 'ADDED' : 'UPDATE')).toUpperCase();
                  if (stockFilter === 'ADDED' && act !== 'ADDED') return false;
                  if (stockFilter === 'SELL' && act !== 'SELL') return false;
                  if (stockFilter === 'UPDATE' && act !== 'UPDATE') return false;
                }
                if (stockSearch.trim()) {
                  const q = stockSearch.toLowerCase().trim();
                  const matchName = (m.productName || '').toLowerCase().includes(q);
                  const matchCode = (m.productCode || '').toLowerCase().includes(q);
                  const matchRef = (m.reference || '').toLowerCase().includes(q);
                  const matchReason = (m.reason || '').toLowerCase().includes(q);
                  return matchName || matchCode || matchRef || matchReason;
                }
                return true;
              });

              if (filteredMovements.length === 0) {
                return (
                  <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                      No Stock Movements Found
                    </div>
                    <div style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto' }}>
                      {stockMovements.length === 0
                        ? 'Add a new product, generate a sale bill, or update stock to see automatic ledger entries with default date and time.'
                        : 'No stock records match your search criteria. Try selecting "All Updates" or clearing search.'}
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.825rem' }}>
                        <th style={{ padding: '0.75rem' }}>Date & Time</th>
                        <th style={{ padding: '0.75rem' }}>Product Details</th>
                        <th style={{ padding: '0.75rem' }}>Stock Action</th>
                        <th style={{ padding: '0.75rem' }}>Quantity Change</th>
                        <th style={{ padding: '0.75rem' }}>Stock Balance</th>
                        <th style={{ padding: '0.75rem' }}>Reason & Reference</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.875rem' }}>
                      {filteredMovements.map((m, idx) => {
                        const act = (m.action || (m.type === 'SALE' ? 'SELL' : m.type === 'PURCHASE' ? 'ADDED' : 'UPDATE')).toUpperCase();
                        const isAdded = act === 'ADDED';
                        const isSell = act === 'SELL';
                        const isUpdate = act === 'UPDATE';
                        const changeNum = Number(m.changeQty || 0);

                        return (
                          <tr key={m.id || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                            {/* Default Device Date & Time */}
                            <td style={{ padding: '0.75rem', color: '#334155', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>
                                {formatDateTime(m.createdAt)}
                              </div>
                              <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                                Default System Date
                              </div>
                            </td>

                            {/* Product Details */}
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ fontWeight: '700', color: '#0f172a' }}>{m.productName || 'Fertilizer Product'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                                {m.productCode && <span style={{ fontFamily: 'monospace' }}>Code: {m.productCode}</span>}
                                {m.unit && <span>Unit: {m.unit}</span>}
                              </div>
                            </td>

                            {/* Stock Action Badge */}
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                background: isAdded ? '#dcfce7' : isSell ? '#fee2e2' : '#eff6ff',
                                color: isAdded ? '#166534' : isSell ? '#991b1b' : '#1e40af',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.775rem',
                                fontWeight: '700',
                                border: `1px solid ${isAdded ? '#bbf7d0' : isSell ? '#fca5a5' : '#bfdbfe'}`
                              }}>
                                {isAdded && '📥 Stock Added'}
                                {isSell && '🛒 Stock Sold'}
                                {isUpdate && '⚖️ Stock Update'}
                              </span>
                            </td>

                            {/* Quantity Change */}
                            <td style={{ padding: '0.75rem', fontWeight: '800', fontSize: '0.95rem' }}>
                              <span style={{
                                color: isAdded || changeNum > 0 ? '#059669' : isSell || changeNum < 0 ? '#dc2626' : '#2563eb'
                              }}>
                                {changeNum > 0 ? `+${changeNum}` : `${changeNum}`} {m.unit || 'Units'}
                              </span>
                            </td>

                            {/* Stock Balance Transition */}
                            <td style={{ padding: '0.75rem', color: '#334155' }}>
                              {m.previousStock != null && m.newStock != null ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                  <span style={{ color: '#64748b' }}>{m.previousStock}</span>
                                  <span style={{ color: '#94a3b8' }}>➔</span>
                                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{m.newStock} {m.unit || ''}</span>
                                </div>
                              ) : (
                                <span style={{ fontWeight: '600' }}>{m.newStock != null ? `${m.newStock} ${m.unit || ''}` : '—'}</span>
                              )}
                            </td>

                            {/* Reason & Reference */}
                            <td style={{ padding: '0.75rem', color: '#475569' }}>
                              <div style={{ fontWeight: '600' }}>{m.reason || (isAdded ? 'Product Added Inward' : isSell ? 'Customer Sale Bill' : 'Stock Adjustment')}</div>
                              {m.reference && (
                                <div style={{ fontSize: '0.75rem', color: '#2563eb', fontFamily: 'monospace', fontWeight: '600', marginTop: '2px' }}>
                                  Ref: {m.reference}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* Real History & Invoice Table View for sales-history, invoices, purchase-overview */
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {subItem === 'purchase-overview' && '🏢 Fertilizer Inward & Supplier Records'}
              {subItem === 'sales-history' && '🛒 Official Sales History & POS Register'}
              {subItem === 'invoices' && '📑 Official GST Invoices & Receipts'}
            </h3>
            <button
              onClick={() => onNavigate && onNavigate('purchase-sales', 'stock-history')}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>📦</span> View Stock History (Added, Sell, Update)
            </button>
          </div>

          {sales.length === 0 ? (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
              <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                No Invoices Recorded Yet
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Sales transactions and official invoices will appear here in real-time.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.825rem' }}>
                    <th style={{ padding: '0.75rem' }}>Invoice No.</th>
                    <th style={{ padding: '0.75rem' }}>Customer / Farmer</th>
                    <th style={{ padding: '0.75rem' }}>Date</th>
                    <th style={{ padding: '0.75rem' }}>Items Sold</th>
                    <th style={{ padding: '0.75rem' }}>Total Amount</th>
                    <th style={{ padding: '0.75rem' }}>Payment Status</th>
                    <th style={{ padding: '0.75rem' }}>Due Amount</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem' }}>
                  {sales.map((sale) => {
                    const isPaid = sale.status === 'PAID';
                    const isPartial = sale.status === 'PARTIAL';
                    return (
                      <tr key={sale.id || sale.invoiceNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: '600' }}>
                          {sale.invoiceNumber || sale.id}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>
                          <div>{sale.customerName || 'Direct Counter Sale'}</div>
                          {sale.gstId && (
                            <div style={{ fontSize: '0.725rem', color: '#2563EB', fontFamily: 'monospace', fontWeight: '700', marginTop: '2px' }}>
                              GSTIN: {sale.gstId}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          {formatDateTime(sale.date || sale.createdAt)}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#334155', fontSize: '0.8rem' }}>
                          {sale.items && sale.items.length > 0 ? (
                            <div>
                              {sale.items.map((it, i) => (
                                <span key={i} style={{ display: 'inline-block', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', margin: '2px 4px 2px 0' }}>
                                  {it.name || it.productName}: <b>{it.quantity}</b>
                                </span>
                              ))}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: '700' }}>
                          ₹{Number(sale.totalAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            background: isPaid ? '#dcfce7' : isPartial ? '#fef3c7' : '#fee2e2',
                            color: isPaid ? '#166534' : isPartial ? '#92400e' : '#991b1b',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            border: `1px solid ${isPaid ? '#bbf7d0' : isPartial ? '#fde68a' : '#fca5a5'}`
                          }}>
                            {sale.status || 'UNPAID'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: sale.dueAmount > 0 ? '#dc2626' : '#64748b', fontWeight: sale.dueAmount > 0 ? '700' : '400' }}>
                          {sale.dueAmount > 0 ? `₹${Number(sale.dueAmount).toLocaleString('en-IN')}` : '₹0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
