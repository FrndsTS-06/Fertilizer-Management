import React, { useState, useEffect, useCallback } from 'react';
import StockSummaryCards from '../components/products-stock/StockSummaryCards';
import ProductFilters from '../components/products-stock/ProductFilters';
import ProductTable from '../components/products-stock/ProductTable';
import ProductDetailsDrawer from '../components/products-stock/ProductDetailsDrawer';
import ProductForm from '../components/products-stock/ProductForm';
import StockAdjustmentForm from '../components/products-stock/StockAdjustmentForm';
import StockMovementHistory from '../components/products-stock/StockMovementHistory';
import { productsStockService } from '../services/productsStockService';

/**
 * Page 2: Products & Stock Overview
 * FTS Premium Navy & Electric Blue Theme
 * Shared Palette: #0B1F3A, #2563EB, #FFFFFF, #F1F5F9, #1E293B, #06B6D4
 */
export default function ProductsStockOverview({ subItem = 'all-products', onNavigate }) {
  // Data states
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modals & Drawers
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isStockAdjustmentOpen, setIsStockAdjustmentOpen] = useState(false);
  const [adjustmentTargetProduct, setAdjustmentTargetProduct] = useState(null);
  const [isMovementHistoryDrawerOpen, setIsMovementHistoryDrawerOpen] = useState(false);

  // Sync subItem prop from sidebar navigation
  useEffect(() => {
    if (subItem === 'low-stock-products') {
      setSelectedStatus('Low Stock');
    } else if (subItem === 'out-of-stock-products') {
      setSelectedStatus('Out of Stock');
    } else if (subItem === 'current-stock') {
      setSelectedStatus('In Stock');
    } else if (subItem === 'stock-history') {
      setIsMovementHistoryDrawerOpen(true);
    } else if (subItem === 'update-stock') {
      setIsStockAdjustmentOpen(true);
    } else {
      setSelectedStatus('All');
    }
  }, [subItem]);

  // Load data from productsStockService
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, sum, movs] = await Promise.all([
        productsStockService.getProducts({
          search: searchQuery,
          category: selectedCategory,
          status: selectedStatus,
        }),
        productsStockService.getInventorySummary(),
        productsStockService.getInventoryMovements(),
      ]);

      setProducts(prods);
      setSummary(sum);
      setMovements(movs);
    } catch (err) {
      console.error('Error fetching products/stock data:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedStatus('All');
  };

  // Drawer & Form Handlers
  const handleOpenDetails = (prod) => {
    setSelectedProductDetails(prod);
    setIsDetailsDrawerOpen(true);
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsProductFormOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setIsProductFormOpen(true);
  };

  const handleOpenAdjustment = (prod = null) => {
    setAdjustmentTargetProduct(prod || products[0] || null);
    setIsStockAdjustmentOpen(true);
  };

  const handleSaveProduct = async (formData, id) => {
    if (id) {
      await productsStockService.updateProduct(id, formData);
    } else {
      await productsStockService.createProduct(formData);
    }
    await loadData();
  };

  const handleApplyAdjustment = async (adjData) => {
    await productsStockService.createStockAdjustment(adjData);
    await loadData();
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1 & 2. Page Title & Subtitle */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <div>
          <h1 style={{
            fontSize: '1.85rem',
            fontWeight: '900',
            color: '#0B1F3A',
            letterSpacing: '-0.025em',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Products & Stock Overview
          </h1>
          <p style={{
            color: '#64748B',
            fontSize: '0.925rem',
            marginTop: '0.35rem',
            fontWeight: '500',
          }}>
            Monitor your products and available inventory
          </p>
        </div>

        {/* Action Header Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsMovementHistoryDrawerOpen(true)}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0B1F3A',
              border: '1.5px solid #CBD5E1',
              padding: '0.6rem 1.15rem',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            title="Open Stock Movement History Drawer"
          >
            <span>📜</span> Stock Movement History
          </button>

          <button
            onClick={() => handleOpenAdjustment(null)}
            style={{
              backgroundColor: '#F1F5F9',
              color: '#2563EB',
              border: '1.5px solid rgba(37, 99, 235, 0.3)',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
          >
            <span>⚖️</span> Update Stock
          </button>

          <button
            onClick={handleOpenAddProduct}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.6rem 1.35rem',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 3px 10px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
          >
            <span>+</span> Add Product
          </button>
        </div>
      </div>

      {/* 3. Summary Cards */}
      <StockSummaryCards
        summary={summary}
        activeStatus={selectedStatus}
        onFilterStatus={(status) => setSelectedStatus(status)}
      />

      {/* 4 & 5. Search Field & Category/Status Filters */}
      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onResetFilters={handleResetFilters}
        totalFound={products.length}
      />

      {/* 6 & 7. Product Table with View Details and Update Stock */}
      <ProductTable
        products={products}
        onViewDetails={handleOpenDetails}
        onUpdateStock={handleOpenAdjustment}
        onEditProduct={handleOpenEditProduct}
      />

      {/* 8. Stock Movement History Drawer */}
      {isMovementHistoryDrawerOpen && (
        <StockMovementHistory
          movements={movements}
          onRefresh={loadData}
          isDrawer={true}
          onClose={() => setIsMovementHistoryDrawerOpen(false)}
        />
      )}

      {/* Product Details Drawer */}
      <ProductDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        product={selectedProductDetails}
        onClose={() => setIsDetailsDrawerOpen(false)}
        onOpenEdit={handleOpenEditProduct}
        onOpenAdjust={handleOpenAdjustment}
        onOpenHistory={() => setIsMovementHistoryDrawerOpen(true)}
      />

      {/* Separate Product Form (Add / Edit) */}
      <ProductForm
        isOpen={isProductFormOpen}
        product={editingProduct}
        onClose={() => setIsProductFormOpen(false)}
        onSave={handleSaveProduct}
      />

      {/* Separate Stock Adjustment Form */}
      <StockAdjustmentForm
        isOpen={isStockAdjustmentOpen}
        initialProduct={adjustmentTargetProduct}
        products={products}
        onClose={() => setIsStockAdjustmentOpen(false)}
        onSubmit={handleApplyAdjustment}
      />
    </div>
  );
}
