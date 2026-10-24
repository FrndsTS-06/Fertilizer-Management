import React, { useState } from 'react';

export default function TopHeader({
  shopName = "GreenHarvest Agro Fertilizers",
  onSearch,
  onToggleMenu,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifications = [
    { id: 1, title: 'Low Stock Alert', desc: 'Urea (46% N) - 50kg Bags below 15 units', time: '10m ago', urgent: true },
    { id: 2, title: 'Payment Due', desc: 'Farmer Ramesh Patil has overdue balance of ₹14,200', time: '1h ago', urgent: false },
    { id: 3, title: 'Purchase Arrived', desc: 'DAP batch #BN-8842 received from IFFCO', time: '3h ago', urgent: false },
  ];

  return (
    <header style={{
      height: '72px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border-light, #e2e8f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      {/* Left: Branding & Tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: '800',
          fontSize: '1.25rem',
          boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)'
        }}>
          🌿
        </div>
        <div>
          <h1 style={{
            fontSize: '1.15rem',
            fontWeight: '700',
            color: '#0f172a',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            margin: 0
          }}>
            Fertilizer Shop Management
          </h1>
          <p style={{
            fontSize: '0.8rem',
            color: '#059669',
            fontWeight: '600',
            margin: '2px 0 0 0',
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            Inventory, Billing & Accounts
          </p>
        </div>
      </div>

      {/* Middle: Quick Search */}
      <div style={{ flex: '1', maxWidth: '380px', margin: '0 2rem' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', fontSize: '0.9rem' }}>🔍</span>
          <input
            type="text"
            placeholder="Search products, invoices, farmers..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 1rem 0.55rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#059669'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
      </div>

      {/* Right Header Navigation & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Shop Name Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          padding: '0.4rem 0.85rem',
          borderRadius: '9999px',
          color: '#166534',
          fontSize: '0.85rem',
          fontWeight: '600'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            display: 'inline-block'
          }}></span>
          <span>{shopName}</span>
        </div>

        {/* Notifications Icon with Badge */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            title="Notifications"
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.1rem',
              position: 'relative',
              transition: 'background 0.2s'
            }}
          >
            🔔
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: '700',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px #ffffff'
            }}>
              3
            </span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '48px',
              width: '320px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              padding: '1rem',
              zIndex: 50
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: '700' }}>Notifications</h4>
                <span style={{ fontSize: '0.75rem', color: '#059669', cursor: 'pointer', fontWeight: '600' }}>Mark all read</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '0.6rem',
                    borderRadius: '8px',
                    background: n.urgent ? '#fef2f2' : '#f8fafc',
                    borderLeft: n.urgent ? '3px solid #ef4444' : '3px solid #059669'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.8rem', color: n.urgent ? '#991b1b' : '#1e293b' }}>{n.title}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{n.time}</span>
                    </div>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#475569' }}>{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: '8px',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#059669',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.9rem',
              boxShadow: '0 2px 5px rgba(5, 150, 105, 0.2)'
            }}>
              DK
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>Dileep Kumar</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Store Owner</div>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>▼</span>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '48px',
              width: '200px',
              background: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              padding: '0.5rem',
              zIndex: 50
            }}>
              <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Signed in as</p>
                <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0f172a', margin: '2px 0 0 0' }}>admin@fertilizershop.com</p>
              </div>
              <button style={{
                width: '100%', textAlign: 'left', padding: '0.5rem 0.6rem', background: 'none', border: 'none',
                fontSize: '0.8rem', color: '#334155', cursor: 'pointer', borderRadius: '6px'
              }}>
                ⚙️ Shop Settings
              </button>
              <button style={{
                width: '100%', textAlign: 'left', padding: '0.5rem 0.6rem', background: 'none', border: 'none',
                fontSize: '0.8rem', color: '#334155', cursor: 'pointer', borderRadius: '6px'
              }}>
                📑 GST / Tax Config
              </button>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={() => alert('Logged out successfully')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#fee2e2',
            color: '#dc2626',
            border: 'none',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.825rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          title="Sign out of system"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </header>
  );
}
