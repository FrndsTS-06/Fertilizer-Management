import React, { useState, useEffect } from 'react';

/**
 * 05. Reports Page - FTS Navy (#0B1F3A) & Electric Blue (#2563EB)
 * Reports: Stock Valuation Report, Sales Report, Customer Dues Report, Profit & Margin Report
 */
export default function Reports({ subItem = 'stock-report', onNavigate }) {
  const [activeTab, setActiveTab] = useState(subItem || 'stock-report');
  const [dateRange, setDateRange] = useState('this-month');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters inside Reports
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('All');

  // Sync subItem prop if passed from parent
  useEffect(() => {
    if (subItem) {
      setActiveTab(subItem);
    }
  }, [subItem]);

  useEffect(() => {
    let isMounted = true;
    async function loadReportData() {
      setLoading(true);
      try {
        const [prodRes, saleRes, custRes] = await Promise.all([
          fetch('http://localhost:5000/api/products').catch(() => null),
          fetch('http://localhost:5000/api/sales').catch(() => null),
          fetch('http://localhost:5000/api/customers').catch(() => null),
        ]);

        if (prodRes && prodRes.ok) {
          const p = await prodRes.json();
          if (p?.data && isMounted) setProducts(p.data);
        }
        if (saleRes && saleRes.ok) {
          const s = await saleRes.json();
          if (s?.data && isMounted) setSales(s.data);
        }
        if (custRes && custRes.ok) {
          const c = await custRes.json();
          if (c?.data && isMounted) setCustomers(c.data);
        }
      } catch (err) {
        console.error('Error loading report data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadReportData();
    return () => { isMounted = false; };
  }, []);

  // Compute live report figures from real backend data
  const totalTurnover = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const totalOutstandingDues = customers.reduce((sum, c) => sum + (Number(c.outstandingDues) || 0), 0);
  const customersWithDues = customers.filter(c => Number(c.outstandingDues || 0) > 0).length;
  
  // Stock Valuation calculations
  const totalStockUnits = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalStockCostValuation = products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.costPrice) || 0)), 0);
  const totalStockRetailValuation = products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
  const potentialInventoryProfit = Math.max(0, totalStockRetailValuation - totalStockCostValuation);
  const profitMarginPercent = totalStockRetailValuation > 0
    ? ((potentialInventoryProfit / totalStockRetailValuation) * 100).toFixed(1)
    : '0.0';

  // Categories list from products
  const uniqueCategories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Filtered products for Stock Valuation Report
  const filteredStockProducts = products.filter(p => {
    const matchesSearch = !stockSearch.trim() ||
      p.name?.toLowerCase().includes(stockSearch.toLowerCase()) ||
      p.code?.toLowerCase().includes(stockSearch.toLowerCase()) ||
      p.brand?.toLowerCase().includes(stockSearch.toLowerCase());
    
    const matchesCategory = stockCategoryFilter === 'All' || p.category === stockCategoryFilter;
    const matchesStatus = stockStatusFilter === 'All' || p.status === stockStatusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredTotalCost = filteredStockProducts.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.costPrice) || 0)), 0);
  const filteredTotalRetail = filteredStockProducts.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
  const filteredTotalUnits = filteredStockProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const filteredTotalProfit = Math.max(0, filteredTotalRetail - filteredTotalCost);

  // Real CSV Export Function
  const handleExportCSV = () => {
    if (activeTab === 'stock-report') {
      if (filteredStockProducts.length === 0) {
        alert('No stock valuation records to export.');
        return;
      }
      const headers = ['Product Name', 'Code / SKU', 'Category', 'Brand', 'Package Unit', 'Stock Quantity', 'Purchase Cost (INR)', 'Total Cost Valuation (INR)', 'Selling Price (INR)', 'Total Market Valuation (INR)', 'Expected Profit (INR)', 'Stock Status'];
      const rows = filteredStockProducts.map(p => {
        const stock = Number(p.stock) || 0;
        const cost = Number(p.costPrice) || 0;
        const price = Number(p.price) || 0;
        const totalCost = stock * cost;
        const totalRetail = stock * price;
        const profit = totalRetail - totalCost;
        return [
          `"${p.name || ''}"`,
          `"${p.code || ''}"`,
          `"${p.category || ''}"`,
          `"${p.brand || ''}"`,
          `"${p.unit || ''}"`,
          stock,
          cost.toFixed(2),
          totalCost.toFixed(2),
          price.toFixed(2),
          totalRetail.toFixed(2),
          profit.toFixed(2),
          `"${p.status || ''}"`
        ].join(',');
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Stock_Valuation_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeTab === 'sales-report') {
      if (sales.length === 0) {
        alert('No sales records to export.');
        return;
      }
      const headers = ['Invoice No', 'Customer Name', 'Buyer GSTIN', 'Date', 'Subtotal (INR)', 'GST Amount (INR)', 'Total Amount (INR)', 'Payment Method', 'Status'];
      const rows = sales.map(s => [
        `"${s.invoiceNumber || s.id || ''}"`,
        `"${s.customerName || 'Walk-in'}"`,
        `"${s.gstId || 'N/A'}"`,
        `"${s.date ? new Date(s.date).toLocaleDateString('en-IN') : ''}"`,
        (s.subtotal || 0).toFixed(2),
        (s.gstAmount || 0).toFixed(2),
        (s.totalAmount || 0).toFixed(2),
        `"${s.paymentMethod || 'CASH'}"`,
        `"${s.status || 'PAID'}"`
      ].join(','));
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csvContent));
      link.setAttribute('download', `Sales_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`Exporting ${activeTab} data as CSV...`);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
      case 'Low Stock':
        return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' };
      case 'Out of Stock':
      default:
        return { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' };
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Title & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0B1F3A', letterSpacing: '-0.02em', margin: 0 }}>
            Reports & Valuation
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0B1F3A',
              border: '1.5px solid #CBD5E1',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
            title="Download CSV Spreadsheet"
          >
            <span>📊</span> Export Excel / CSV
          </button>
          <button
            type="button"
            onClick={handlePrintReport}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.15s ease',
            }}
            title="Print or Save as PDF"
          >
            <span>📄</span> Download PDF / Print
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid #E2E8F0',
        paddingBottom: '0.75rem',
        marginBottom: '1.5rem',
        overflowX: 'auto',
      }}>
        {[
          { id: 'stock-report', label: '📦 Stock Valuation Report', highlight: true },
          { id: 'sales-report', label: '🛒 Sales & Invoicing Report' },
          { id: 'customer-dues-report', label: '👥 Customer Dues & Khata Report' },
          { id: 'profit-report', label: '📈 Profit & Margin Analysis' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (onNavigate) onNavigate('reports', tab.id);
              }}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                border: isSelected ? '1.5px solid #0B1F3A' : '1px solid #E2E8F0',
                backgroundColor: isSelected ? '#0B1F3A' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#475569',
                fontSize: '0.85rem',
                fontWeight: isSelected ? '700' : '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isSelected ? '0 2px 6px rgba(11, 31, 58, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Date Range Selector & View Badge */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0B1F3A' }}>Timeframe:</span>
          {['today', 'this-week', 'this-month', 'all-time'].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDateRange(range)}
              style={{
                background: dateRange === range ? '#EFF6FF' : 'transparent',
                color: dateRange === range ? '#2563EB' : '#64748B',
                border: dateRange === range ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {range.replace('-', ' ').toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{
          fontSize: '0.8rem',
          color: '#2563EB',
          backgroundColor: '#EFF6FF',
          padding: '0.35rem 0.85rem',
          borderRadius: '20px',
          fontWeight: '700',
          border: '1px solid #BFDBFE',
        }}>
          Active View: {activeTab.replace('-', ' ').toUpperCase()}
        </div>
      </div>

      {/* Top 4 KPI Valuation Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Current Stock Valuation (Market)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0284C7', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            {loading ? '...' : `₹${totalStockRetailValuation.toLocaleString('en-IN')}`}
          </div>
          <div style={{ fontSize: '0.775rem', color: '#64748B', marginTop: '0.35rem' }}>
            {products.length} cataloged SKUs ({totalStockUnits.toLocaleString('en-IN')} total units)
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Purchase Cost Valuation (Cost Basis)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0B1F3A', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            {loading ? '...' : `₹${totalStockCostValuation.toLocaleString('en-IN')}`}
          </div>
          <div style={{ fontSize: '0.775rem', color: '#64748B', marginTop: '0.35rem' }}>
            Total inventory acquisition expenditure
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Potential Stock Profit Margin</div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#059669', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            {loading ? '...' : `₹${potentialInventoryProfit.toLocaleString('en-IN')}`}
          </div>
          <div style={{ fontSize: '0.775rem', color: '#166534', fontWeight: '700', marginTop: '0.35rem' }}>
            Projected Catalog Margin: {profitMarginPercent}%
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Verified Sales & Invoiced Turnover</div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0B1F3A', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            {loading ? '...' : `₹${totalTurnover.toLocaleString('en-IN')}`}
          </div>
          <div style={{ fontSize: '0.775rem', color: '#64748B', marginTop: '0.35rem' }}>
            {sales.length} invoices ({totalOutstandingDues > 0 ? `Dues: ₹${totalOutstandingDues.toLocaleString('en-IN')}` : '0 outstanding dues'})
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. STOCK VALUATION REPORT VIEW                                 */}
      {/* ============================================================== */}
      {activeTab === 'stock-report' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #CBD5E1', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {/* Header & Filter Controls for Stock Valuation */}
          <div style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: '#0B1F3A',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📦</span> Fertilizer Stock Valuation & Inventory Audit
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#06B6D4', fontWeight: '600' }}>
                Itemized breakdown of unit purchase cost vs. market selling valuation and expected gross profit
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Category Filter */}
              <select
                value={stockCategoryFilter}
                onChange={(e) => setStockCategoryFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  outline: 'none',
                }}
              >
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>
                    Category: {c}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  outline: 'none',
                }}
              >
                <option value="All">All Stock Status</option>
                <option value="In Stock">In Stock Only</option>
                <option value="Low Stock">Low Stock Alert</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>

              {/* Search */}
              <input
                type="text"
                placeholder="Search Product / SKU..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  outline: 'none',
                  minWidth: '180px',
                }}
              />
            </div>
          </div>

          {/* Table */}
          {filteredStockProducts.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0B1F3A', margin: '0 0 0.5rem 0' }}>
                No Product Stock Found
              </h3>
              <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
                {products.length === 0
                  ? 'Your product catalog is empty. Catalog items in "Products & Stock Overview" to calculate stock valuation.'
                  : 'No products match the selected category or search filter.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontSize: '0.775rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Product & Brand</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Code / SKU</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Package Unit</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Stock Qty</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Cost Price</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Cost Valuation</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Selling MRP</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Market Valuation</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Projected Profit</th>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Stock Status</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                  {filteredStockProducts.map((p) => {
                    const stock = Number(p.stock) || 0;
                    const costPrice = Number(p.costPrice) || 0;
                    const price = Number(p.price) || 0;
                    const rowCostValuation = stock * costPrice;
                    const rowRetailValuation = stock * price;
                    const rowProfit = Math.max(0, rowRetailValuation - rowCostValuation);
                    const rowMargin = rowRetailValuation > 0 ? ((rowProfit / rowRetailValuation) * 100).toFixed(1) : 0;
                    const badge = getStatusBadge(p.status);

                    return (
                      <tr key={p.id || p.code} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.85rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {p.photo ? (
                              <img
                                src={p.photo}
                                alt={p.name}
                                style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{ width: '38px', height: '38px', borderRadius: '6px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                                🌾
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: '700', color: '#0B1F3A' }}>{p.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                {p.category} · {p.brand || 'Standard'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: '700', color: '#2563EB' }}>
                          {p.code}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: '600', color: '#475569' }}>
                          {p.unit}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '800', color: stock <= (p.minThreshold || 5) ? '#DC2626' : '#0F172A' }}>
                          {stock.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#475569' }}>
                          ₹{costPrice.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '700', color: '#0B1F3A' }}>
                          ₹{rowCostValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#2563EB', fontWeight: '600' }}>
                          ₹{price.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '800', color: '#0284C7' }}>
                          ₹{rowRetailValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <span style={{ fontWeight: '800', color: '#059669' }}>
                            ₹{rowProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block' }}>
                            ({rowMargin}%)
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '0.725rem',
                            fontWeight: '700',
                          }}>
                            {p.status || 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Totals Summary Footer Row */}
                <tfoot>
                  <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: '800', fontSize: '0.875rem' }}>
                    <td colSpan="3" style={{ padding: '1rem 1.25rem', color: '#0B1F3A' }}>
                      TOTAL SUMMARY ({filteredStockProducts.length} Items Listed)
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#0B1F3A' }}>
                      {filteredTotalUnits.toLocaleString('en-IN')} Units
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#64748B' }}>—</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#0B1F3A' }}>
                      ₹{filteredTotalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#64748B' }}>—</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#0284C7' }}>
                      ₹{filteredTotalRetail.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#059669' }}>
                      ₹{filteredTotalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. SALES REPORT VIEW                                           */}
      {/* ============================================================== */}
      {activeTab === 'sales-report' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #CBD5E1', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#0B1F3A', color: '#FFFFFF' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#FFFFFF' }}>
              🛒 Verified Sales Transactions & GST Invoices Register
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#06B6D4' }}>
              Chronological log of customer bills, payment methods, and GST tax records
            </p>
          </div>

          {sales.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0B1F3A', margin: '0 0 0.5rem 0' }}>
                No Verified Sales Invoices Yet
              </h3>
              <p style={{ fontSize: '0.875rem' }}>
                Completed bills created in Purchase & Sales will appear here automatically.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontSize: '0.775rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Invoice No</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Customer / Farmer</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Subtotal</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>GST Tax</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Payment Method</th>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.85rem' }}>
                  {sales.map((s) => (
                    <tr key={s.id || s.invoiceNumber} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'monospace', fontWeight: '700', color: '#2563EB' }}>
                        {s.invoiceNumber || s.id}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '600' }}>
                        <div>{s.customerName || 'Direct Counter Sale'}</div>
                        {s.gstId && (
                          <div style={{ fontSize: '0.725rem', color: '#2563EB', fontFamily: 'monospace' }}>
                            GSTIN: {s.gstId}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>
                        {s.date ? new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        ₹{Number(s.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#2563EB', fontWeight: '600' }}>
                        ₹{Number(s.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '800', color: '#0F172A' }}>
                        ₹{Number(s.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#475569' }}>
                        {s.paymentMethod || 'CASH'}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        <span style={{
                          backgroundColor: s.status === 'PAID' ? '#DCFCE7' : '#FEF3C7',
                          color: s.status === 'PAID' ? '#166534' : '#92400E',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '0.725rem',
                          fontWeight: '700',
                        }}>
                          {s.status || 'PAID'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. CUSTOMER DUES REPORT VIEW                                   */}
      {/* ============================================================== */}
      {activeTab === 'customer-dues-report' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #CBD5E1', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#0B1F3A', color: '#FFFFFF' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#FFFFFF' }}>
              👥 Customer Khata & Outstanding Dues Report
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#06B6D4' }}>
              Active credit balances, farmer contacts, and overdue collections
            </p>
          </div>

          {customers.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0B1F3A', margin: '0 0 0.5rem 0' }}>
                No Customer Accounts Found
              </h3>
              <p style={{ fontSize: '0.875rem' }}>
                Register farmers in Customer Details to monitor outstanding dues.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontSize: '0.775rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Farmer / Customer</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Phone Number</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Village / Location</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Credit Limit</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Purchases</th>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Outstanding Due</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.85rem' }}>
                  {customers.map((c) => {
                    const dues = Number(c.outstandingDues) || 0;
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.85rem 1.25rem', fontWeight: '700', color: '#0B1F3A' }}>
                          {c.name}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                          {c.phone || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                          {c.village || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#64748B' }}>
                          ₹{Number(c.creditLimit || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '600' }}>
                          ₹{Number(c.totalPurchases || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontWeight: '800', color: dues > 0 ? '#DC2626' : '#166534' }}>
                          {dues > 0 ? `₹${dues.toLocaleString('en-IN')}` : '₹0 (Cleared)'}
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

      {/* ============================================================== */}
      {/* 4. PROFIT & MARGIN REPORT VIEW                                 */}
      {/* ============================================================== */}
      {activeTab === 'profit-report' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #CBD5E1', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#0B1F3A', color: '#FFFFFF' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#FFFFFF' }}>
              📈 Product Margin & Profitability Ranking
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#06B6D4' }}>
              Comparative profit margins, cost vs. selling markups across all catalog items
            </p>
          </div>

          {products.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📈</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0B1F3A', margin: '0 0 0.5rem 0' }}>
                No Products to Analyze
              </h3>
              <p style={{ fontSize: '0.875rem' }}>
                Add products with purchase and selling pricing to calculate profit margins.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontSize: '0.775rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Product Name</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Cost Price</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Selling Price</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Unit Gross Margin</th>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Margin Percentage</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.85rem' }}>
                  {[...products]
                    .sort((a, b) => {
                      const mA = (a.price || 0) - (a.costPrice || 0);
                      const mB = (b.price || 0) - (b.costPrice || 0);
                      return mB - mA;
                    })
                    .map((p) => {
                      const cost = Number(p.costPrice) || 0;
                      const sell = Number(p.price) || 0;
                      const margin = Math.max(0, sell - cost);
                      const pct = sell > 0 ? ((margin / sell) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={p.id || p.code} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.85rem 1.25rem', fontWeight: '700', color: '#0B1F3A' }}>
                            {p.name}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>
                            {p.category}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#475569' }}>
                            ₹{cost.toFixed(2)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '700', color: '#2563EB' }}>
                            ₹{sell.toFixed(2)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '800', color: '#059669' }}>
                            +₹{margin.toFixed(2)}
                          </td>
                          <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                            <span style={{
                              backgroundColor: Number(pct) >= 20 ? '#DCFCE7' : '#EFF6FF',
                              color: Number(pct) >= 20 ? '#166534' : '#1D4ED8',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: '800',
                              fontSize: '0.8rem',
                            }}>
                              {pct}%
                            </span>
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
