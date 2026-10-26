import React, { useState } from 'react';

// Crisp SVG Menu Symbols
export const MenuIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

export const DashboardIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="9" rx="1"></rect>
    <rect x="14" y="3" width="7" height="5" rx="1"></rect>
    <rect x="14" y="12" width="7" height="9" rx="1"></rect>
    <rect x="3" y="16" width="7" height="5" rx="1"></rect>
  </svg>
);

export const ProductsIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

export const SalesIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
);

export const CustomersIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

export const ReportsIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

// Map section ID to crisp SVG symbol
export const getMenuSymbol = (id, size = 18, color = 'currentColor') => {
  switch (id) {
    case 'dashboard':
      return <DashboardIcon size={size} color={color} />;
    case 'products-stock':
      return <ProductsIcon size={size} color={color} />;
    case 'purchase-sales':
      return <SalesIcon size={size} color={color} />;
    case 'customer-details':
      return <CustomersIcon size={size} color={color} />;
    case 'reports':
      return <ReportsIcon size={size} color={color} />;
    default:
      return <MenuIcon size={size} color={color} />;
  }
};

export const MENU_DATA = [
  {
    id: 'dashboard',
    number: '01',
    title: 'Dashboard',
    subtitle: 'Business Overview',
    icon: '📊',
  },
  {
    id: 'products-stock',
    number: '02',
    title: 'Products & Stock Overview',
    subtitle: 'Products and Inventory',
    icon: '📦',
  },
  {
    id: 'purchase-sales',
    number: '03',
    title: 'Purchase & Sales',
    subtitle: 'Stock In and Customer Billing',
    icon: '💳',
  },
  {
    id: 'customer-details',
    number: '04',
    title: 'Customer Details',
    subtitle: 'Customer Accounts and Payments',
    icon: '👥',
  },
  {
    id: 'reports',
    number: '05',
    title: 'Reports',
    subtitle: 'Business Performance and Accounts',
    icon: '📈',
  },
];

export default function SidebarMenu({
  activeMenu = 'dashboard',
  onSelectSubItem,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  isOpen = false,
  onClose,
}) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const sidebarWidth = isMobile ? '285px' : isCollapsed ? '76px' : '285px';

  const handleItemClick = (sectionId) => {
    if (onSelectSubItem) {
      onSelectSubItem(sectionId, '');
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <aside
      className="sidebar-scroll"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: isMobile ? '85vw' : sidebarWidth,
        backgroundColor: '#0B1F3A', // Exact FTS Navy Blue
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        height: isMobile ? '100vh' : 'calc(100vh - 72px)',
        position: 'fixed',
        top: isMobile ? 0 : '72px',
        left: 0,
        bottom: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        borderRight: '1px solid #1E293B',
        boxShadow: isMobile && isOpen
          ? '8px 0 30px rgba(0, 0, 0, 0.5)'
          : '4px 0 20px rgba(11, 31, 58, 0.25)',
        userSelect: 'none',
        transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: isMobile
          ? 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)'
          : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: isMobile ? 60 : 40,
      }}
    >
      {/* Mobile Drawer Header with Close Button */}
      {isMobile && (
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #1E293B',
          background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.14) 0%, rgba(11, 31, 58, 0) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#FFFFFF' }}>Navigation Menu</span>
          <button
            type="button"
            onClick={onClose}
            title="Close Menu"
            aria-label="Close Menu"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Menu Bar Icon (Below Header on Left Side) */}
      {!isMobile && (
        <div style={{
          padding: isCollapsed ? '0.85rem 0.5rem' : '0.85rem 1rem',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
            aria-label="Toggle Menu Bar"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
              transition: 'all 0.15s ease',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563EB';
              e.currentTarget.style.borderColor = '#60A5FA';
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.85)';
              e.currentTarget.style.borderColor = '#334155';
              e.currentTarget.style.color = '#38BDF8';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <MenuIcon size={20} />
          </button>
        </div>
      )}

      {/* Direct Page Navigation Menu with Symbols */}
      <nav style={{
        padding: isCollapsed ? '0.75rem 0.4rem 1rem 0.4rem' : '0.75rem 0.75rem 1rem 0.75rem',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
      }}>
        {MENU_DATA.map((section) => {
          const isCurrentSection = activeMenu === section.id;
          const isHovered = hoveredItem === section.id;

          return (
            <div
              key={section.id}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredItem(section.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <button
                type="button"
                onClick={() => handleItemClick(section.id)}
                title={isCollapsed ? section.title : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: isCollapsed ? '0' : '0.75rem',
                  padding: isCollapsed ? '0.7rem 0' : '0.625rem 0.85rem',
                  borderRadius: '10px',
                  border: isCurrentSection
                    ? '1px solid #2563EB'
                    : '1px solid transparent',
                  backgroundColor: isCurrentSection
                    ? 'rgba(37, 99, 235, 0.24)'
                    : isHovered
                    ? 'rgba(30, 41, 59, 0.8)'
                    : 'transparent',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* Left Active Glow Bar */}
                {isCurrentSection && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '15%',
                    bottom: '15%',
                    width: '3.5px',
                    borderRadius: '0 4px 4px 0',
                    backgroundColor: '#2563EB',
                    boxShadow: '0 0 8px #2563EB',
                  }} />
                )}

                {/* Menu Symbol Icon Badge */}
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: isCurrentSection ? '#2563EB' : 'rgba(30, 41, 59, 0.85)',
                  color: isCurrentSection ? '#FFFFFF' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: isCurrentSection ? '1px solid #60A5FA' : '1px solid #334155',
                  boxShadow: isCurrentSection ? '0 2px 10px rgba(37, 99, 235, 0.4)' : 'none',
                  transition: 'all 0.15s ease',
                }}>
                  {getMenuSymbol(
                    section.id,
                    20,
                    isCurrentSection ? '#FFFFFF' : isHovered ? '#38BDF8' : '#94A3B8'
                  )}
                </div>

                {/* Title (Expanded Only) */}
                {!isCollapsed && (
                  <span style={{
                    fontSize: '0.92rem',
                    fontWeight: '700',
                    color: isCurrentSection ? '#FFFFFF' : '#E2E8F0',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {section.title}
                  </span>
                )}

                {/* Right Arrow Indicator for Active Item (Expanded Only) */}
                {!isCollapsed && isCurrentSection && (
                  <span style={{
                    fontSize: '0.85rem',
                    color: '#38BDF8',
                    fontWeight: '800',
                    marginLeft: 'auto',
                  }}>
                    →
                  </span>
                )}
              </button>

              {/* Floating Tooltip in Collapsed Mode */}
              {isCollapsed && isHovered && (
                <div style={{
                  position: 'absolute',
                  left: '84px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#0B1F3A',
                  color: '#FFFFFF',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  border: '1px solid #2563EB',
                  zIndex: 100,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: '700', color: '#FFFFFF' }}>
                    {section.title}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
