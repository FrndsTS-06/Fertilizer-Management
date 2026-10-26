import React, { useState, useEffect } from 'react';

export default function Dashboard({ subItem = 'sales-summary', onNavigate }) {
  // Live product, inventory and sales data fetching
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, saleRes] = await Promise.all([
        fetch('http://localhost:5000/api/products'),
        fetch('http://localhost:5000/api/sales')
      ]);

      if (!prodRes.ok) {
        throw new Error(`Products API error: HTTP ${prodRes.status} (${prodRes.statusText})`);
      }
      const prodJson = await prodRes.json();
      if (prodJson && prodJson.success && Array.isArray(prodJson.data)) {
        setProducts(prodJson.data);
      } else {
        throw new Error(prodJson?.error || 'Invalid product payload structure');
      }

      if (saleRes.ok) {
        const saleJson = await saleRes.json();
        if (saleJson && saleJson.success && Array.isArray(saleJson.data)) {
          setSales(saleJson.data);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Unable to connect to live Fertilizer API at http://localhost:5000');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Stock status determination following actual stock & threshold configuration
  const getStockStatusBadge = (product) => {
    if (product.stock === null || product.stock === undefined) {
      return { label: 'Not recorded', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
    }
    const stock = Number(product.stock);
    const threshold = product.minThreshold !== undefined && product.minThreshold !== null
      ? Number(product.minThreshold)
      : 10;
    if (stock <= 0) {
      return { label: 'Out of Stock', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
    }
    if (stock <= threshold) {
      return { label: 'Low Stock', bg: '#fef3c7', color: '#92400e', border: '#fde68a' };
    }
    return { label: 'In Stock', bg: '#dcfce7', color: '#166534', border: '#86efac' };
  };

  const formatRecordDate = (dateVal) => {
    if (!dateVal) return 'Not recorded';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Not recorded';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatStockQuantity = (stock, unit) => {
    if (stock === null || stock === undefined) return '—';
    return `${stock} ${unit || ''}`.trim();
  };

  const formatThreshold = (threshold, unit) => {
    if (threshold === null || threshold === undefined) return 'Not configured';
    return `${threshold} ${unit || ''}`.trim();
  };

  return (
    <div>
      {/* Page Title & Subtitle */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Dashboard
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchDashboardData}
            title="Refresh live product & inventory data from API"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>↻</span> Refresh
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('products-stock', 'update-stock')}
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '0.6rem 1.1rem',
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

      {/* Loading State */}
      {loading && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#64748b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.6rem',
        }}>
          <div style={{ fontSize: '1.8rem' }}>🔄</div>
          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1rem' }}>
            Fetching Live Fertilizer Products & Stock Records...
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Querying backend API at http://localhost:5000/api/products
          </div>
        </div>
      )}

      {/* API Error State with Retry Button */}
      {!loading && error && (
        <div style={{
          backgroundColor: '#fff1f2',
          borderRadius: '12px',
          border: '1px solid #fecdd3',
          padding: '1.75rem',
          textAlign: 'center',
          marginBottom: '2rem',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>⚠️</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#9f1239', margin: '0 0 0.4rem 0' }}>
            Unable to Retrieve Live Products Data
          </h3>
          <p style={{ color: '#be123c', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
            {error}
          </p>
          <button
            type="button"
            onClick={fetchDashboardData}
            style={{
              backgroundColor: '#be123c',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ↻ Retry Connection
          </button>
        </div>
      )}

      {/* Empty Database State */}
      {!loading && !error && products.length === 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          padding: '3rem 2rem',
          textAlign: 'center',
          marginBottom: '2rem',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌾</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            No products have been added yet.
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
            Your database contains 0 product records. Add your first fertilizer product to view live details, inventory thresholds, and quality tracking.
          </p>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('products-stock', 'all-products')}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Add Product
          </button>
        </div>
      )}

      {/* THREE LIVE PRODUCT INFORMATION SECTIONS */}
      {!loading && !error && products.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}>
          {/* SECTION A: PRODUCT DETAILS */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.15rem 1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🌿</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Product Details
                  </h3>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Specifications & SKU Records ({products.length} Items)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('products-stock', 'all-products')}
                title="Open full catalog"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                View Catalog →
              </button>
            </div>

            {/* Product Details List */}
            <div style={{
              padding: '1rem 1.25rem',
              maxHeight: '440px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              {products.map((p) => (
                <div
                  key={p.id || p.code}
                  onClick={() => onNavigate && onNavigate('products-stock', 'all-products')}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    padding: '0.75rem 0.9rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a', lineHeight: 1.3 }}>
                      {p.name || 'Not provided'}
                    </span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.72rem',
                      color: '#2563EB',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: '700',
                      flexShrink: 0,
                    }}>
                      {p.code || p.id || 'Not provided'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem', fontSize: '0.78rem', color: '#475569', marginBottom: '0.35rem' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Category: </span>
                      <strong style={{ color: '#0369a1' }}>{p.category || 'Not provided'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Brand: </span>
                      <strong style={{ color: '#0f172a' }}>{p.brand || 'Not provided'}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#94a3b8' }}>Unit: </span>
                      <strong style={{ color: '#047857' }}>{p.unit || 'Not provided'}</strong>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.74rem',
                    color: '#64748b',
                    lineHeight: 1.35,
                    borderTop: '1px dashed #e2e8f0',
                    paddingTop: '0.35rem',
                    fontStyle: p.description ? 'normal' : 'italic',
                  }}>
                    {p.description || 'Not provided'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION B: STOCK AVAILABILITY */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.15rem 1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>📦</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Stock Availability
                  </h3>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Real-Time Inventory & Configured Thresholds
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('products-stock', 'all-products')}
                title="Manage warehouse inventory"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                View Inventory →
              </button>
            </div>

            {/* Stock Availability List */}
            <div style={{
              padding: '1rem 1.25rem',
              maxHeight: '440px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              {products.map((p) => {
                const statusBadge = getStockStatusBadge(p);
                const isOutOfStock = p.stock !== undefined && p.stock !== null && Number(p.stock) <= 0;
                const isLowStock = p.stock !== undefined && p.stock !== null && p.minThreshold !== undefined && Number(p.stock) <= Number(p.minThreshold) && Number(p.stock) > 0;

                return (
                  <div
                    key={p.id || p.code}
                    onClick={() => onNavigate && onNavigate('products-stock', 'all-products')}
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      padding: '0.75rem 0.9rem',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a', lineHeight: 1.3 }}>
                        {p.name || 'Not provided'}
                      </span>
                      <span style={{
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.border}`,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        flexShrink: 0,
                      }}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Available Stock:</span>
                      <span style={{
                        fontSize: '1.05rem',
                        fontWeight: '800',
                        color: isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#166534',
                      }}>
                        {formatStockQuantity(p.stock, p.unit)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem', fontSize: '0.76rem', color: '#475569', borderTop: '1px dashed #e2e8f0', paddingTop: '0.35rem' }}>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Min Level: </span>
                        <strong>{formatThreshold(p.minThreshold, p.unit)}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Unit: </span>
                        <strong>{p.unit || 'Not provided'}</strong>
                      </div>
                    </div>

                    {(isOutOfStock || isLowStock) && (
                      <div style={{
                        marginTop: '0.4rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: isOutOfStock ? '#991b1b' : '#92400e',
                        backgroundColor: isOutOfStock ? '#fee2e2' : '#fef3c7',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        display: 'inline-block',
                      }}>
                        {isOutOfStock ? '⛔ Your stock is empty (Out of stock)' : '⚠️ Your stock is empty (Low stock alert)'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
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
          <div>
            {(() => {
              const lowStockProducts = products.filter(p => {
                const stock = Number(p.stock ?? 0);
                const threshold = Number(p.minThreshold ?? 10);
                return stock <= threshold;
              });

              if (lowStockProducts.length === 0) {
                return (
                  <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                      All Fertilizer Stock Levels Are Healthy
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      No items currently fall below their configured minimum reorder thresholds.
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.825rem' }}>
                        <th style={{ padding: '0.75rem' }}>Product</th>
                        <th style={{ padding: '0.75rem' }}>Brand / Manufacturer</th>
                        <th style={{ padding: '0.75rem' }}>Current Stock</th>
                        <th style={{ padding: '0.75rem' }}>Threshold</th>
                        <th style={{ padding: '0.75rem' }}>Status</th>
                        <th style={{ padding: '0.75rem' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.875rem' }}>
                      {lowStockProducts.map((p) => {
                        const stock = Number(p.stock ?? 0);
                        const isOutOfStock = stock <= 0;
                        return (
                          <tr key={p.id || p.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem', fontWeight: '600', color: '#0f172a' }}>{p.name}</td>
                            <td style={{ padding: '0.75rem', color: '#475569' }}>{p.brand || '—'}</td>
                            <td style={{ padding: '0.75rem', color: isOutOfStock ? '#dc2626' : '#d97706', fontWeight: '700' }}>
                              {stock} {p.unit || 'bags'}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#64748b' }}>
                              {p.minThreshold ?? '—'} {p.unit || 'bags'}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{
                                background: isOutOfStock ? '#fee2e2' : '#fef3c7',
                                color: isOutOfStock ? '#991b1b' : '#92400e',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                border: `1px solid ${isOutOfStock ? '#fca5a5' : '#fde68a'}`,
                              }}>
                                {isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <button
                                type="button"
                                onClick={() => onNavigate && onNavigate('products-stock', 'update-stock')}
                                style={{
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '600'
                                }}
                              >
                                Reorder / Inward
                              </button>
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
        ) : (
          <div>
            {sales.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧾</div>
                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                  No Billing Invoices Recorded Yet
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  Invoices generated via Billing & Sales will be listed here in real-time.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.825rem' }}>
                      <th style={{ padding: '0.75rem' }}>Bill No.</th>
                      <th style={{ padding: '0.75rem' }}>Customer / Farmer</th>
                      <th style={{ padding: '0.75rem' }}>Items Purchased</th>
                      <th style={{ padding: '0.75rem' }}>Total Amount</th>
                      <th style={{ padding: '0.75rem' }}>Payment Status</th>
                      <th style={{ padding: '0.75rem' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '0.875rem' }}>
                    {sales.map((sale) => {
                      const itemsDesc = Array.isArray(sale.items)
                        ? sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
                        : '—';
                      const isPaid = sale.status === 'PAID';
                      const isPartial = sale.status === 'PARTIAL';
                      return (
                        <tr key={sale.id || sale.invoiceNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: '600', color: '#0f172a' }}>
                            {sale.invoiceNumber || sale.id}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: '600', color: '#334155' }}>
                            {sale.customerName || 'Direct Counter Sale'}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#475569', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={itemsDesc}>
                            {itemsDesc}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: '700', color: '#0f172a' }}>
                            ₹{Number(sale.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              background: isPaid ? '#dcfce7' : isPartial ? '#fef3c7' : '#fee2e2',
                              color: isPaid ? '#166534' : isPartial ? '#92400e' : '#991b1b',
                              border: `1px solid ${isPaid ? '#bbf7d0' : isPartial ? '#fde68a' : '#fca5a5'}`,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                            }}>
                              {sale.status || 'UNPAID'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', color: '#64748b' }}>
                            {formatRecordDate(sale.date)}
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
    </div>
  );
}
