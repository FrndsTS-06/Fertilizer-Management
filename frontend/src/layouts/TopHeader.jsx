import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { productsStockService } from '../services/productsStockService';

export default function TopHeader({
  onSearch,
  onToggleMenu,
  showMobileMenuButton = false,
  sidebarWidth = '285px',
  isMobile = false,
  onNavigate,
}) {
  const { user, logout, updateCurrentUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [notificationTab, setNotificationTab] = useState('ALL'); // 'ALL' | 'STOCK' | 'DUES'
  const [isRefreshingAlerts, setIsRefreshingAlerts] = useState(false);

  // Global Live Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState({ products: [], customers: [], invoices: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilterTab, setSearchFilterTab] = useState('ALL'); // 'ALL' | 'PRODUCTS' | 'CUSTOMERS' | 'INVOICES'
  const searchContainerRef = useRef(null);

  // Store profile & Password Reset Modal States
  const [storeInfo, setStoreInfo] = useState({
    storeName: 'Fertilizer',
    gstin: '29AAAAA0000A1Z5',
  });
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Edit Profile / Shop Details States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editShopName, setEditShopName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');


  const handleOpenEditProfile = () => {
    setEditShopName(storeInfo.storeName || 'Fertilizer');
    setEditEmail(user?.email || storeInfo.email || '');
    setEditGstin(storeInfo.gstin || '');
    setEditError('');
    setEditSuccess('');
    setShowProfileMenu(false);
    setIsEditProfileOpen(true);
  };

  const handleSaveEditProfile = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setEditSubmitting(true);
    try {
      const res = await apiClient.put('/auth/store-info', {
        storeName: editShopName,
        email: editEmail,
        gstin: editGstin,
      });
      if (res?.data?.storeInfo) {
        setStoreInfo(res.data.storeInfo);
      }
      if (res?.data?.user && updateCurrentUser) {
        updateCurrentUser(res.data.user);
      }
      setEditSuccess('Profile and shop details saved successfully!');
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setEditSuccess('');
      }, 1200);
    } catch (err) {
      setEditError(err.message || 'Failed to save shop details.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleClearFormFields = () => {
    setEditShopName('');
    setEditEmail('');
    setEditGstin('');
  };


  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (newPassword.length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('New password and confirm password do not match.');
      return;
    }

    setSubmittingReset(true);
    try {
      await apiClient.post('/auth/reset-password', {
        currentPassword,
        newPassword,
      });
      setResetSuccess('Password has been successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsResetPasswordOpen(false);
        setResetSuccess('');
      }, 1500);
    } catch (err) {
      setResetError(err.message || 'Failed to update password.');
    } finally {
      setSubmittingReset(false);
    }
  };

  const loadAlerts = useCallback(async () => {
    setIsRefreshingAlerts(true);
    try {
      let lowItems = [];

      // 1. Primary query: Dedicated backend low-stock endpoint
      try {
        const lowStockRes = await apiClient.get('/inventory/low-stock');
        if (lowStockRes?.data && Array.isArray(lowStockRes.data)) {
          lowItems = lowStockRes.data;
        }
      } catch (err) {
        console.warn('Backend /inventory/low-stock error, checking products:', err.message);
      }

      // 2. Secondary fallback: Query products directly
      if (lowItems.length === 0) {
        try {
          const prodsRes = await apiClient.get('/products', { limit: 100, isActive: 'all' });
          const allProds = Array.isArray(prodsRes?.data) ? prodsRes.data : [];
          lowItems = allProds.filter((p) => {
            const stock = Number(p.stock ?? 0);
            const thresh = Number(p.minThreshold ?? p.min_threshold ?? 10);
            return stock <= thresh;
          });
        } catch (e) {
          const cachedProds = await productsStockService.getProducts();
          lowItems = (cachedProds || []).filter((p) => {
            const stock = Number(p.stock ?? 0);
            const thresh = Number(p.minThreshold ?? 10);
            return stock <= thresh;
          });
        }
      }

      // 3. Store information and Customer Khata dues
      const [storeData, custData] = await Promise.all([
        apiClient.get('/auth/store-info').catch(() => null),
        apiClient.get('/customers').catch(() => null),
      ]);

      if (storeData?.data) {
        setStoreInfo(storeData.data);
      }

      const alerts = [];

      // Sort: Out of stock (0) first, then lowest stock ascending
      const sortedLowItems = [...lowItems].sort((a, b) => {
        const aStock = Number(a.stock ?? 0);
        const bStock = Number(b.stock ?? 0);
        return aStock - bStock;
      });

      sortedLowItems.forEach((p) => {
        const stock = Number(p.stock ?? 0);
        const threshold = Number(p.minThreshold ?? p.min_threshold ?? 10);
        const unit = p.unit || p.packageType || 'units';
        const isOutOfStock = stock <= 0;
        const deficit = threshold > stock ? threshold - stock : 0;

        alerts.push({
          id: `stock-${p.id || p.code}`,
          productId: p.id || p.code,
          productCode: p.code,
          name: p.name,
          brand: p.brand || '',
          stock,
          unit,
          threshold,
          deficit,
          type: isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          urgent: isOutOfStock,
          title: isOutOfStock ? `🚨 Out of Stock: ${p.name}` : `⚠️ Low Stock Warning: ${p.name}`,
          desc: isOutOfStock
            ? `Completely out of stock (0 ${unit}). Reorder at least ${threshold} ${unit} immediately!`
            : `Only ${stock} ${unit} remaining (Below safety threshold of ${threshold} ${unit}).`,
          time: isOutOfStock ? 'CRITICAL' : 'REORDER',
        });
      });

      // Customer Khata Dues
      if (Array.isArray(custData?.data)) {
        const highDueCusts = custData.data
          .filter((c) => Number(c.outstandingDues || c.outstanding_dues || 0) > 10000)
          .slice(0, 3);
        highDueCusts.forEach((c) => {
          const dues = Number(c.outstandingDues || c.outstanding_dues || 0);
          alerts.push({
            id: `due-${c.id}`,
            type: 'KHATA_DUE',
            title: `💳 High Khata Due: ${c.name}`,
            desc: `Farmer has an outstanding balance of ₹${dues.toLocaleString('en-IN')}`,
            time: 'Due',
            urgent: false,
          });
        });
      }

      setNotifications(alerts);
    } catch (e) {
      console.error('Error fetching header notifications:', e);
    } finally {
      setIsRefreshingAlerts(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();

    // Periodic auto-check every 20 seconds
    const interval = setInterval(() => {
      loadAlerts();
    }, 20000);

    const handleInventoryChange = () => {
      loadAlerts();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('fts:inventory-updated', handleInventoryChange);
      window.addEventListener('fts:stock-changed', handleInventoryChange);
      window.addEventListener('focus', handleInventoryChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('fts:inventory-updated', handleInventoryChange);
        window.removeEventListener('fts:stock-changed', handleInventoryChange);
        window.removeEventListener('focus', handleInventoryChange);
      }
    };
  }, [loadAlerts]);

  const handleDismissAlert = (id, e) => {
    if (e) e.stopPropagation();
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const handleClearAllAlerts = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setDismissedIds(allIds);
  };

  const handleRestoreAlerts = () => {
    setDismissedIds(new Set());
    loadAlerts();
  };

  const handleAlertClick = (n) => {
    setShowNotifications(false);
    if (n.type === 'OUT_OF_STOCK') {
      if (onNavigate) {
        onNavigate('products-stock', 'out-of-stock-products');
      }
    } else if (n.type === 'LOW_STOCK') {
      if (onNavigate) {
        onNavigate('products-stock', 'low-stock-products');
      }
    } else if (n.type === 'KHATA_DUE') {
      if (onNavigate) {
        onNavigate('customer-details', 'all-customers');
      }
    }
  };

  // Global Live Search Logic
  const performSearch = useCallback(async (query) => {
    if (!query || !query.trim()) {
      setSearchResults({ products: [], customers: [], invoices: [] });
      setIsSearchOpen(false);
      if (onSearch) onSearch('');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fts:global-search', { detail: '' }));
      }
      return;
    }

    const q = query.trim().toLowerCase();
    setIsSearching(true);
    setIsSearchOpen(true);
    if (onSearch) onSearch(query);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fts:global-search', { detail: query }));
    }

    try {
      const [prodsRes, custsRes, salesRes] = await Promise.all([
        apiClient.get('/products', { limit: 100, isActive: 'all' }).catch(() => null),
        apiClient.get('/customers').catch(() => null),
        apiClient.get('/sales').catch(() => null),
      ]);

      let prodsList = Array.isArray(prodsRes?.data) ? prodsRes.data : [];
      if (prodsList.length === 0) {
        prodsList = await productsStockService.getProducts().catch(() => []);
      }
      const custsList = Array.isArray(custsRes?.data) ? custsRes.data : [];
      const salesList = Array.isArray(salesRes?.data) ? salesRes.data : [];

      const matchedProducts = prodsList.filter((p) => {
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q))
        );
      }).slice(0, 6);

      const matchedCustomers = custsList.filter((c) => {
        return (
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.village && c.village.toLowerCase().includes(q)) ||
          (c.customerCode && c.customerCode.toLowerCase().includes(q))
        );
      }).slice(0, 6);

      const matchedInvoices = salesList.filter((s) => {
        return (
          (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(q)) ||
          (s.customerName && s.customerName.toLowerCase().includes(q)) ||
          (s.paymentMethod && s.paymentMethod.toLowerCase().includes(q))
        );
      }).slice(0, 6);

      setSearchResults({
        products: matchedProducts,
        customers: matchedCustomers,
        invoices: matchedInvoices,
      });
    } catch (err) {
      console.warn('Search query error:', err.message);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch]);

  // Click outside and escape listeners for search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectProduct = (p) => {
    setIsSearchOpen(false);
    if (onNavigate) {
      onNavigate('products-stock', 'all-products');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fts:global-search', { detail: p.name || p.code }));
    }
  };

  const handleSelectCustomer = (c) => {
    setIsSearchOpen(false);
    if (onNavigate) {
      onNavigate('customer-details', 'all-customers');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fts:global-search', { detail: c.name || c.phone }));
    }
  };

  const handleSelectInvoice = (inv) => {
    setIsSearchOpen(false);
    if (onNavigate) {
      onNavigate('purchase-sales', 'invoices');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fts:global-search', { detail: inv.invoiceNumber }));
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults({ products: [], customers: [], invoices: [] });
    setIsSearchOpen(false);
    if (onSearch) onSearch('');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fts:global-search', { detail: '' }));
    }
  };

  const activeNotifications = notifications.filter((n) => !dismissedIds.has(n.id));
  const stockAlerts = activeNotifications.filter((n) => n.type === 'OUT_OF_STOCK' || n.type === 'LOW_STOCK');
  const outOfStockAlerts = activeNotifications.filter((n) => n.type === 'OUT_OF_STOCK');
  const lowStockAlerts = activeNotifications.filter((n) => n.type === 'LOW_STOCK');
  const duesAlerts = activeNotifications.filter((n) => n.type === 'KHATA_DUE');

  const displayedNotifications =
    notificationTab === 'STOCK'
      ? stockAlerts
      : notificationTab === 'DUES'
      ? duesAlerts
      : activeNotifications;

  const shopDisplayName = storeInfo.storeName || 'Fertilizer';
  const profileDisplayName = shopDisplayName; // User specified: profile displays shop name "Fertilizer"
  const profileAvatar = 'FT';

  return (
    <header style={{
      height: '72px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border-light, #e2e8f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 1rem' : '0 1.75rem',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      width: '100%',
    }}>
      {/* Left: Branding & Tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        {isMobile && (
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label="Toggle Navigation Menu"
            title="Toggle Navigation Menu"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0B1F3A',
              padding: 0,
              flexShrink: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EFF6FF';
              e.currentTarget.style.borderColor = '#2563EB';
              e.currentTarget.style.color = '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.color = '#0B1F3A';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: '800',
          fontSize: '1.25rem',
          boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)',
          flexShrink: 0,
        }}>
          🌿
        </div>
        <div>
          <h1 style={{
            fontSize: isMobile ? '1.1rem' : '1.25rem',
            fontWeight: '800',
            color: '#0f172a',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            margin: 0
          }}>
            {shopDisplayName}
          </h1>
          <p style={{
            fontSize: '0.75rem',
            color: '#059669',
            fontWeight: '600',
            margin: '2px 0 0 0',
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            Inventory, Billing & Accounts
          </p>
        </div>
      </div>

      {/* Middle: Quick Search */}
      <div
        ref={searchContainerRef}
        style={{
          flex: '1',
          maxWidth: '520px',
          margin: isMobile ? '0 0.5rem' : '0 1.5rem',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '12px',
              color: '#94a3b8',
              fontSize: '0.95rem',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search products, invoices, farmers..."
            value={searchTerm}
            onChange={(e) => {
              const val = e.target.value;
              setSearchTerm(val);
              performSearch(val);
            }}
            onFocus={() => {
              if (searchTerm.trim()) {
                setIsSearchOpen(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (searchTerm.trim()) {
                  if (searchResults.products.length > 0) {
                    handleSelectProduct(searchResults.products[0]);
                  } else if (searchResults.customers.length > 0) {
                    handleSelectCustomer(searchResults.customers[0]);
                  } else if (searchResults.invoices.length > 0) {
                    handleSelectInvoice(searchResults.invoices[0]);
                  }
                }
              }
            }}
            style={{
              width: '100%',
              padding: '0.6rem 2.2rem 0.6rem 2.4rem',
              borderRadius: '10px',
              border: isSearchOpen ? '1.5px solid #2563EB' : '1.5px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#0B1F3A',
              outline: 'none',
              boxShadow: isSearchOpen ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              title="Clear search"
              style={{
                position: 'absolute',
                right: '10px',
                background: '#E2E8F0',
                border: 'none',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: '800',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Global Instant Search Results Dropdown */}
        {isSearchOpen && searchTerm.trim() && (
          <div
            style={{
              position: 'absolute',
              top: '46px',
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              boxShadow: '0 15px 35px -5px rgba(15, 23, 42, 0.18), 0 5px 15px rgba(0,0,0,0.06)',
              padding: '0.75rem',
              zIndex: 100,
              maxHeight: '440px',
              overflowY: 'auto',
            }}
          >
            {/* Filter Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '0.35rem',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '0.5rem',
                marginBottom: '0.65rem',
              }}
            >
              {[
                { id: 'ALL', label: `All (${searchResults.products.length + searchResults.customers.length + searchResults.invoices.length})` },
                { id: 'PRODUCTS', label: `📦 Products (${searchResults.products.length})` },
                { id: 'CUSTOMERS', label: `👥 Farmers (${searchResults.customers.length})` },
                { id: 'INVOICES', label: `🧾 Invoices (${searchResults.invoices.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSearchFilterTab(tab.id)}
                  style={{
                    background: searchFilterTab === tab.id ? '#0F172A' : '#F1F5F9',
                    color: searchFilterTab === tab.id ? '#FFFFFF' : '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Loading Indicator */}
            {isSearching && (
              <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.78rem', color: '#64748B' }}>
                Searching database...
              </div>
            )}

            {!isSearching &&
              searchResults.products.length === 0 &&
              searchResults.customers.length === 0 &&
              searchResults.invoices.length === 0 && (
                <div style={{ padding: '1.25rem', textAlign: 'center', color: '#64748B', fontSize: '0.82rem' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>🔍</div>
                  No matching products, farmers, or invoices found for "<b>{searchTerm}</b>".
                </div>
              )}

            {/* 1. Products Section */}
            {(searchFilterTab === 'ALL' || searchFilterTab === 'PRODUCTS') && searchResults.products.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
                  📦 Products ({searchResults.products.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {searchResults.products.map((p) => {
                    const stock = Number(p.stock ?? 0);
                    const threshold = Number(p.minThreshold ?? p.min_threshold ?? 10);
                    const isLow = stock <= threshold && stock > 0;
                    const isOut = stock <= 0;

                    return (
                      <div
                        key={p.id || p.code}
                        onClick={() => handleSelectProduct(p)}
                        style={{
                          padding: '0.5rem 0.65rem',
                          borderRadius: '8px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EFF6FF';
                          e.currentTarget.style.borderColor = '#93C5FD';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <strong style={{ fontSize: '0.825rem', color: '#0F172A' }}>{p.name}</strong>
                            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#E0E7FF', color: '#3730A3', fontWeight: '700' }}>
                              {p.code}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            {p.brand} • {p.category || p.categoryName || 'Fertilizer'} • ₹{Number(p.price || 0).toFixed(2)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              backgroundColor: isOut ? '#FEE2E2' : isLow ? '#FEF3C7' : '#D1FAE5',
                              color: isOut ? '#991B1B' : isLow ? '#92400E' : '#065F46',
                            }}
                          >
                            {isOut ? 'Out of Stock' : `Stock: ${stock} ${p.unit || 'units'}`}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#2563EB', fontWeight: '700' }}>→</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Customers Section */}
            {(searchFilterTab === 'ALL' || searchFilterTab === 'CUSTOMERS') && searchResults.customers.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
                  👥 Farmers & Customers ({searchResults.customers.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {searchResults.customers.map((c) => {
                    const dues = Number(c.outstandingDues || c.outstanding_dues || 0);

                    return (
                      <div
                        key={c.id || c.customerCode}
                        onClick={() => handleSelectCustomer(c)}
                        style={{
                          padding: '0.5rem 0.65rem',
                          borderRadius: '8px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EFF6FF';
                          e.currentTarget.style.borderColor = '#93C5FD';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <strong style={{ fontSize: '0.825rem', color: '#0F172A' }}>{c.name}</strong>
                            {c.customerCode && (
                              <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#E2E8F0', color: '#334155', fontWeight: '700' }}>
                                {c.customerCode}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            📍 {c.village || 'No village'} • 📞 {c.phone || 'No phone'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              backgroundColor: dues > 0 ? '#FEE2E2' : '#D1FAE5',
                              color: dues > 0 ? '#991B1B' : '#065F46',
                            }}
                          >
                            {dues > 0 ? `Due: ₹${dues.toLocaleString('en-IN')}` : '✓ No Due'}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#2563EB', fontWeight: '700' }}>→</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Invoices Section */}
            {(searchFilterTab === 'ALL' || searchFilterTab === 'INVOICES') && searchResults.invoices.length > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
                  🧾 Invoices & Bills ({searchResults.invoices.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {searchResults.invoices.map((inv) => {
                    const isPaid = inv.paymentStatus === 'PAID' || inv.paymentStatus === 'CLEARED' || inv.dueAmount <= 0;

                    return (
                      <div
                        key={inv.id || inv.invoiceNumber}
                        onClick={() => handleSelectInvoice(inv)}
                        style={{
                          padding: '0.5rem 0.65rem',
                          borderRadius: '8px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EFF6FF';
                          e.currentTarget.style.borderColor = '#93C5FD';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <strong style={{ fontSize: '0.825rem', color: '#0F172A' }}>{inv.invoiceNumber}</strong>
                            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#334155', fontWeight: '700' }}>
                              {inv.billingType || 'SALE'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            Customer: {inv.customerName || 'Walk-in'} • ₹{Number(inv.totalAmount || 0).toFixed(2)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              backgroundColor: isPaid ? '#D1FAE5' : '#FEF3C7',
                              color: isPaid ? '#065F46' : '#92400E',
                            }}
                          >
                            {isPaid ? '✓ Paid' : 'Payment Pending'}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#2563EB', fontWeight: '700' }}>→</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Header Navigation & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.25rem', flexShrink: 0 }}>
        {/* Notifications Icon with Badge */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              const next = !showNotifications;
              setShowNotifications(next);
              setShowProfileMenu(false);
              if (next) {
                loadAlerts();
              }
            }}
            title={
              stockAlerts.length > 0
                ? `⚠️ ${stockAlerts.length} Stock Alert(s) Detected! (${outOfStockAlerts.length} Out of Stock, ${lowStockAlerts.length} Low Stock)`
                : 'System Notifications'
            }
            style={{
              background: stockAlerts.length > 0 ? '#FEF2F2' : '#f1f5f9',
              border: stockAlerts.length > 0 ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0',
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.15rem',
              position: 'relative',
              transition: 'all 0.2s ease',
              boxShadow: stockAlerts.length > 0 ? '0 0 10px rgba(239, 68, 68, 0.2)' : 'none',
            }}
          >
            <span>🔔</span>
            {activeNotifications.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: outOfStockAlerts.length > 0 ? '#DC2626' : '#EA580C',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 4px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px #ffffff, 0 2px 4px rgba(220, 38, 38, 0.4)',
                }}
              >
                {activeNotifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '52px',
                width: isMobile ? '310px' : '390px',
                background: '#ffffff',
                borderRadius: '14px',
                boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.15), 0 10px 15px -5px rgba(15, 23, 42, 0.08)',
                border: '1px solid #e2e8f0',
                padding: '1.1rem',
                zIndex: 60,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: '800' }}>
                    System Alerts ({activeNotifications.length})
                  </h4>
                  {isRefreshingAlerts && (
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>🔄</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => loadAlerts()}
                    title="Refresh alerts now"
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '3px 7px',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Refresh
                  </button>
                  {activeNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllAlerts}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '0.72rem',
                        color: '#64748B',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Dismiss all
                    </button>
                  )}
                  {dismissedIds.size > 0 && activeNotifications.length === 0 && (
                    <button
                      type="button"
                      onClick={handleRestoreAlerts}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '0.72rem',
                        color: '#2563EB',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Restore ({dismissedIds.size})
                    </button>
                  )}
                </div>
              </div>

              {/* Status summary pill banner */}
              {stockAlerts.length > 0 && (
                <div
                  style={{
                    backgroundColor: outOfStockAlerts.length > 0 ? '#FEF2F2' : '#FFFBEB',
                    border: outOfStockAlerts.length > 0 ? '1px solid #FECACA' : '1px solid #FDE68A',
                    borderRadius: '8px',
                    padding: '0.45rem 0.65rem',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: outOfStockAlerts.length > 0 ? '#991B1B' : '#92400E',
                    fontWeight: '600',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{outOfStockAlerts.length > 0 ? '🚨' : '⚠️'}</span>
                    <span>
                      {outOfStockAlerts.length > 0
                        ? `${outOfStockAlerts.length} Out of Stock • ${lowStockAlerts.length} Low Stock`
                        : `${lowStockAlerts.length} Low Stock Items`}
                    </span>
                  </div>
                  {onNavigate && (
                    <span
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigate('products-stock', 'low-stock-products');
                      }}
                      style={{
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: '700',
                      }}
                    >
                      Filter View →
                    </span>
                  )}
                </div>
              )}

              {/* Filter Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.35rem',
                  marginBottom: '0.75rem',
                  borderBottom: '1px solid #F1F5F9',
                  paddingBottom: '0.5rem',
                }}
              >
                {[
                  { id: 'ALL', label: `All (${activeNotifications.length})` },
                  { id: 'STOCK', label: `Stock Warnings (${stockAlerts.length})` },
                  { id: 'DUES', label: `Khata Dues (${duesAlerts.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setNotificationTab(tab.id)}
                    style={{
                      background: notificationTab === tab.id ? '#0F172A' : '#F1F5F9',
                      color: notificationTab === tab.id ? '#FFFFFF' : '#475569',
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Notification Items List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {displayedNotifications.length === 0 ? (
                  <div
                    style={{
                      padding: '1.5rem 1rem',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>✅</div>
                    <strong style={{ color: '#0F172A', display: 'block', marginBottom: '0.2rem' }}>
                      All Stock Levels Healthy!
                    </strong>
                    No products below safety threshold at this time.
                  </div>
                ) : (
                  displayedNotifications.map((n) => {
                    const isOutOfStock = n.type === 'OUT_OF_STOCK';
                    const isLowStock = n.type === 'LOW_STOCK';

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleAlertClick(n)}
                        style={{
                          padding: '0.7rem 0.8rem',
                          borderRadius: '10px',
                          background: isOutOfStock ? '#FEF2F2' : isLowStock ? '#FFFBEB' : '#F8FAFC',
                          border: isOutOfStock
                            ? '1px solid #FECACA'
                            : isLowStock
                            ? '1px solid #FDE68A'
                            : '1px solid #E2E8F0',
                          borderLeft: isOutOfStock
                            ? '4px solid #DC2626'
                            : isLowStock
                            ? '4px solid #D97706'
                            : '4px solid #2563EB',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                            <span style={{ fontSize: '1rem' }}>
                              {isOutOfStock ? '🚨' : isLowStock ? '⚠️' : '💳'}
                            </span>
                            <strong
                              style={{
                                fontSize: '0.8rem',
                                color: isOutOfStock ? '#991B1B' : isLowStock ? '#92400E' : '#1E293B',
                                lineHeight: 1.3,
                              }}
                            >
                              {n.name || n.title}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isOutOfStock ? '#DC2626' : isLowStock ? '#D97706' : '#2563EB',
                                color: '#FFFFFF',
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                              }}
                            >
                              {n.time}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDismissAlert(n.id, e)}
                              title="Dismiss this alert"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                padding: '0 2px',
                                lineHeight: 1,
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        <p style={{ margin: '4px 0 6px 0', fontSize: '0.74rem', color: '#475569', lineHeight: 1.4 }}>
                          {n.desc}
                        </p>

                        {(isOutOfStock || isLowStock) && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: '0.35rem',
                              paddingTop: '0.35rem',
                              borderTop: isOutOfStock ? '1px dashed #FCA5A5' : '1px dashed #FCD34D',
                            }}
                          >
                            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>
                              Current: <b style={{ color: isOutOfStock ? '#DC2626' : '#D97706' }}>{n.stock}</b> / Min: {n.threshold} {n.unit}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: isOutOfStock ? '#DC2626' : '#2563EB',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                              }}
                            >
                              📥 Restock Now →
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {onNavigate && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.6rem',
                    borderTop: '1px solid #E2E8F0',
                    textAlign: 'center',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigate('products-stock', 'all-products');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    📊 View All Products in Stock Overview →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: '8px',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: user?.role === 'ADMIN' ? '#2563EB' : '#059669',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.85rem',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)'
            }}>
              {profileAvatar}
            </div>
            <div style={{ textAlign: 'left', display: isMobile ? 'none' : 'block' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>
                {profileDisplayName}
              </div>
              <div style={{ fontSize: '0.7rem', color: user?.role === 'ADMIN' ? '#2563EB' : '#059669', fontWeight: '600' }}>
                {user?.role === 'ADMIN' ? 'Administrator' : 'Store Staff'}
              </div>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>▼</span>
          </button>

          {/* Profile Dropdown Popup */}
          {showProfileMenu && (
            <>
              {/* Click-outside backdrop */}
              <div
                onClick={() => setShowProfileMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              />
              <div style={{
                position: 'absolute',
                right: 0,
                top: '52px',
                width: '290px',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 15px 35px -5px rgba(11, 31, 58, 0.18), 0 5px 15px rgba(0,0,0,0.06)',
                border: '1px solid #e2e8f0',
                padding: '0.85rem',
                zIndex: 50,
                textAlign: 'left'
              }}>
                {/* 1. User Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: user?.role === 'ADMIN' ? '#2563EB' : '#059669',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '0.95rem',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                  }}>
                    {profileAvatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {profileDisplayName}
                    </div>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '2px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '0.675rem',
                      fontWeight: '700',
                      backgroundColor: user?.role === 'ADMIN' ? '#EFF6FF' : '#ECFDF5',
                      color: user?.role === 'ADMIN' ? '#1D4ED8' : '#047857',
                      border: `1px solid ${user?.role === 'ADMIN' ? '#BFDBFE' : '#A7F3D0'}`,
                    }}>
                      Role: {user?.role || 'ADMIN'}
                    </span>
                  </div>
                </div>

                {/* 2. Shop & Account Details List */}
                <div style={{ padding: '0.65rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  {/* Shop Name */}
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.025em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🏪</span> Shop Name
                    </div>
                    <div style={{ fontSize: '0.825rem', fontWeight: '700', color: '#0B1F3A', marginTop: '2px', wordBreak: 'break-word' }}>
                      {shopDisplayName}
                    </div>
                  </div>

                  {/* Email */}
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.025em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📧</span> Email
                    </div>
                    <div style={{ fontSize: '0.825rem', fontWeight: '600', color: '#0B1F3A', marginTop: '2px', wordBreak: 'break-all' }}>
                      {user?.email || storeInfo.email || <span style={{ color: '#94A3B8', fontStyle: 'italic', fontWeight: '500' }}>Not configured</span>}
                    </div>
                  </div>

                  {/* GST Number */}
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.025em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📄</span> GST Number
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      {storeInfo.gstin ? (
                        <>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.825rem', fontWeight: '800', color: '#0284C7', backgroundColor: 'rgba(2, 132, 199, 0.08)', padding: '1px 5px', borderRadius: '4px' }}>
                            {storeInfo.gstin}
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#15803D', backgroundColor: '#DCFCE7', padding: '1px 6px', borderRadius: '10px' }}>
                            ✓ Verified
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>
                          Not configured (Click Edit)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Action Options: Edit Details, Clear Data, Reset Password & Sign Out */}
                <div style={{ paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {/* Edit Details Option */}
                  <button
                    type="button"
                    onClick={handleOpenEditProfile}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.55rem 0.75rem',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8rem',
                      color: '#0B1F3A',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                      e.currentTarget.style.borderColor = '#93C5FD';
                      e.currentTarget.style.color = '#1D4ED8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.color = '#0B1F3A';
                    }}
                  >
                    <span>✏️</span> Edit Details
                  </button>


                  {/* Reset Password Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setIsResetPasswordOpen(true);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.55rem 0.75rem',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8rem',
                      color: '#0B1F3A',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                      e.currentTarget.style.borderColor = '#93C5FD';
                      e.currentTarget.style.color = '#1D4ED8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.color = '#0B1F3A';
                    }}
                  >
                    <span>🔑</span> Reset Password
                  </button>

                  {/* Sign Out Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.55rem 0.75rem',
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      fontSize: '0.8rem',
                      color: '#DC2626',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEE2E2';
                      e.currentTarget.style.borderColor = '#FCA5A5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                      e.currentTarget.style.borderColor = '#FECACA';
                    }}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Reset Password Modal */}
          {isResetPasswordOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(11, 31, 58, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}>
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 20px 25px -5px rgba(11, 31, 58, 0.3)',
                overflow: 'hidden',
                border: '1px solid #E2E8F0',
                textAlign: 'left'
              }}>
                {/* Modal Header */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F8FAFC'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🔑</span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0B1F3A', margin: 0 }}>
                      Reset / Change Password
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsResetPasswordOpen(false);
                      setResetError('');
                      setResetSuccess('');
                    }}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleResetPasswordSubmit} style={{ padding: '1.5rem' }}>
                  {resetError && (
                    <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.825rem', fontWeight: '600' }}>
                      ⚠️ {resetError}
                    </div>
                  )}
                  {resetSuccess && (
                    <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', color: '#15803D', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.825rem', fontWeight: '600' }}>
                      ✅ {resetSuccess}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                        Current Password
                      </label>
                      <input
                        type={showPasswordFields ? 'text' : 'password'}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }}
                        onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                        onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                        New Password * <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '500' }}>(Min 6 characters)</span>
                      </label>
                      <input
                        type={showPasswordFields ? 'text' : 'password'}
                        required
                        placeholder="Enter new strong password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }}
                        onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                        onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                        Confirm New Password *
                      </label>
                      <input
                        type={showPasswordFields ? 'text' : 'password'}
                        required
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }}
                        onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                        onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                      />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.775rem', color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={showPasswordFields}
                        onChange={(e) => setShowPasswordFields(e.target.checked)}
                      />
                      Show passwords
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetPasswordOpen(false);
                        setResetError('');
                        setResetSuccess('');
                      }}
                      style={{
                        padding: '0.55rem 1rem',
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReset}
                      style={{
                        padding: '0.55rem 1.25rem',
                        backgroundColor: submittingReset ? '#93C5FD' : '#2563EB',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        cursor: submittingReset ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                      }}
                    >
                      {submittingReset ? 'Updating...' : 'Save New Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Edit Profile & Shop Details Modal */}
          {isEditProfileOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(11, 31, 58, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
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
                boxShadow: '0 20px 25px -5px rgba(11, 31, 58, 0.3)',
                overflow: 'hidden',
                border: '1px solid #E2E8F0',
                textAlign: 'left'
              }}>
                <div style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F8FAFC'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>✏️</span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0B1F3A', margin: 0 }}>
                      Edit Shop & Profile Details
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsEditProfileOpen(false)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveEditProfile} style={{ padding: '1.5rem' }}>
                  {editError && (
                    <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.825rem', fontWeight: '600' }}>
                      ⚠️ {editError}
                    </div>
                  )}
                  {editSuccess && (
                    <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', color: '#15803D', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.825rem', fontWeight: '600' }}>
                      ✅ {editSuccess}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Shop Name */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                        Shop Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Fertilizer"
                        value={editShopName}
                        onChange={(e) => setEditShopName(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }}
                        onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                        onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. admin@fertilizershop.local"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }}
                        onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                        onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                      />
                    </div>

                    {/* GST Number */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                        GST Number / GSTIN
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 29AAAAA0000A1Z5"
                        value={editGstin}
                        onChange={(e) => setEditGstin(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.85rem', fontFamily: 'monospace' }}
                        onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                        onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleClearFormFields}
                      style={{
                        padding: '0.55rem 0.85rem',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        color: '#B45309',
                        cursor: 'pointer'
                      }}
                      title="Clear all fields"
                    >
                      🧹 Clear Fields
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setIsEditProfileOpen(false)}
                        style={{
                          padding: '0.55rem 1rem',
                          backgroundColor: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editSubmitting}
                        style={{
                          padding: '0.55rem 1.25rem',
                          backgroundColor: editSubmitting ? '#93C5FD' : '#2563EB',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          color: '#FFFFFF',
                          cursor: editSubmitting ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                        }}
                      >
                        {editSubmitting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}


        </div>
      </div>
    </header>
  );
}
