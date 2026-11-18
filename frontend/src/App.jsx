import React, { useState, useEffect } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProductsStockOverview from './pages/ProductsStockOverview';
import PurchasesSales from './pages/PurchasesSales';
import CustomerDetails from './pages/CustomerDetails';
import Reports from './pages/Reports';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import NotFound from './pages/NotFound';

// Known valid module routes
const KNOWN_ROUTES = [
  'dashboard',
  'products-stock',
  'purchase-sales',
  'customer-details',
  'reports',
  'privacy-policy',
  'terms-and-conditions',
];

function resolveMenuFromPath(path) {
  const clean = (path || window.location.pathname).replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!clean || clean === 'login') return 'dashboard';
  if (KNOWN_ROUTES.includes(clean)) return clean;
  return '404';
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeMenu, setActiveMenu] = useState(() => resolveMenuFromPath());
  const [activeSubItem, setActiveSubItem] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  // Synchronize browser history and popstate
  useEffect(() => {
    const onPopState = () => {
      const menu = resolveMenuFromPath(window.location.pathname);
      setActiveMenu(menu);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSelectMenu = (menuId, subItemId = '') => {
    setActiveMenu(menuId);
    setActiveSubItem(subItemId);
    const targetPath = menuId === 'dashboard' ? '/' : `/${menuId}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  const handleSearch = (query) => {
    setGlobalSearch(query);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B1F3A',
        color: '#FFFFFF',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(255, 255, 255, 0.2)',
          borderTopColor: '#2563EB',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          marginBottom: '1rem',
        }} />
        <p style={{ fontSize: '0.9rem', color: '#94A3B8', fontWeight: '500' }}>
          Loading Fertilizer Management Session...
        </p>
      </div>
    );
  }

  // Publicly accessible pages without requiring login
  if (!isAuthenticated) {
    if (activeMenu === 'privacy-policy') {
      return (
        <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
          <PrivacyPolicy onNavigate={handleSelectMenu} />
        </div>
      );
    }
    if (activeMenu === 'terms-and-conditions') {
      return (
        <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
          <TermsAndConditions onNavigate={handleSelectMenu} />
        </div>
      );
    }
    if (activeMenu === '404') {
      return (
        <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
          <NotFound onNavigate={handleSelectMenu} attemptedPath={window.location.pathname} />
        </div>
      );
    }
    return <Login onNavigate={handleSelectMenu} />;
  }

  const renderActiveModule = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard onNavigate={handleSelectMenu} searchQueryProp={globalSearch} />;
      case 'products-stock':
        return <ProductsStockOverview subItem={activeSubItem} onNavigate={handleSelectMenu} searchQueryProp={globalSearch} />;
      case 'purchase-sales':
        return <PurchasesSales subItem={activeSubItem} onNavigate={handleSelectMenu} searchQueryProp={globalSearch} />;
      case 'customer-details':
        return <CustomerDetails subItem={activeSubItem} onNavigate={handleSelectMenu} searchQueryProp={globalSearch} />;
      case 'reports':
        return <Reports subItem={activeSubItem} onNavigate={handleSelectMenu} searchQueryProp={globalSearch} />;
      case 'privacy-policy':
        return <PrivacyPolicy onNavigate={handleSelectMenu} />;
      case 'terms-and-conditions':
        return <TermsAndConditions onNavigate={handleSelectMenu} />;
      case '404':
        return <NotFound onNavigate={handleSelectMenu} attemptedPath={window.location.pathname} />;
      default:
        return <NotFound onNavigate={handleSelectMenu} attemptedPath={activeMenu} />;
    }
  };

  return (
    <MainLayout
      activeMenu={activeMenu}
      onSelectMenu={handleSelectMenu}
      onSearch={handleSearch}
    >
      {renderActiveModule()}
    </MainLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
