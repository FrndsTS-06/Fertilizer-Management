import React, { useState, useEffect } from 'react';

/**
 * StockAdjustmentForm (Stock Management: Add Inward, Update/Correct, or Remove/Deduct Stock)
 * Supports 3 unified operations:
 * 1. 'ADD'    -> Retail Purchase / Inward Stock Addition
 * 2. 'UPDATE' -> Update / Correct existing stock count for physical inventory audit (CORRECT)
 * 3. 'REMOVE' -> Remove / Deduct stock for damage, expiry, return, or write-off (REDUCE)
 */
export default function StockAdjustmentForm({
  isOpen,
  initialProduct = null,
  initialMode = 'ADD',
  products = [],
  onClose,
  onSubmit,
}) {
  const [mode, setMode] = useState(initialMode || 'ADD'); // 'ADD' | 'UPDATE' | 'REMOVE'
  const [selectedProductId, setSelectedProductId] = useState('');
  const [company, setCompany] = useState('');
  const [productName, setProductName] = useState('');
  const [packageUnit, setPackageUnit] = useState('Bags');
  const [bagCapacity, setBagCapacity] = useState('50 kgs');
  const [purchaseForSingle, setPurchaseForSingle] = useState('');
  const [totalStock, setTotalStock] = useState('');
  const [overallCost, setOverallCost] = useState('');

  // Update Stock states
  const [updateTargetStock, setUpdateTargetStock] = useState('');
  const [updateReason, setUpdateReason] = useState('Physical Stock Audit');

  // Remove Stock states
  const [removeQuantity, setRemoveQuantity] = useState('');
  const [removeReason, setRemoveReason] = useState('Damaged Bags / Broken');

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
    setMode(initialMode || 'ADD');
  }, [initialMode, isOpen]);

  useEffect(() => {
    const target = initialProduct || (products.length > 0 ? products[0] : null);
    if (target) {
      setSelectedProductId(target.id || target.code);
      setProductName(target.name || '');
      setCompany(target.brand || 'IFFCO');
      const parsed = parseUnitDetails(target.unit);
      setPackageUnit(parsed.unit);
      setBagCapacity(parsed.capacity);
      setPurchaseForSingle(target.costPrice ? String(target.costPrice) : '');
      setUpdateTargetStock(String(target.stock != null ? target.stock : 0));
    } else {
      setSelectedProductId('');
      setProductName('');
      setCompany('IFFCO');
      setPackageUnit('Bags');
      setBagCapacity('50 kgs');
      setPurchaseForSingle('');
      setUpdateTargetStock('');
    }
    setTotalStock('');
    setOverallCost('');
    setRemoveQuantity('');
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
      setUpdateTargetStock('');
      setRemoveQuantity('');
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
      setUpdateTargetStock(String(p.stock != null ? p.stock : 0));
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
  const projectedStockAdd = currentStock + inwardQty;
  const currentUnit = currentProduct?.unit || `${packageUnit} (${bagCapacity})`;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // MODE 1: ADD STOCK (Retail Purchase Inward)
    if (mode === 'ADD') {
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
      return;
    }

    // MODE 2: UPDATE STOCK (Correct exact stock count for audit)
    if (mode === 'UPDATE') {
      if (!selectedProductId && !productName.trim()) {
        setError('Please select or specify a product to update.');
        return;
      }
      const targetStockNum = Number(updateTargetStock);
      if (isNaN(targetStockNum) || targetStockNum < 0) {
        setError('Please enter a valid non-negative target stock count.');
        return;
      }
      if (!updateReason.trim()) {
        setError('Please provide a reason for stock update.');
        return;
      }

      setSubmitting(true);
      try {
        await onSubmit({
          productId: currentProduct ? (currentProduct.id || currentProduct.code) : selectedProductId,
          productName: currentProduct?.name || productName.trim(),
          quantity: targetStockNum,
          operation: 'CORRECT',
          type: 'ADJUSTMENT',
          reason: updateReason.trim(),
          reference: `STK-UPD-${Date.now().toString().slice(-4)}`,
          costPrice: purchaseForSingle ? Number(purchaseForSingle) : undefined,
        });
        onClose();
      } catch (err) {
        setError(err.message || 'Failed to update stock');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // MODE 3: REMOVE STOCK (Deduct stock for damage, expiry, return)
    if (mode === 'REMOVE') {
      if (!selectedProductId && !productName.trim()) {
        setError('Please select or specify a product to remove stock from.');
        return;
      }
      const removeNum = Number(removeQuantity);
      if (isNaN(removeNum) || removeNum <= 0) {
        setError('Please enter a valid quantity to remove (greater than 0).');
        return;
      }
      if (removeNum > currentStock) {
        setError(`Cannot remove ${removeNum} ${currentUnit}. Current available stock is only ${currentStock}.`);
        return;
      }
      if (!removeReason.trim()) {
        setError('Please provide a reason for removing stock.');
        return;
      }

      setSubmitting(true);
      try {
        await onSubmit({
          productId: currentProduct ? (currentProduct.id || currentProduct.code) : selectedProductId,
          productName: currentProduct?.name || productName.trim(),
          quantity: removeNum,
          operation: 'REDUCE',
          type: 'ADJUSTMENT',
          reason: removeReason.trim(),
          reference: `STK-REM-${Date.now().toString().slice(-4)}`,
        });
        onClose();
      } catch (err) {
        setError(err.message || 'Failed to remove stock');
      } finally {
        setSubmitting(false);
      }
      return;
    }
  };

  const COMPANY_OPTIONS = ['IFFCO', 'Coromandel', 'KPR', 'Tata Chemicals', 'Nagarjuna', 'Yara', 'Multiplex'];
  const CAPACITY_OPTIONS = ['50 kgs', '45 kgs', '25 kgs', '10 kgs', '1 Liter', '5 Liters'];

  const UPDATE_REASON_OPTIONS = [
    'Physical Stock Audit',
    'Stock Count Correction',
    'Warehouse Reconciliation',
    'Supplier Discrepancy Fix',
  ];

  const REMOVE_REASON_OPTIONS = [
    'Damaged Bags / Broken',
    'Expired Product',
    'Returned to Supplier',
    'Internal Usage / Sample',
    'Theft / Loss Write-Off',
  ];

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
              <span>{mode === 'ADD' ? '📦' : mode === 'UPDATE' ? '🔄' : '➖'}</span>
              {mode === 'ADD' && 'Retail Purchase Entry / Add Stock'}
              {mode === 'UPDATE' && 'Update Stock Level'}
              {mode === 'REMOVE' && 'Remove / Deduct Stock'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#38BDF8', margin: '2px 0 0 0', fontWeight: '600' }}>
              {mode === 'ADD' && 'Record inward stock with company, package size, single price & overall cost'}
              {mode === 'UPDATE' && 'Directly update or correct existing stock level for physical inventory audit'}
              {mode === 'REMOVE' && 'Remove or deduct stock for damage, expiry, return to supplier, or write-off'}
            </p>
          </div>
          <button
            type="button"
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

        {/* 3-Mode Unified Action Selector Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          padding: '0.65rem 1.25rem',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={() => { setMode('ADD'); setError(''); }}
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: '8px',
              border: mode === 'ADD' ? '2px solid #059669' : '1px solid #CBD5E1',
              backgroundColor: mode === 'ADD' ? '#ECFDF5' : '#FFFFFF',
              color: mode === 'ADD' ? '#047857' : '#475569',
              fontWeight: '700',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
              boxShadow: mode === 'ADD' ? '0 2px 4px rgba(5, 150, 105, 0.15)' : 'none',
            }}
          >
            <span>📥</span> + Add Stock
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('UPDATE');
              setError('');
              if (currentProduct) setUpdateTargetStock(String(currentProduct.stock != null ? currentProduct.stock : 0));
            }}
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: '8px',
              border: mode === 'UPDATE' ? '2px solid #2563EB' : '1px solid #CBD5E1',
              backgroundColor: mode === 'UPDATE' ? '#EFF6FF' : '#FFFFFF',
              color: mode === 'UPDATE' ? '#1D4ED8' : '#475569',
              fontWeight: '700',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
              boxShadow: mode === 'UPDATE' ? '0 2px 4px rgba(37, 99, 235, 0.15)' : 'none',
            }}
          >
            <span>🔄</span> Update Stock
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('REMOVE');
              setError('');
              setRemoveQuantity('');
            }}
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: '8px',
              border: mode === 'REMOVE' ? '2px solid #DC2626' : '1px solid #CBD5E1',
              backgroundColor: mode === 'REMOVE' ? '#FEF2F2' : '#FFFFFF',
              color: mode === 'REMOVE' ? '#B91C1C' : '#475569',
              fontWeight: '700',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
              boxShadow: mode === 'REMOVE' ? '0 2px 4px rgba(220, 38, 38, 0.15)' : 'none',
            }}
          >
            <span>➖</span> Remove Stock
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

          {/* ========================================================
              FIELDS COMMON OR FOR MODE: ADD STOCK (Retail Purchase Entry)
             ======================================================== */}
          {mode === 'ADD' && (
            <>
              {/* 1. Company */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                  Company (Brand / Supplier) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IFFCO, Coromandel, KPR, Tata Chemicals, Multiplex"
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
                  onFocus={(e) => (e.target.style.borderColor = '#059669')}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B' }}>
                    Product Name *
                  </label>
                  {currentProduct && (
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#047857', backgroundColor: '#ECFDF5', padding: '1px 7px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                      Current: {currentStock} {currentUnit}
                    </span>
                  )}
                </div>

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
                      border: '1.5px solid #059669',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#0B1F3A',
                      outline: 'none',
                      boxSizing: 'border-box',
                      marginTop: products.length > 0 ? '0.4rem' : '0',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#059669')}
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
                    placeholder="e.g. 50 kgs, 1 Liter"
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
                    onFocus={(e) => (e.target.style.borderColor = '#059669')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                  {/* Quick Capacity Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>
                    {CAPACITY_OPTIONS.map((cap) => (
                      <button
                        type="button"
                        key={cap}
                        onClick={() => setBagCapacity(cap)}
                        style={{
                          backgroundColor: bagCapacity === cap ? '#0B1F3A' : '#F1F5F9',
                          color: bagCapacity === cap ? '#FFFFFF' : '#475569',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Total Stock (Quantity) and Purchase for Single (₹) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.15rem' }}>
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
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: '#0B1F3A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#059669')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                    Purchase for Single (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="e.g. 410"
                    value={purchaseForSingle}
                    onChange={(e) => handlePurchaseForSingleChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: '#0B1F3A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#059669')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>
              </div>

              {/* 6. Overall Cost (Computed Card) */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '1.5px solid #E2E8F0',
                padding: '0.9rem 1rem',
                marginBottom: '1rem',
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
                      padding: '0.5rem 0.75rem',
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

              {/* Stock Preview Banner */}
              {totalStock && inwardQty > 0 && (
                <div style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '8px',
                  padding: '0.65rem 0.9rem',
                  fontSize: '0.825rem',
                  color: '#065F46',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>Stock Projection:</span>
                  <span>
                    Current: <b>{currentStock}</b> ➔ Added: <b>+{inwardQty}</b> ➔ New Stock: <b style={{ color: '#047857' }}>{projectedStockAdd} {currentUnit}</b>
                  </span>
                </div>
              )}
            </>
          )}

          {/* ========================================================
              MODE: UPDATE STOCK (Correct exact count for audit)
             ======================================================== */}
          {mode === 'UPDATE' && (
            <>
              {/* Product Selection */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                  Select Product to Update *
                </label>
                {products.length > 0 ? (
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #2563EB',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#0B1F3A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.id || p.code} value={p.id || p.code}>
                        {p.name} ({p.code}) — Current: {p.stock} {p.unit}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#DC2626' }}>No products available to update.</div>
                )}
              </div>

              {/* Current Stock Banner */}
              <div style={{
                backgroundColor: '#EFF6FF',
                border: '1.5px solid #BFDBFE',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.15rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1E40AF' }}>
                  Current Available Stock:
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1D4ED8' }}>
                  {currentStock} {currentUnit}
                </span>
              </div>

              {/* Target New Stock Level */}
              <div style={{ marginBottom: '1.15rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B' }}>
                    New Stock Count (Exact Physical Count) *
                  </label>
                  {updateTargetStock !== '' && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: Number(updateTargetStock) >= currentStock ? '#047857' : '#B91C1C',
                    }}>
                      Difference: {Number(updateTargetStock) - currentStock >= 0 ? `+${Number(updateTargetStock) - currentStock}` : Number(updateTargetStock) - currentStock} {currentUnit}
                    </span>
                  )}
                </div>

                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="Enter exact count in warehouse / store"
                  value={updateTargetStock}
                  onChange={(e) => setUpdateTargetStock(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #2563EB',
                    fontSize: '1rem',
                    fontWeight: '800',
                    color: '#0B1F3A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#1D4ED8')}
                  onBlur={(e) => (e.target.style.borderColor = '#2563EB')}
                />
              </div>

              {/* Reason for Stock Update */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                  Reason for Stock Update *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical inventory audit, count correction"
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
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
                {/* Quick Chips for Update Reason */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                  {UPDATE_REASON_OPTIONS.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setUpdateReason(r)}
                      style={{
                        backgroundColor: updateReason === r ? '#1E40AF' : '#F1F5F9',
                        color: updateReason === r ? '#FFFFFF' : '#475569',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        padding: '2px 7px',
                        fontSize: '0.725rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional: Update Cost Price */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                  Purchase for Single (₹) <span style={{ color: '#64748B', fontWeight: '500' }}>(Optional price update)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={currentProduct?.costPrice ? String(currentProduct.costPrice) : '0.00'}
                  value={purchaseForSingle}
                  onChange={(e) => setPurchaseForSingle(e.target.value)}
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
              </div>

              {/* Dynamic Update Preview Card */}
              {updateTargetStock !== '' && (
                <div style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  padding: '0.65rem 0.9rem',
                  fontSize: '0.825rem',
                  color: '#1E40AF',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>Audit Impact:</span>
                  <span>
                    Current: <b>{currentStock}</b> ➔ New Stock: <b style={{ color: '#1D4ED8' }}>{updateTargetStock} {currentUnit}</b>
                  </span>
                </div>
              )}
            </>
          )}

          {/* ========================================================
              MODE: REMOVE STOCK (Deduct stock for damage/expiry/return)
             ======================================================== */}
          {mode === 'REMOVE' && (
            <>
              {/* Product Selection */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                  Select Product to Remove Stock *
                </label>
                {products.length > 0 ? (
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #DC2626',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#0B1F3A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.id || p.code} value={p.id || p.code}>
                        {p.name} ({p.code}) — Current: {p.stock} {p.unit}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#DC2626' }}>No products available.</div>
                )}
              </div>

              {/* Current Stock Banner */}
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FECACA',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.15rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#991B1B' }}>
                  Current Available Stock:
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#DC2626' }}>
                  {currentStock} {currentUnit}
                </span>
              </div>

              {/* Quantity to Remove */}
              <div style={{ marginBottom: '1.15rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B' }}>
                    Quantity to Remove / Deduct *
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600' }}>
                    Max: {currentStock} {currentUnit}
                  </span>
                </div>

                <input
                  type="number"
                  min="1"
                  max={currentStock > 0 ? currentStock : 1}
                  step="1"
                  required
                  placeholder="e.g. 5"
                  value={removeQuantity}
                  onChange={(e) => setRemoveQuantity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #DC2626',
                    fontSize: '1rem',
                    fontWeight: '800',
                    color: '#0B1F3A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#B91C1C')}
                  onBlur={(e) => (e.target.style.borderColor = '#DC2626')}
                />
              </div>

              {/* Reason for Removal */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                  Reason for Removing Stock *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Damaged bags during warehouse storage"
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
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
                  onFocus={(e) => (e.target.style.borderColor = '#DC2626')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
                {/* Quick Chips for Removal Reason */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                  {REMOVE_REASON_OPTIONS.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRemoveReason(r)}
                      style={{
                        backgroundColor: removeReason === r ? '#991B1B' : '#F1F5F9',
                        color: removeReason === r ? '#FFFFFF' : '#475569',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        padding: '2px 7px',
                        fontSize: '0.725rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Removal Preview Card */}
              {removeQuantity && Number(removeQuantity) > 0 && (
                <div style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '0.65rem 0.9rem',
                  fontSize: '0.825rem',
                  color: '#991B1B',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>Removal Impact:</span>
                  <span>
                    Current: <b>{currentStock}</b> ➔ Removed: <b>-{removeQuantity}</b> ➔ Remaining: <b style={{ color: '#DC2626' }}>{Math.max(0, currentStock - Number(removeQuantity))} {currentUnit}</b>
                  </span>
                </div>
              )}
            </>
          )}

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
                backgroundColor: mode === 'ADD' ? '#059669' : mode === 'UPDATE' ? '#2563EB' : '#DC2626',
                color: '#FFFFFF',
                fontWeight: '700',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: mode === 'ADD' ? '0 3px 10px rgba(5, 150, 105, 0.3)' : mode === 'UPDATE' ? '0 3px 10px rgba(37, 99, 235, 0.3)' : '0 3px 10px rgba(220, 38, 38, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{mode === 'ADD' ? '📥' : mode === 'UPDATE' ? '🔄' : '📤'}</span>
              {mode === 'ADD' && (submitting ? 'Adding Stock...' : '+ Add Retail Purchase to Stock')}
              {mode === 'UPDATE' && (submitting ? 'Updating Stock...' : 'Update Stock Level')}
              {mode === 'REMOVE' && (submitting ? 'Removing Stock...' : 'Remove Stock')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
