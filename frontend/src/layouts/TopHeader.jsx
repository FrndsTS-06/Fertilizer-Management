import React, { useState, useEffect } from 'react';

export default function TopHeader({
  onSearch,
  onToggleMenu,
  showMobileMenuButton = false,
  sidebarWidth = '285px',
  isMobile = false,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [clearedNotifications, setClearedNotifications] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadAlerts() {
      try {
        const [prodRes, custRes] = await Promise.all([
          fetch('http://localhost:5000/api/products').catch(() => null),
          fetch('http://localhost:5000/api/customers').catch(() => null),
        ]);

        const alerts = [];

        if (prodRes && prodRes.ok) {
          const prodData = await prodRes.json();
          if (prodData?.data) {
            prodData.data.forEach((p) => {
              const stock = Number(p.stock ?? 0);
              const threshold = Number(p.minThreshold ?? 10);
              if (stock <= 0) {
                alerts.push({
                  id: `stock-${p.id || p.code}`,
                  title: 'Stock Empty Alert',
                  desc: `Your stock is empty (${p.name} is completely out of stock).`,
                  time: 'Immediate',
                  urgent: true,
                });
              } else if (stock <= threshold) {
                alerts.push({
                  id: `stock-${p.id || p.code}`,
                  title: 'Low Stock Alert',
                  desc: `Your stock is empty (${p.name} has only ${stock} ${p.unit || 'bags'} remaining).`,
                  time: 'Active',
                  urgent: true,
                });
              }
            });
          }
        }

        if (custRes && custRes.ok) {
          const custData = await custRes.json();
          if (custData?.data) {
            const highDueCusts = custData.data
              .filter(c => Number(c.outstandingDues || 0) > 10000)
              .slice(0, 3);
            highDueCusts.forEach(c => {
              alerts.push({
                id: `due-${c.id}`,
                title: 'High Khata Due',
                desc: `Farmer ${c.name} has an outstanding balance of ₹${Number(c.outstandingDues).toLocaleString('en-IN')}`,
                time: 'Due',
                urgent: false,
              });
            });
          }
        }

        if (isMounted) {
          setNotifications(alerts);
        }
      } catch (e) {
        console.error('Error fetching header notifications:', e);
      }
    }

    loadAlerts();
    return () => { isMounted = false; };
  }, []);

  const activeNotifications = clearedNotifications ? [] : notifications;

  return (
    <header style={{
      height: '72px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border-light, #e2e8f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 1rem' : '0 1.75rem',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      width: '100%',
    }}>
      {/* Left: Branding & Tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        {isMobile && (
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label="Toggle Navigation Menu"
            title="Toggle Navigation Menu"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0B1F3A',
              padding: 0,
              flexShrink: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EFF6FF';
              e.currentTarget.style.borderColor = '#2563EB';
              e.currentTarget.style.color = '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.color = '#0B1F3A';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
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
          boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)',
          flexShrink: 0,
        }}>
          🌿
        </div>
        <div>
          <h1 style={{
            fontSize: isMobile ? '1rem' : '1.15rem',
            fontWeight: '700',
            color: '#0f172a',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            margin: 0
          }}>
            Fertilizer Shop Management
          </h1>
          <p style={{
            fontSize: '0.75rem',
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
      <div style={{ flex: '1', maxWidth: '420px', margin: isMobile ? '0 0.75rem' : '0 2rem' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.25rem', flexShrink: 0 }}>
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
            {activeNotifications.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: '700',
                minWidth: '16px',
                height: '16px',
                padding: '0 3px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px #ffffff'
              }}>
                {activeNotifications.length}
              </span>
            )}
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
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: '700' }}>
                  Live System Alerts ({activeNotifications.length})
                </h4>
                {activeNotifications.length > 0 && (
                  <span
                    onClick={() => setClearedNotifications(true)}
                    style={{ fontSize: '0.75rem', color: '#059669', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Clear all
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
                {activeNotifications.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                    ✅ No pending alerts or low stock warnings.
                  </div>
                ) : (
                  activeNotifications.map(n => (
                    <div key={n.id} style={{
                      padding: '0.6rem',
                      borderRadius: '8px',
                      background: n.urgent ? '#fef2f2' : '#f8fafc',
                      borderLeft: n.urgent ? '3px solid #ef4444' : '3px solid #059669'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.8rem', color: n.urgent ? '#991b1b' : '#1e293b' }}>{n.title}</strong>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{n.time}</span>
                      </div>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#475569' }}>{n.desc}</p>
                    </div>
                  ))
                )}
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
            <div style={{ textAlign: 'left', display: isMobile ? 'none' : 'block' }}>
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
      </div>
    </header>
  );
}
