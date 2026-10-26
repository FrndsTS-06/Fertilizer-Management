import React, { useState, useEffect } from 'react';
import TopHeader from './TopHeader';
import SidebarMenu, { MENU_DATA } from './SidebarMenu';

export default function MainLayout({
  activeMenu,
  onSelectMenu,
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
        onSearch={(query) => console.log('Searching:', query)}
        onToggleMenu={handleToggleMenu}
        showMobileMenuButton={isMobile}
        sidebarWidth={sidebarWidth}
        isMobile={isMobile}
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
      </div>
    </div>
  );
}
