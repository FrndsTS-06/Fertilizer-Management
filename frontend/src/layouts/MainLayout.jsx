import React, { useState } from 'react';
import TopHeader from './TopHeader';
import SidebarMenu, { MENU_DATA } from './SidebarMenu';

export default function MainLayout({
  activeMenu,
  onSelectMenu,
  children
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const currentSection = MENU_DATA.find((m) => m.id === activeMenu) || MENU_DATA[0];

  const handleToggleMenu = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* 1. Left Sidebar Navigation with Menu Symbols */}
      <SidebarMenu
        activeMenu={activeMenu}
        onSelectSubItem={onSelectMenu}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleMenu}
      />

      {/* 2. Right Side: TopHeader + Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopHeader
          shopName="GreenHarvest Agro Fertilizers"
          onSearch={(query) => console.log('Searching:', query)}
          onToggleMenu={handleToggleMenu}
        />

        {/* Breadcrumb & Context Header */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '0.75rem 2rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#0B1F3A', fontWeight: '800' }}>
              {currentSection.number}. {currentSection.title}
            </span>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ color: '#2563EB', fontWeight: '600' }}>
              {currentSection.subtitle}
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
        <main style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
