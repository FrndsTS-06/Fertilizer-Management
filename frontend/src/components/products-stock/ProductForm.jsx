import React, { useState, useEffect } from 'react';

/**
 * ProductForm - Redesigned with FTS Navy & Electric Blue Theme
 * Dedicated form for editing product details, prices, units, and minimum thresholds.
 * Palette: #0B1F3A, #2563EB, #FFFFFF, #F1F5F9, #1E293B, #06B6D4
 */
export default function ProductForm({
  isOpen,
  product = null, // null for Add, existing product object for Edit
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Nitrogenous',
    brand: '',
    unit: 'bags',
    costPrice: '',
    price: '',
    minThreshold: '10',
    photo: '',
    description: '',
    initialStock: '0',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!product;

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        code: product.code || '',
        category: product.category || 'Nitrogenous',
        brand: product.brand || '',
        unit: product.unit || 'bags',
        costPrice: product.costPrice !== undefined ? String(product.costPrice) : '',
        price: product.price !== undefined ? String(product.price) : '',
        minThreshold: product.minThreshold !== undefined ? String(product.minThreshold) : '10',
        photo: product.photo || '',
        description: product.description || '',
        initialStock: product.stock !== undefined ? String(product.stock) : '0',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        category: 'Nitrogenous',
        brand: '',
        unit: 'bags',
        costPrice: '',
        price: '',
        minThreshold: '10',
        photo: '',
        description: '',
        initialStock: '0',
      });
    }
    setError('');
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!formData.unit.trim()) {
      setError('Unit (e.g. bags, kg, liter) is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSave(formData, product?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Nitrogenous',
    'Phosphatic',
    'Potassic',
    'Complex',
    'Micronutrients',
    'Bio-Fertilizers',
    'Organic Fertilizers',
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
        maxWidth: '620px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(11, 31, 58, 0.25)',
        overflow: 'hidden',
        border: '1px solid #CBD5E1',
      }}>
        {/* Header - Navy */}
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
              {isEdit ? 'Edit Product Details & Pricing' : 'Add New Fertilizer Product'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#06B6D4', margin: '2px 0 0 0', fontWeight: '600' }}>
              {isEdit ? `Editing SKU: ${product?.code}` : 'Catalog new inventory item with pricing and alert thresholds'}
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
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            {/* Product Name */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Urea (Neem Coated 46% N), DAP 18:46:0"
                value={formData.name}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Product Code */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Product Code (SKU)
              </label>
              <input
                type="text"
                name="code"
                placeholder="e.g. PRD001 (auto if empty)"
                value={formData.code}
                onChange={handleChange}
                disabled={isEdit}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.875rem',
                  backgroundColor: isEdit ? '#F1F5F9' : '#FFFFFF',
                  color: isEdit ? '#64748B' : '#0B1F3A',
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Brand / Manufacturer
              </label>
              <input
                type="text"
                name="brand"
                placeholder="e.g. IFFCO, KRIBHCO, Mahadhan"
                value={formData.brand}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Unit */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Packaging Unit *
              </label>
              <input
                type="text"
                name="unit"
                placeholder="e.g. bags, 45kg bag, liter, kg"
                value={formData.unit}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Purchase Price */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Purchase Price (₹)
              </label>
              <input
                type="number"
                name="costPrice"
                step="0.5"
                placeholder="0.00"
                value={formData.costPrice}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Selling Price */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Selling Price (₹)
              </label>
              <input
                type="number"
                name="price"
                step="0.5"
                placeholder="0.00"
                value={formData.price}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  color: '#2563EB', // Electric Blue
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Minimum-Stock Alert Threshold */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Min Stock Alert Threshold *
              </label>
              <input
                type="number"
                name="minThreshold"
                placeholder="10"
                value={formData.minThreshold}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Initial Stock (Only for new product creation) */}
            {!isEdit && (
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                  Initial Stock Count
                </label>
                <input
                  type="number"
                  name="initialStock"
                  placeholder="0"
                  value={formData.initialStock}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>
            )}

            {/* Photo URL */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Product Photo URL
              </label>
              <input
                type="url"
                name="photo"
                placeholder="https://images.unsplash.com/..."
                value={formData.photo}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>
          </div>

          {/* Form Actions */}
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
              {submitting ? 'Saving...' : isEdit ? 'Save Product Details' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
