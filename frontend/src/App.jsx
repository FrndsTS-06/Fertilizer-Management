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

  const handleSelectMenu = (menuId) => {
    setActiveMenu(menuId);
  };

  const renderActiveModule = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard onNavigate={handleSelectMenu} />;
      case 'products-stock':
        return <ProductsStockOverview onNavigate={handleSelectMenu} />;
      case 'purchase-sales':
        return <PurchasesSales onNavigate={handleSelectMenu} />;
      case 'customer-details':
        return <CustomerDetails onNavigate={handleSelectMenu} />;
      case 'reports':
        return <Reports onNavigate={handleSelectMenu} />;
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
