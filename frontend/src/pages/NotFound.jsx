import React from 'react';

export default function NotFound({ onNavigate, attemptedPath }) {
  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#0F172A',
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      }}>
        {/* Visual Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          backgroundColor: '#EFF6FF',
          border: '2px solid #BFDBFE',
          fontSize: '2.5rem',
          marginBottom: '1.25rem',
        }}>
          🚜
        </div>

        {/* 404 Error Code */}
        <div style={{
          display: 'inline-block',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          fontSize: '0.75rem',
          fontWeight: '800',
          letterSpacing: '0.08em',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          marginBottom: '0.75rem',
        }}>
          ERROR 404 • NOT FOUND
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          margin: '0 0 0.5rem',
          color: '#0B1F3A',
          letterSpacing: '-0.02em',
        }}>
          Plot Not Found in Current Field
        </h1>

        <p style={{
          fontSize: '0.9rem',
          color: '#64748B',
          margin: '0 0 1.5rem',
          lineHeight: 1.6,
        }}>
          The page or resource you are looking for ({attemptedPath ? `"${attemptedPath}"` : 'this URL'}) has either been harvested, moved, or never existed in the fertilizer shop inventory system.
        </p>

        {/* Quick Actions */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '1.75rem',
        }}>
          <button
            onClick={() => onNavigate ? onNavigate('dashboard') : (window.location.href = '/')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
          >
            🏠 Return to Shop Dashboard
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              onClick={() => onNavigate ? onNavigate('products-stock') : null}
              style={{
                padding: '0.6rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#334155',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              📦 Inventory Overview
            </button>
            <button
              onClick={() => onNavigate ? onNavigate('customer-details') : null}
              style={{
                padding: '0.6rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#334155',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              📖 Farmer Khata Book
            </button>
          </div>
        </div>

        {/* Helpful links */}
        <div style={{
          paddingTop: '1rem',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'center',
          gap: '1.25rem',
          fontSize: '0.75rem',
          color: '#64748B',
        }}>
          <button
            onClick={() => onNavigate ? onNavigate('privacy-policy') : null}
            style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigate ? onNavigate('terms-and-conditions') : null}
            style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Terms &amp; Conditions
          </button>
        </div>
      </div>
    </div>
  );
}
