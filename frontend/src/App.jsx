import React, { useState } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProductsStockOverview from './pages/ProductsStockOverview';
import PurchasesSales from './pages/PurchasesSales';
import CustomerDetails from './pages/CustomerDetails';
import Reports from './pages/Reports';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [activeSubItem, setActiveSubItem] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  const handleSelectMenu = (menuId, subItemId = '') => {
    setActiveMenu(menuId);
    setActiveSubItem(subItemId);
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

  if (!isAuthenticated) {
    return <Login />;
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
      default:
        return <Dashboard onNavigate={handleSelectMenu} searchQueryProp={globalSearch} />;
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
