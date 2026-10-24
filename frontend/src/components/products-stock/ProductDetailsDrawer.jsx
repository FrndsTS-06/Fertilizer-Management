import React from 'react';

/**
 * ProductDetailsDrawer - Redesigned with FTS Navy & Electric Blue Theme
 * Palette: #0B1F3A, #2563EB, #FFFFFF, #F1F5F9, #1E293B, #06B6D4
 */
export default function ProductDetailsDrawer({
  isOpen,
  product,
  onClose,
  onOpenEdit,
  onOpenAdjust,
  onOpenHistory,
}) {
  if (!isOpen || !product) return null;

  const margin = product.price > 0 && product.costPrice > 0
    ? (((product.price - product.costPrice) / product.price) * 100).toFixed(1)
    : 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(11, 31, 58, 0.6)',
      backdropFilter: 'blur(3px)',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Drawer Container */}
      <div style={{
        width: '100%',
        maxWidth: '540px',
        height: '100%',
        backgroundColor: '#FFFFFF',
        boxShadow: '-4px 0 25px rgba(11, 31, 58, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header - Navy */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0B1F3A',
          color: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#06B6D4', // Cyan
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Product Specifications
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#FFFFFF', margin: '2px 0 0 0' }}>
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
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

        {/* Content Body */}
        <div style={{ padding: '1.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Visual Card */}
          <div style={{
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'center',
            padding: '1.25rem',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
          }}>
            <img
              src={product.photo}
              alt={product.name}
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '10px',
                objectFit: 'cover',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
              }}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60';
              }}
            />
            <div>
              <span style={{
                display: 'inline-block',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                fontWeight: '700',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563EB',
                padding: '2px 8px',
                borderRadius: '6px',
                marginBottom: '4px',
                border: '1px solid rgba(37, 99, 235, 0.2)',
              }}>
                {product.code}
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0B1F3A', margin: 0 }}>
                {product.name}
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Category: <b>{product.category}</b> · Brand: <span style={{ color: '#06B6D4', fontWeight: '700' }}>{product.brand || 'Standard'}</span>
              </p>
            </div>
          </div>

          {/* Stock Metrics with Cyan Neutral Highlight */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '1.25rem',
          }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
              Inventory Levels
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Current Available Stock</div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  color: product.stock <= 0 ? '#DC2626' : product.stock <= product.minThreshold ? '#D97706' : '#0B1F3A',
                }}>
                  {product.stock} <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#64748B' }}>{product.unit}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Min Threshold Alert</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#06B6D4' }}>
                  {product.minThreshold} <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#64748B' }}>{product.unit}</span>
                </div>
              </div>
            </div>

            {/* Threshold progress indicator */}
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#E2E8F0',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (product.stock / (product.minThreshold * 2 || 1)) * 100)}%`,
                backgroundColor: product.stock <= 0 ? '#EF4444' : product.stock <= product.minThreshold ? '#F59E0B' : '#06B6D4', // Cyan
                borderRadius: '9999px',
              }} />
            </div>
          </div>

          {/* Pricing & Commercials */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '1.25rem',
          }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
              Pricing & Margin Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.725rem', color: '#64748B' }}>Purchase Cost</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1E293B', marginTop: '2px' }}>
                  ₹{Number(product.costPrice || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.725rem', color: '#64748B' }}>Selling Price</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#2563EB', marginTop: '2px' }}>
                  ₹{Number(product.price || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.725rem', color: '#64748B' }}>Est. Margin</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#06B6D4', marginTop: '2px' }}>
                  {margin}%
                </div>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '1.25rem',
            fontSize: '0.85rem',
          }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Additional Specifications
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#64748B' }}>HSN Code</span>
                <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{product.hsnCode || '31021000'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#64748B' }}>Packaging Unit</span>
                <span style={{ fontWeight: '600', color: '#0B1F3A' }}>{product.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#64748B' }}>Stock Status</span>
                <span style={{ fontWeight: '700' }}>{product.status}</span>
              </div>
              <div style={{ marginTop: '0.4rem' }}>
                <span style={{ color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Description</span>
                <p style={{ margin: 0, color: '#334155', fontStyle: 'italic' }}>
                  {product.description || 'No description provided.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          gap: '0.75rem',
          position: 'sticky',
          bottom: 0,
        }}>
          {/* Update Stock Action */}
          <button
            onClick={() => {
              onClose();
              onOpenAdjust && onOpenAdjust(product);
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#2563EB', // Electric Blue Action
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
          >
            <span>⚖️</span> Update Stock
          </button>

          {/* Edit Details Action */}
          <button
            onClick={() => {
              onClose();
              onOpenEdit && onOpenEdit(product);
            }}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#FFFFFF',
              color: '#0B1F3A',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Edit Details
          </button>
        </div>
      </div>
    </div>
  );
}
