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
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteProduct = (prod) => {
    setProductToDelete(prod);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await productsStockService.deleteProduct(productToDelete.id || productToDelete.code);
      setProductToDelete(null);
      if (selectedProductDetails && (selectedProductDetails.id === productToDelete.id || selectedProductDetails.code === productToDelete.code)) {
        setIsDetailsDrawerOpen(false);
        setSelectedProductDetails(null);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to delete product:', err);
    } finally {
      setIsDeleting(false);
    }
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

      {/* 6 & 7. Product Table with View Details, Update Stock, and Delete */}
      <ProductTable
        products={products}
        onViewDetails={handleOpenDetails}
        onUpdateStock={handleOpenAdjustment}
        onEditProduct={handleOpenEditProduct}
        onDeleteProduct={handleDeleteProduct}
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
        onDeleteProduct={handleDeleteProduct}
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

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(11, 31, 58, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid #CBD5E1',
            textAlign: 'center',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              margin: '0 auto 1rem auto',
            }}>
              🗑️
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0B1F3A', margin: '0 0 0.5rem 0' }}>
              Delete Product?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong style={{ color: '#0B1F3A' }}>{productToDelete.name}</strong> ({productToDelete.code})? This will permanently delete the product and its stock record.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                style={{
                  padding: '0.65rem 1.25rem',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  padding: '0.65rem 1.35rem',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
