import React, { useState, useEffect } from 'react';
import TopHeader from './TopHeader';
import SidebarMenu, { MENU_DATA } from './SidebarMenu';

export default function MainLayout({
  activeMenu,
  onSelectMenu,
  onSearch,
  children
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1024;
    }
    return false;
  });

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const currentSection = MENU_DATA.find((m) => m.id === activeMenu) || MENU_DATA[0];

  const handleToggleMenu = () => {
    if (isMobile) {
      setMobileDrawerOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setMobileDrawerOpen(false);
      } else if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = isMobile ? '0px' : isSidebarCollapsed ? '76px' : '285px';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', overflow: 'hidden' }}>
      {/* Mobile Drawer Backdrop */}
      {isMobile && mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(2px)',
            zIndex: 55,
            transition: 'opacity 0.25s ease',
          }}
          aria-hidden="true"
        />
      )}

      {/* 1. Left Sidebar Navigation with Menu Symbols */}
      <SidebarMenu
        activeMenu={activeMenu}
        onSelectSubItem={onSelectMenu}
        isCollapsed={!isMobile && isSidebarCollapsed}
        onToggleCollapse={handleToggleMenu}
        isMobile={isMobile}
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* 2. Fixed Top Header */}
      <TopHeader
        onSearch={onSearch}
        onToggleMenu={handleToggleMenu}
        showMobileMenuButton={isMobile}
        sidebarWidth={sidebarWidth}
        isMobile={isMobile}
        onNavigate={onSelectMenu}
      />

      {/* 3. Scrollable Main Dashboard Content Area */}
      <div
        id="main-scroll-container"
        style={{
          position: 'fixed',
          top: '72px',
          left: sidebarWidth,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Breadcrumb & Context Header */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: isMobile ? '0.65rem 1rem' : '0.75rem 2rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#0B1F3A', fontWeight: '800' }}>
              {currentSection.title}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{
              fontSize: '0.75rem',
              background: '#F1F5F9',
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              color: '#475569',
              fontWeight: '600',
              border: '1px solid #E2E8F0',
            }}>
              📅 Today: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Dynamic Page Content */}
        <main style={{
          flex: 1,
          padding: isMobile ? '1rem' : '1.75rem 2rem',
        }}>
          {children}
        </main>

        {/* Global Footer */}
        <footer style={{
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          padding: isMobile ? '1rem' : '1.25rem 2rem',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.8rem',
          color: '#64748B',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700', color: '#0B1F3A', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <img src="/logo.png" alt="Fertilizer Shop Logo" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
              Fertilizer Shop Management
            </span>
            <span>•</span>
            <span>v1.0.0</span>
            <span>•</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#059669',
              fontWeight: '600',
              backgroundColor: '#ECFDF5',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.725rem',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              HTTPS Secured
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => onSelectMenu('privacy-policy')}
              style={{
                background: 'none',
                border: 'none',
                color: activeMenu === 'privacy-policy' ? '#2563EB' : '#64748B',
                fontWeight: activeMenu === 'privacy-policy' ? '700' : '500',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: '0.2rem 0',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.color = activeMenu === 'privacy-policy' ? '#2563EB' : '#64748B')}
            >
              Privacy Policy
            </button>

            <button
              onClick={() => onSelectMenu('terms-and-conditions')}
              style={{
                background: 'none',
                border: 'none',
                color: activeMenu === 'terms-and-conditions' ? '#2563EB' : '#64748B',
                fontWeight: activeMenu === 'terms-and-conditions' ? '700' : '500',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: '0.2rem 0',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.color = activeMenu === 'terms-and-conditions' ? '#2563EB' : '#64748B')}
            >
              Terms &amp; Conditions
            </button>

            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#64748B',
                textDecoration: 'none',
                fontSize: '0.8rem',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
            >
              Sitemap
            </a>

            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#64748B',
                textDecoration: 'none',
                fontSize: '0.8rem',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
            >
              Robots.txt
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
