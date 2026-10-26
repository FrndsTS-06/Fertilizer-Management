import React, { useState, useEffect } from 'react';

/**
 * RetailPurchaseForm (Stock Inward Entry)
 * Replaces manual adjustment with:
 * - company
 * - product name
 * - package unit
 * - bags capacity/size
 * - purchase for single
 * - overall cost
 * - total stock
 */
export default function StockAdjustmentForm({
  isOpen,
  initialProduct = null,
  products = [],
  onClose,
  onSubmit,
}) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [company, setCompany] = useState('');
  const [productName, setProductName] = useState('');
  const [packageUnit, setPackageUnit] = useState('Bags');
  const [bagCapacity, setBagCapacity] = useState('50 kgs');
  const [purchaseForSingle, setPurchaseForSingle] = useState('');
  const [totalStock, setTotalStock] = useState('');
  const [overallCost, setOverallCost] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Parse existing product unit e.g. "Bags (50 kgs)" or "50kg Bag"
  const parseUnitDetails = (unitStr) => {
    if (!unitStr) return { unit: 'Bags', capacity: '50 kgs' };
    const str = unitStr.toLowerCase();
    let detectedUnit = 'Bags';
    if (str.includes('bottle') || str.includes('ml') || str.includes('liter')) detectedUnit = 'Bottles';
    else if (str.includes('packet')) detectedUnit = 'Packets';
    else if (str.includes('box')) detectedUnit = 'Boxes';
    else if (str.includes('drum')) detectedUnit = 'Drums';

    let detectedCap = '50 kgs';
    if (str.includes('50kg') || str.includes('50 kgs') || str.includes('50 kg')) detectedCap = '50 kgs';
    else if (str.includes('45kg') || str.includes('45 kgs')) detectedCap = '45 kgs';
    else if (str.includes('25kg') || str.includes('25 kgs')) detectedCap = '25 kgs';
    else if (str.includes('10kg') || str.includes('10 kgs')) detectedCap = '10 kgs';
    else if (str.includes('1l') || str.includes('1 liter') || str.includes('1 l')) detectedCap = '1 Liter';
    else if (str.includes('500ml')) detectedCap = '500 ml';
    else detectedCap = unitStr;

    return { unit: detectedUnit, capacity: detectedCap };
  };

  useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.id || initialProduct.code);
      setProductName(initialProduct.name || '');
      setCompany(initialProduct.brand || 'IFFCO');
      const parsed = parseUnitDetails(initialProduct.unit);
      setPackageUnit(parsed.unit);
      setBagCapacity(parsed.capacity);
      setPurchaseForSingle(initialProduct.costPrice ? String(initialProduct.costPrice) : '');
    } else if (products.length > 0) {
      const p = products[0];
      setSelectedProductId(p.id || p.code);
      setProductName(p.name || '');
      setCompany(p.brand || 'IFFCO');
      const parsed = parseUnitDetails(p.unit);
      setPackageUnit(parsed.unit);
      setBagCapacity(parsed.capacity);
      setPurchaseForSingle(p.costPrice ? String(p.costPrice) : '');
    } else {
      setSelectedProductId('');
      setProductName('');
      setCompany('IFFCO');
      setPackageUnit('Bags');
      setBagCapacity('50 kgs');
      setPurchaseForSingle('');
    }
    setTotalStock('');
    setOverallCost('');
    setError('');
  }, [initialProduct, products, isOpen]);

  // Handle switching product dropdown
  const handleProductSelect = (prodId) => {
    setSelectedProductId(prodId);
    if (prodId === '__NEW__') {
      setProductName('');
      setCompany('');
      setPurchaseForSingle('');
      setTotalStock('');
      setOverallCost('');
      return;
    }

    const p = products.find((item) => (item.id === prodId || item.code === prodId));
    if (p) {
      setProductName(p.name || '');
      setCompany(p.brand || 'IFFCO');
      const parsed = parseUnitDetails(p.unit);
      setPackageUnit(parsed.unit);
      setBagCapacity(parsed.capacity);
      setPurchaseForSingle(p.costPrice ? String(p.costPrice) : '');
      if (totalStock) {
        const single = Number(p.costPrice) || 0;
        const count = Number(totalStock) || 0;
        setOverallCost(single > 0 && count > 0 ? String(single * count) : '');
      }
    }
  };

  // Auto-calculate Overall Cost when Purchase for Single or Total Stock changes
  const handlePurchaseForSingleChange = (val) => {
    setPurchaseForSingle(val);
    const single = Number(val) || 0;
    const count = Number(totalStock) || 0;
    if (val === '' || totalStock === '') {
      setOverallCost('');
    } else {
      setOverallCost(String((single * count).toFixed(2).replace(/\.00$/, '')));
    }
  };

  const handleTotalStockChange = (val) => {
    setTotalStock(val);
    const count = Number(val) || 0;
    const single = Number(purchaseForSingle) || 0;
    if (val === '' || purchaseForSingle === '') {
      setOverallCost('');
    } else {
      setOverallCost(String((single * count).toFixed(2).replace(/\.00$/, '')));
    }
  };

  const handleOverallCostChange = (val) => {
    setOverallCost(val);
    const overall = Number(val) || 0;
    const count = Number(totalStock) || 0;
    if (overall > 0 && count > 0) {
      setPurchaseForSingle(String((overall / count).toFixed(2).replace(/\.00$/, '')));
    }
  };

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId || p.code === selectedProductId);
  const currentStock = Number(currentProduct?.stock || 0);
  const inwardQty = Number(totalStock) || 0;
  const projectedStock = currentStock + inwardQty;

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!company.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!productName.trim()) {
      setError('Product Name is required.');
      return;
    }
    if (!packageUnit.trim()) {
      setError('Package Unit is required.');
      return;
    }
    if (!bagCapacity.trim()) {
      setError('Bags capacity/size is required.');
      return;
    }
    const singlePriceNum = Number(purchaseForSingle);
    if (isNaN(singlePriceNum) || singlePriceNum <= 0) {
      setError('Please enter a valid purchase price for single.');
      return;
    }
    const stockCountNum = Number(totalStock);
    if (isNaN(stockCountNum) || stockCountNum <= 0) {
      setError('Please enter valid total stock count (greater than 0).');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const fullUnitStr = `${packageUnit} (${bagCapacity.trim()})`;
      const computedOverall = Number(overallCost) || (singlePriceNum * stockCountNum);

      await onSubmit({
        productId: currentProduct ? (currentProduct.id || currentProduct.code) : undefined,
        productName: productName.trim(),
        company: company.trim(),
        brand: company.trim(),
        unit: fullUnitStr,
        packageUnit,
        bagCapacity: bagCapacity.trim(),
        costPrice: singlePriceNum,
        overallCost: computedOverall,
        quantity: stockCountNum,
        operation: 'ADD',
        type: 'PURCHASE',
        reason: `Retail Purchase Inward from ${company.trim()}`,
        reference: `${company.trim().toUpperCase().slice(0, 4)}-PUR-${Date.now().toString().slice(-4)}`,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record retail purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const COMPANY_OPTIONS = ['IFFCO', 'Coromandel', 'KPR', 'Tata Chemicals', 'Nagarjuna', 'Yara'];
  const CAPACITY_OPTIONS = ['50 kgs', '45 kgs', '25 kgs', '10 kgs', '1 Liter', '5 Liters'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(11, 31, 58, 0.65)',
      backdropFilter: 'blur(3px)',
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '5.25rem 1rem 1.5rem 1rem', // Clear 72px top header
      overflowY: 'auto',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: 'calc(100vh - 105px)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid #CBD5E1',
        margin: 'auto',
      }}>
        {/* Header - Navy Blue */}
        <div style={{
          padding: '0.9rem 1.35rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0B1F3A',
          color: '#FFFFFF',
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>📦</span> Retail Purchase Entry
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#06B6D4', margin: '2px 0 0 0', fontWeight: '600' }}>
              Record inward stock with company, package size, single price & overall cost
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
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
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FECACA',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: '600',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* 1. Company */}
          <div style={{ marginBottom: '1.15rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
              Company (Brand / Supplier) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. IFFCO, Coromandel, KPR, Tata Chemicals"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#0B1F3A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
              onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
            />
            {/* Quick Company Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
              {COMPANY_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCompany(c)}
                  style={{
                    backgroundColor: company === c ? '#0B1F3A' : '#F1F5F9',
                    color: company === c ? '#FFFFFF' : '#475569',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    padding: '2px 7px',
                    fontSize: '0.725rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Product Name */}
          <div style={{ marginBottom: '1.15rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
              Product Name *
            </label>

            {/* Select existing product */}
            {products.length > 0 && (
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#0B1F3A',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: selectedProductId === '__NEW__' ? '0.4rem' : '0',
                }}
              >
                {products.map((p) => (
                  <option key={p.id || p.code} value={p.id || p.code}>
                    {p.name} ({p.code}) — Current: {p.stock} {p.unit}
                  </option>
                ))}
                <option value="__NEW__">+ Enter New / Other Product Name</option>
              </select>
            )}

            {/* Direct text input ONLY when adding a new/custom product or no products exist */}
            {(selectedProductId === '__NEW__' || products.length === 0) && (
              <input
                type="text"
                required
                placeholder="e.g. Urea Super 46N, DAP 18:46, Potash MOP"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #2563EB',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#0B1F3A',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginTop: products.length > 0 ? '0.4rem' : '0',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            )}
          </div>

          {/* 3 & 4. Package Unit and Bags Capacity/Size */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.85rem', marginBottom: '1.15rem' }}>
            {/* Package Unit */}
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Package Unit *
              </label>
              <select
                value={packageUnit}
                onChange={(e) => setPackageUnit(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#0B1F3A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Bags">Bags</option>
                <option value="Bottles">Bottles</option>
                <option value="Packets">Packets</option>
                <option value="Boxes">Boxes</option>
                <option value="Drums">Drums</option>
                <option value="Units">Units</option>
              </select>
            </div>

            {/* Bags Capacity / Size */}
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Bags Capacity / Size *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 50 kgs, 45 kgs, 1 L"
                value={bagCapacity}
                onChange={(e) => setBagCapacity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#0B1F3A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>
          </div>

          {/* Quick Capacity Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '-0.65rem', marginBottom: '1.15rem' }}>
            {CAPACITY_OPTIONS.map((cap) => (
              <button
                type="button"
                key={cap}
                onClick={() => setBagCapacity(cap)}
                style={{
                  backgroundColor: bagCapacity === cap ? '#2563EB' : '#F8FAFC',
                  color: bagCapacity === cap ? '#FFFFFF' : '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  padding: '2px 7px',
                  fontSize: '0.725rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {cap}
              </button>
            ))}
          </div>

          {/* Total Stock (Quantity) & Purchase for Single (Swapped) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.15rem' }}>
            {/* Total Stock */}
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Total Stock (Quantity) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 50"
                value={totalStock}
                onChange={(e) => handleTotalStockChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: '#0B1F3A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Purchase for single */}
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Purchase for Single (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="e.g. 270"
                value={purchaseForSingle}
                onChange={(e) => handlePurchaseForSingleChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: '#0B1F3A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>
          </div>

          {/* 6. Overall Cost (Computed Card) */}
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1.5px solid #E2E8F0',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.825rem', fontWeight: '800', color: '#0F172A' }}>
                Overall Cost (₹)
              </label>
              {purchaseForSingle && totalStock && (
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600' }}>
                  ₹{purchaseForSingle} × {totalStock} {packageUnit}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#059669' }}>₹</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={overallCost}
                onChange={(e) => handleOverallCostChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '1.15rem',
                  fontWeight: '800',
                  color: '#059669',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ fontSize: '0.725rem', color: '#94A3B8', marginTop: '0.35rem' }}>
              Automatically calculated as Single Purchase Price × Total Stock Quantity.
            </div>
          </div>

          {/* Form Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #E2E8F0',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.65rem 1.45rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontWeight: '700',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 10px rgba(5, 150, 105, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span>📥</span> {submitting ? 'Adding Stock...' : '+ Add Retail Purchase to Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
