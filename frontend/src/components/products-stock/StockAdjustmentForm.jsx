import React, { useState, useEffect } from 'react';

/**
 * StockAdjustmentForm - Redesigned with FTS Navy & Electric Blue Theme
 * Includes product, adjustment type, quantity, reason, and confirmation checkbox.
 * Palette: #0B1F3A, #2563EB, #FFFFFF, #F1F5F9, #1E293B, #06B6D4
 */
export default function StockAdjustmentForm({
  isOpen,
  initialProduct = null,
  products = [],
  onClose,
  onSubmit,
}) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [operation, setOperation] = useState('ADD'); // 'ADD' | 'REDUCE' | 'CORRECT'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Physical warehouse count audit');
  const [reference, setReference] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
    } else if (products.length > 0) {
      setSelectedProductId(products[0].id);
    }
    setQuantity('');
    setIsConfirmed(false);
    setError('');
  }, [initialProduct, products, isOpen]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const currentStock = Number(currentProduct?.stock || 0);
  const qtyNumber = Number(quantity) || 0;

  // Calculate projected new stock
  let projectedStock = currentStock;
  if (operation === 'ADD') {
    projectedStock = currentStock + qtyNumber;
  } else if (operation === 'REDUCE') {
    projectedStock = Math.max(0, currentStock - qtyNumber);
  } else if (operation === 'CORRECT') {
    projectedStock = qtyNumber;
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Please select a product.');
      return;
    }
    if (quantity === '' || qtyNumber < 0) {
      setError('Please enter a valid quantity.');
      return;
    }
    if (operation === 'REDUCE' && currentStock < qtyNumber) {
      setError(`Cannot reduce ${qtyNumber} units. Current stock is only ${currentStock}.`);
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for this stock adjustment.');
      return;
    }
    if (!isConfirmed) {
      setError('Please confirm that this adjustment is verified and non-sale/non-purchase related.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSubmit({
        productId: selectedProductId,
        operation,
        quantity: qtyNumber,
        reason: reason.trim(),
        reference: reference.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  const commonReasons = [
    'Physical warehouse count audit',
    'Torn / damaged bags during unloading',
    'Moisture / rain damage',
    'Expired / caked fertilizer disposal',
    'Found unrecorded supplier sample',
    'Entry error correction from previous shift',
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(11, 31, 58, 0.6)',
      backdropFilter: 'blur(3px)',
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(11, 31, 58, 0.25)',
        overflow: 'hidden',
        border: '1px solid #CBD5E1',
      }}>
        {/* Header - Navy Title */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0B1F3A',
          color: '#FFFFFF',
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
              Update Stock Quantity
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#06B6D4', margin: '2px 0 0 0', fontWeight: '600' }}>
              Manual Inventory Adjustment & Audit
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

        {/* Workflow Clarification Alert Box */}
        <div style={{
          margin: '1.25rem 1.75rem 0.5rem 1.75rem',
          padding: '0.85rem 1rem',
          backgroundColor: '#EFF6FF',
          borderRadius: '10px',
          border: '1px solid #BFDBFE',
          fontSize: '0.8rem',
          color: '#1E40AF',
          lineHeight: '1.45',
        }}>
          <strong>Separate Workflow Notice:</strong> Customer sales and wholesale purchases update inventory automatically through transaction billing. This form is reserved exclusively for corrections, damaged packaging, or physical count audits.
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} style={{ padding: '1.25rem 1.75rem', overflowY: 'auto', flex: 1 }}>
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

          {/* 1. Select Product */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.4rem' }}>
              Select Product *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
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
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) — Current: {p.stock} {p.unit} [{p.status}]
                </option>
              ))}
            </select>
          </div>

          {/* 2. Adjustment Type (ADD, REDUCE, CORRECT) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.4rem' }}>
              Adjustment Type *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
              {[
                { id: 'ADD', label: '+ Add Stock', desc: 'Surplus / Return' },
                { id: 'REDUCE', label: '- Reduce Stock', desc: 'Damaged / Spoilage' },
                { id: 'CORRECT', label: '= Correct Count', desc: 'Audit Count Overwrite' },
              ].map((op) => (
                <button
                  type="button"
                  key={op.id}
                  onClick={() => setOperation(op.id)}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border: operation === op.id ? '2px solid #2563EB' : '1px solid #CBD5E1',
                    backgroundColor: operation === op.id ? '#EFF6FF' : '#FFFFFF',
                    color: operation === op.id ? '#2563EB' : '#1E293B',
                    fontWeight: '700',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>{op.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 'normal', marginTop: '2px' }}>
                    {op.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Quantity & Live Stock Projection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.4rem' }}>
                {operation === 'CORRECT' ? 'New Exact Count' : 'Quantity to Adjust'} ({currentProduct?.unit || 'units'}) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: '#0B1F3A',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Projected Stock Preview with Cyan */}
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              borderRadius: '8px',
              padding: '0.6rem 0.85rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>
                Projected Stock
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: projectedStock <= 0 ? '#DC2626' : '#06B6D4' }}>
                {projectedStock} {currentProduct?.unit}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                (From {currentStock} {currentProduct?.unit})
              </span>
            </div>
          </div>

          {/* 4. Reason */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.4rem' }}>
              Reason for Adjustment *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.85rem',
                marginBottom: '0.4rem',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
              onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
            />
            {/* Quick Reason Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {commonReasons.slice(0, 3).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setReason(r)}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Reference memo */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.4rem' }}>
              Reference / Internal Memo No. (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. AUDIT-2026-OCT"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* 6. Confirmation Checkbox */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
          }}>
            <input
              type="checkbox"
              id="confirmAdj"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#2563EB' }}
            />
            <label htmlFor="confirmAdj" style={{ fontSize: '0.8rem', color: '#1E293B', cursor: 'pointer', lineHeight: '1.4' }}>
              <strong>Confirmation:</strong> I confirm this is a verified physical adjustment and does not represent an unrecorded retail customer sale or wholesale supplier purchase.
            </label>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1rem',
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
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563EB', // Electric Blue Action
                color: '#FFFFFF',
                fontWeight: '700',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
              }}
            >
              {submitting ? 'Applying...' : 'Confirm & Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
