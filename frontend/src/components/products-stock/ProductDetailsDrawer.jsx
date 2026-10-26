import React, { useEffect } from 'react';

/**
 * ProductDetailsDrawer - Compact Right-Side Panel (Does not touch header or left sidebar)
 * - Pinned below the 72px Top Header (top: 72px)
 * - Sits on the right side of the main workspace
 * - Minimized & sleek width (380px)
 * - High-visibility corner 'X' close button at the top-right
 */
export default function ProductDetailsDrawer({
  isOpen,
  product,
  onClose,
  onOpenEdit,
  onOpenAdjust,
  onOpenHistory,
  onDeleteProduct,
}) {
  // ESC key listener to quickly close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const margin = product.price > 0 && product.costPrice > 0
    ? (((product.price - product.costPrice) / product.price) * 100).toFixed(1)
    : 0;

  const stockRatio = Math.min(100, Math.max(0, (product.stock / (product.minThreshold * 2 || 1)) * 100));
  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= (product.minThreshold || 10);

  return (
    <div
      onClick={(e) => {
        // Clicking backdrop closes drawer
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: '72px', // Does NOT touch or cover top header (72px)
        left: 0,
        right: 0,
        bottom: 0,
        height: 'calc(100vh - 72px)',
        backgroundColor: 'rgba(15, 23, 42, 0.45)', // Soft overlay on content only
        backdropFilter: 'blur(2px)',
        zIndex: 45, // Below TopHeader (z-index 50) and Sidebar (z-index 60)
        display: 'flex',
        justifyContent: 'flex-end', // Right side panel, NOT in the middle
        animation: 'fadeIn 0.15s ease-out',
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Minimized Right-Side Panel */}
      <div
        style={{
          width: '100%',
          maxWidth: '380px', // Minimized, sleek width
          height: '100%',
          backgroundColor: '#FFFFFF',
          boxShadow: '-6px 0 25px rgba(11, 31, 58, 0.2)',
          borderLeft: '1px solid #CBD5E1',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header with Corner 'X' Close Button (Always visible right below top header) */}
        <div
          style={{
            flexShrink: 0,
            padding: '0.85rem 1rem',
            backgroundColor: '#0B1F3A',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            position: 'relative',
          }}
        >
          <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: '800',
                  color: '#06B6D4',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  padding: '0.12rem 0.4rem',
                  borderRadius: '4px',
                }}
              >
                Product Details
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#94A3B8',
                  fontWeight: '600',
                  fontFamily: 'monospace',
                }}
              >
                {product.code}
              </span>
            </div>
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: '800',
                color: '#FFFFFF',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={product.name}
            >
              {product.name}
            </h2>
          </div>

          {/* Prominent Corner 'X' Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            style={{
              flexShrink: 0,
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#FFFFFF',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EF4444';
              e.currentTarget.style.borderColor = '#EF4444';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>
        </div>

        {/* 2. Scrollable Body Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            backgroundColor: '#F8FAFC',
          }}
        >
          {/* Visual Overview Card */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <img
              src={product.photo}
              alt={product.name}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F1F5F9',
                flexShrink: 0,
              }}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60';
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3
                style={{
                  fontSize: '0.92rem',
                  fontWeight: '800',
                  color: '#0B1F3A',
                  margin: '0 0 0.25rem 0',
                  lineHeight: 1.25,
                }}
              >
                {product.name}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '9999px',
                    border: '1px solid #DBEAFE',
                  }}
                >
                  {product.category}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    backgroundColor: '#ECFEFF',
                    color: '#0891B2',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '9999px',
                    border: '1px solid #CFFAFE',
                  }}
                >
                  {product.brand || 'Standard'}
                </span>
              </div>
            </div>
          </div>

          {/* Inventory Levels Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '0.75rem 0.85rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Inventory Levels
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '0.12rem 0.4rem',
                  borderRadius: '4px',
                  backgroundColor: isOutOfStock ? '#FEE2E2' : isLowStock ? '#FEF3C7' : '#DCFCE7',
                  color: isOutOfStock ? '#DC2626' : isLowStock ? '#D97706' : '#15803D',
                }}
              >
                {isOutOfStock ? '● Out of Stock' : isLowStock ? '● Low Stock' : '● In Stock'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.55rem' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '500' }}>Available Stock</div>
                <div
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: '800',
                    color: isOutOfStock ? '#DC2626' : isLowStock ? '#D97706' : '#0B1F3A',
                    lineHeight: 1.15,
                  }}
                >
                  {product.stock}{' '}
                  <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#64748B' }}>
                    {product.unit}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '500' }}>Min Alert Threshold</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#06B6D4', lineHeight: 1.15 }}>
                  {product.minThreshold}{' '}
                  <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#64748B' }}>
                    {product.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Threshold progress indicator */}
            <div
              style={{
                width: '100%',
                height: '5px',
                backgroundColor: '#E2E8F0',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${stockRatio}%`,
                  backgroundColor: isOutOfStock ? '#EF4444' : isLowStock ? '#F59E0B' : '#06B6D4',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Pricing & Margin Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '0.75rem 0.85rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Pricing & Margin Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', textAlign: 'center' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '0.45rem 0.25rem', borderRadius: '7px', border: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block' }}>Cost Price</span>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1E293B', marginTop: '2px' }}>
                  ₹{Number(product.costPrice || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ backgroundColor: '#EFF6FF', padding: '0.45rem 0.25rem', borderRadius: '7px', border: '1px solid #DBEAFE' }}>
                <span style={{ fontSize: '0.65rem', color: '#2563EB', fontWeight: '600', display: 'block' }}>Sale Price</span>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1D4ED8', marginTop: '2px' }}>
                  ₹{Number(product.price || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ backgroundColor: '#ECFEFF', padding: '0.45rem 0.25rem', borderRadius: '7px', border: '1px solid #CFFAFE' }}>
                <span style={{ fontSize: '0.65rem', color: '#0891B2', fontWeight: '600', display: 'block' }}>Est. Margin</span>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0891B2', marginTop: '2px' }}>
                  {margin}%
                </div>
              </div>
            </div>
          </div>

          {/* Specifications Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '0.75rem 0.85rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Additional Specifications
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.3rem' }}>
                <span style={{ color: '#64748B' }}>HSN Code</span>
                <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#0B1F3A' }}>
                  {product.hsnCode || '31021000'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.3rem' }}>
                <span style={{ color: '#64748B' }}>Packaging Unit</span>
                <span style={{ fontWeight: '600', color: '#0B1F3A' }}>{product.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.3rem' }}>
                <span style={{ color: '#64748B' }}>Stock Status</span>
                <span style={{ fontWeight: '700', color: isOutOfStock ? '#DC2626' : '#0B1F3A' }}>
                  {product.status || 'Active'}
                </span>
              </div>
              {product.description && (
                <div style={{ marginTop: '0.25rem', backgroundColor: '#F8FAFC', padding: '0.4rem 0.55rem', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.65rem', fontWeight: '600', marginBottom: '0.1rem' }}>
                    Notes / Description
                  </span>
                  <p style={{ margin: 0, color: '#334155', fontStyle: 'italic', fontSize: '0.72rem', lineHeight: 1.3 }}>
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



