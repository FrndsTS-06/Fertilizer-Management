import React, { useState } from 'react';
import './index.css';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProductsStockOverview from './pages/ProductsStockOverview';
import PurchasesSales from './pages/PurchasesSales';
import CustomerDetails from './pages/CustomerDetails';
import Reports from './pages/Reports';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [activeSubItem, setActiveSubItem] = useState('');

  const handleSelectMenu = (menuId, subItemId = '') => {
    setActiveMenu(menuId);
    setActiveSubItem(subItemId);
  };

  const renderActiveModule = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard onNavigate={handleSelectMenu} />;
      case 'products-stock':
        return <ProductsStockOverview subItem={activeSubItem} onNavigate={handleSelectMenu} />;
      case 'purchase-sales':
        return <PurchasesSales subItem={activeSubItem} onNavigate={handleSelectMenu} />;
      case 'customer-details':
        return <CustomerDetails subItem={activeSubItem} onNavigate={handleSelectMenu} />;
      case 'reports':
        return <Reports subItem={activeSubItem} onNavigate={handleSelectMenu} />;
      default:
        return <Dashboard onNavigate={handleSelectMenu} />;
    }
  };

  return (
    <MainLayout
      activeMenu={activeMenu}
      onSelectMenu={handleSelectMenu}
    >
      {renderActiveModule()}
    </MainLayout>
  );
}
