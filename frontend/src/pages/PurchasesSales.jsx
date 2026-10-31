import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

export default function PurchasesSales({ subItem = 'create-sale', onNavigate, searchQueryProp = '' }) {
  // Tab navigation state with safe default
  const [activeTab, setActiveTab] = useState(subItem && subItem.trim() ? subItem : 'create-sale');

  // Live API states
  const [sales, setSales] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Billing state for Create Sale / New Bill
  const [billItems, setBillItems] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerVillage, setCustomerVillage] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [ownerGstId, setOwnerGstId] = useState('29AAAAA0000A1Z5'); // Default Owner GST ID
  const [billingType, setBillingType] = useState('CUSTOMER'); // Customer & Checkout operates in Customer Bill mode by default
  // Segregated billing filter: 'RETAIL' or 'CUSTOMER' (No merged 'ALL' bills)
  const [salesBillingFilter, setSalesBillingFilter] = useState(() => {
    if (subItem && (subItem.trim() === 'invoices' || subItem.trim() === 'customer-bills')) {
      return 'CUSTOMER';
    }
    return 'RETAIL';
  });
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [creditPaymentType, setCreditPaymentType] = useState('unpaid');
  const [creditPaidAmount, setCreditPaidAmount] = useState('');
  const [selectedProductCode, setSelectedProductCode] = useState('');

  // Retail Purchase Modal States (Company Name, Product Name, Qty, Single Product Cost, Total Bill)
  const [isRetailModalOpen, setIsRetailModalOpen] = useState(false);
  const [retailCompanyName, setRetailCompanyName] = useState('IFFCO');
  const [retailSelectedProductId, setRetailSelectedProductId] = useState('');
  const [retailProductName, setRetailProductName] = useState('');
  const [retailQty, setRetailQty] = useState('1');
  const [retailSingleProductCost, setRetailSingleProductCost] = useState('');
  const [retailTotalBill, setRetailTotalBill] = useState('');
  const [savingRetailSale, setSavingRetailSale] = useState(false);

  // Payment collection modal state (Phase 4: Record Remaining Payments)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState(null);
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payMethodInput, setPayMethodInput] = useState('CASH');
  const [payRefInput, setPayRefInput] = useState('');
  const [payNotesInput, setPayNotesInput] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [payError, setPayError] = useState('');

  // Printable Invoice view modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState(null);

  // Clear Receipts Modal state
  const [isClearReceiptsModalOpen, setIsClearReceiptsModalOpen] = useState(false);
  const [clearReceiptsType, setClearReceiptsType] = useState('CUSTOMER'); // 'CUSTOMER' | 'ALL'
  const [clearRestoreStock, setClearRestoreStock] = useState(true);
  const [clearingReceipts, setClearingReceipts] = useState(false);
  const [clearReceiptsSuccess, setClearReceiptsSuccess] = useState('');

  const handleClearCustomerReceipts = async () => {
    setClearingReceipts(true);
    setClearReceiptsSuccess('');
    try {
      const res = await apiClient.post('/sales/receipts/clear-all', {
        clearType: clearReceiptsType,
        restoreStock: clearRestoreStock,
      });
      const data = res?.data?.data || {};
      setClearReceiptsSuccess(`Cleared ${data.clearedSalesCount || 0} bills and ${data.clearedPaymentsCount || 0} payment receipts!`);
      await fetchData();
      setTimeout(() => {
        setIsClearReceiptsModalOpen(false);
        setClearReceiptsSuccess('');
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to clear customer receipts');
    } finally {
      setClearingReceipts(false);
    }
  };

  // Custom GST Tax Configuration (Added / modified by Admin)
  const [gstRate, setGstRate] = useState(18); // Default 18%
  const [isCustomGst, setIsCustomGst] = useState(false);
  const [customGstInput, setCustomGstInput] = useState('18');
  const [gstMode, setGstMode] = useState('EXCLUSIVE'); // 'EXCLUSIVE' (+ on top) or 'INCLUSIVE' (included in price)
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [stockMovements, setStockMovements] = useState([]);
  const [stockFilter, setStockFilter] = useState('All'); // 'All' | 'ADDED' | 'SELL' | 'UPDATE'
  const [stockSearch, setStockSearch] = useState(searchQueryProp || '');

  // Synchronize with global top search
  useEffect(() => {
    if (searchQueryProp !== undefined && searchQueryProp !== '') {
      setStockSearch(searchQueryProp);
    }
  }, [searchQueryProp]);

  useEffect(() => {
    const handleGlobalSearch = (e) => {
      if (typeof e.detail === 'string') {
        setStockSearch(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('fts:global-search', handleGlobalSearch);
      return () => window.removeEventListener('fts:global-search', handleGlobalSearch);
    }
  }, []);

  // Fetch real sales, products, customers, and stock movements from backend API
  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, prodRes, custRes, movRes] = await Promise.all([
        apiClient.get('/sales').catch(() => null),
        apiClient.get('/products').catch(() => null),
        apiClient.get('/customers').catch(() => null),
        apiClient.get('/inventory/movements').catch(() => null),
      ]);

      if (salesRes?.data) setSales(salesRes.data);
      if (prodRes?.data) setAvailableProducts(prodRes.data);
      if (custRes?.data) setCustomers(custRes.data);
      if (movRes?.data) setStockMovements(movRes.data);
    } catch (err) {
      console.error('Failed to load purchase/sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subItem && subItem.trim()) {
      const clean = subItem.trim();
      if (clean === 'create-sale-retail' || clean === 'retail-bill') {
        setIsRetailModalOpen(true);
      } else if (clean === 'create-sale-customer' || clean === 'customer-bill') {
        setActiveTab('create-sale');
        setBillingType('CUSTOMER');
      } else if (clean === 'sales-history' || clean === 'retail-bills') {
        setActiveTab('retail-bills');
        setSalesBillingFilter('RETAIL');
      } else if (clean === 'invoices' || clean === 'customer-bills') {
        setActiveTab('customer-bills');
        setSalesBillingFilter('CUSTOMER');
      } else {
        setActiveTab(clean);
      }
    }
  }, [subItem]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAddProduct = () => {
    if (!selectedProductCode) return;
    const prod = availableProducts.find(p => (p.id || p.code) === selectedProductCode);
    if (!prod) return;

    const existingIndex = billItems.findIndex(i => i.code === (prod.code || prod.id));
    if (existingIndex >= 0) {
      const updated = [...billItems];
      const newTotalQty = (Number(updated[existingIndex].qty) || 0) + 1;
      updated[existingIndex].qty = newTotalQty;
      updated[existingIndex].total = newTotalQty * updated[existingIndex].price;
      setBillItems(updated);
    } else {
      setBillItems([
        ...billItems,
        {
          id: prod.id || prod.code,
          code: prod.code || prod.id,
          name: prod.name,
          price: Number(prod.price) || 0,
          qty: 1,
          total: Number(prod.price) || 0,
          unit: prod.unit || 'bags',
          stock: Number(prod.stock) || 0,
          minThreshold: Number(prod.minThreshold || prod.min_threshold || 5),
        }
      ]);
    }
    setSelectedProductCode('');
  };

  const handleUpdateQty = (index, newQty) => {
    const updated = [...billItems];
    if (newQty === '' || newQty === null || newQty === undefined) {
      updated[index].qty = '';
      updated[index].total = 0;
      setBillItems(updated);
      return;
    }
    const clean = String(newQty).replace(/[^0-9]/g, '');
    const num = clean === '' ? '' : parseInt(clean, 10);
    updated[index].qty = num;
    updated[index].total = (Number(num) || 0) * (Number(updated[index].price) || 0);
    setBillItems(updated);
  };

  const handleBlurQty = (index) => {
    const updated = [...billItems];
    const num = Math.max(1, Number(updated[index].qty) || 1);
    updated[index].qty = num;
    updated[index].total = num * (Number(updated[index].price) || 0);
    setBillItems(updated);
  };

  const handleRemoveItem = (index) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  // Phase 3: Retail Purchase Handlers (Company Name, Product Name, Qty, Single Product Cost, Total Bill)
  const handleRetailProductSelect = (productId) => {
    setRetailSelectedProductId(productId);
    if (!productId) {
      setRetailProductName('');
      return;
    }
    const prod = availableProducts.find(p => (p.id || p.code) === productId);
    if (prod) {
      setRetailProductName(prod.name || '');
      if (prod.brand || prod.company) {
        setRetailCompanyName(prod.brand || prod.company);
      }
      const unitCost = prod.costPrice || prod.price || prod.sellingPrice || 0;
      setRetailSingleProductCost(unitCost > 0 ? String(unitCost) : '');
      const count = Number(retailQty) || 1;
      setRetailTotalBill(unitCost > 0 && count > 0 ? String(Number((count * unitCost).toFixed(2))) : '');
    }
  };

  const handleRetailQtyChange = (val) => {
    setRetailQty(val);
    const count = Number(val) || 0;
    const cost = Number(retailSingleProductCost) || 0;
    if (val === '' || retailSingleProductCost === '') {
      setRetailTotalBill('');
    } else {
      setRetailTotalBill(String(Number((count * cost).toFixed(2))));
    }
  };

  const handleRetailSingleCostChange = (val) => {
    setRetailSingleProductCost(val);
    const cost = Number(val) || 0;
    const count = Number(retailQty) || 0;
    if (val === '' || retailQty === '') {
      setRetailTotalBill('');
    } else {
      setRetailTotalBill(String(Number((count * cost).toFixed(2))));
    }
  };

  const handleRetailTotalBillChange = (val) => {
    setRetailTotalBill(val);
    const total = Number(val) || 0;
    const count = Number(retailQty) || 0;
    if (total > 0 && count > 0) {
      setRetailSingleProductCost(String(Number((total / count).toFixed(2))));
    }
  };

  const handleSaveRetailSale = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const comp = retailCompanyName.trim();
    const pName = retailProductName.trim();
    const qtyNum = Number(retailQty);
    const singleCostNum = Number(retailSingleProductCost);
    const totalBillNum = Number(retailTotalBill) || (qtyNum * singleCostNum);

    if (!comp) {
      alert('⚠️ Company Name is required.');
      return;
    }
    if (!pName) {
      alert('⚠️ Product Name is required.');
      return;
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('⚠️ Please enter a valid Qty greater than 0.');
      return;
    }
    if (isNaN(singleCostNum) || singleCostNum <= 0) {
      alert('⚠️ Please enter a valid Single Product Cost greater than 0.');
      return;
    }

    setSavingRetailSale(true);
    try {
      let prod = availableProducts.find(p => (p.id || p.code) === retailSelectedProductId);
      if (!prod && pName) {
        prod = availableProducts.find(p => p.name && p.name.trim().toLowerCase() === pName.toLowerCase());
      }
      if (!prod && availableProducts.length > 0) {
        prod = availableProducts[0];
      }

      const invoiceData = {
        billingType: 'RETAIL',
        customerId: null,
        customerName: comp,
        customerPhone: undefined,
        customerVillage: undefined,
        customerAddress: undefined,
        ownerGstId: ownerGstId.trim() || '29AAAAA0000A1Z5',
        items: [
          {
            productId: prod ? (prod.id || prod.code) : undefined,
            productName: pName,
            quantity: qtyNum,
            unitPrice: singleCostNum,
          }
        ],
        gstRate: 0,
        gstMode: 'INCLUSIVE',
        paymentMethod: 'CASH',
        paidAmount: Number(totalBillNum.toFixed(2)),
      };

      const res = await apiClient.post('/sales', invoiceData);
      const savedSale = res?.data || invoiceData;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fts:inventory-updated'));
      }

      setSales(prev => [savedSale, ...prev.filter(s => (s.id || s.invoiceNumber) !== (savedSale.id || savedSale.invoiceNumber))]);

      const displayInvoiceNum = savedSale.invoiceNumber || savedSale.invoice_number || 'INV-RETAIL';
      alert(`✅ 🛒 Retail Purchase Saved!\n\nInvoice: ${displayInvoiceNum}\nCompany Name: ${comp}\nProduct Name: ${pName}\nQty: ${qtyNum}\nSingle Product Cost: ₹${singleCostNum.toFixed(2)}\nTotal Bill: ₹${totalBillNum.toFixed(2)}\n\nSaved under Retail Details.`);

      // Reset and close modal
      setRetailSelectedProductId('');
      setRetailProductName('');
      setRetailQty('1');
      setRetailSingleProductCost('');
      setRetailTotalBill('');
      setIsRetailModalOpen(false);
      setSalesBillingFilter('RETAIL');
      setActiveTab('retail-bills');

      await fetchData();

      setSelectedInvoiceForView(savedSale);
      setIsInvoiceModalOpen(true);
    } catch (err) {
      console.error('Retail purchase save failed:', err);
      alert(`⚠️ Retail Purchase Failed: ${err.message || 'Please check inputs.'}`);
    } finally {
      setSavingRetailSale(false);
    }
  };

  // Dynamic GST & Net Payable Calculations
  const subtotal = billItems.reduce((acc, curr) => acc + curr.total, 0);
  const effectiveGstRate = isCustomGst ? (parseFloat(customGstInput) || 0) : gstRate;

  let gstAmount = 0;
  let netPayable = 0;

  if (gstMode === 'EXCLUSIVE') {
    // GST added on top of taxable subtotal
    gstAmount = (subtotal * effectiveGstRate) / 100;
    netPayable = subtotal + gstAmount;
  } else {
    // GST already included inside product price
    gstAmount = effectiveGstRate > 0 ? (subtotal * effectiveGstRate) / (100 + effectiveGstRate) : 0;
    netPayable = subtotal;
  }

  const handleSaveInvoice = async () => {
    if (billItems.length === 0) return;
    setSavingInvoice(true);
    try {
      const isRetail = billingType === 'RETAIL';
      const isCredit = !isRetail && (paymentMode === 'CREDIT (KHATA)' || paymentMode === 'CREDIT');
      const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const trimmedName = customerName.trim();
      const trimmedPhone = customerPhone.replace(/\D/g, '').slice(0, 10);
      if (trimmedPhone && trimmedPhone.length !== 10) {
        alert(`⚠️ Invalid Phone Number: A mobile number must be exactly 10 digits (currently ${trimmedPhone.length} digits). Please enter 10 digits or clear the field.`);
        return;
      }
      const trimmedVillage = customerVillage.trim();
      const trimmedAddress = customerAddress.trim();
      const isPlaceholderWalkIn = !trimmedName || /walk-?in|counter|anonymous|direct sale|cash customer/i.test(trimmedName);

      let matchedCust = null;
      let custId = undefined;

      if (!isRetail) {
        // Customer Bill: 1. Resolve matching customer from loaded state by id, phone, or name
        matchedCust = customers.find(c =>
          (selectedCustomerId && (c.id === selectedCustomerId || c.customerCode === selectedCustomerId)) ||
          (trimmedPhone && c.phone && c.phone.trim() === trimmedPhone) ||
          (trimmedName && !isPlaceholderWalkIn && c.name && c.name.trim().toLowerCase() === trimmedName.toLowerCase())
        );

        custId = (matchedCust?.id && isUUID(matchedCust.id)) ? matchedCust.id : (isUUID(selectedCustomerId) ? selectedCustomerId : undefined);

        // 2. If genuine customer name entered but not registered in system, auto-register customer
        if (!custId && !isPlaceholderWalkIn) {
          try {
            const custRes = await apiClient.post('/customers', {
              name: trimmedName,
              phone: trimmedPhone || undefined,
              village: trimmedVillage || undefined,
              address: trimmedAddress || undefined,
              creditLimit: 50000,
              openingBalance: 0,
            });
            const createdCust = custRes?.data || custRes;
            if (createdCust?.id) {
              custId = createdCust.id;
              matchedCust = createdCust;
              setCustomers(prev => [createdCust, ...prev]);
            }
          } catch (custErr) {
            // If conflict due to phone number already existing, retrieve existing customer
            if (custErr?.status === 409 && trimmedPhone) {
              try {
                const searchRes = await apiClient.get('/customers', { search: trimmedPhone });
                const foundInDb = (searchRes?.data || searchRes || []).find(c => c.phone && c.phone.trim() === trimmedPhone);
                if (foundInDb?.id) {
                  custId = foundInDb.id;
                  matchedCust = foundInDb;
                }
              } catch (searchErr) {
                console.warn('Customer phone lookup error:', searchErr);
              }
            }
            if (!custId) {
              console.warn('Customer auto-create on client skipped (backend fallback will link):', custErr);
            }
          }
        }
      }

      const finalCustomerName = isRetail
        ? (trimmedName || 'Retail Customer')
        : (matchedCust?.name || trimmedName || 'Farmer / Customer');

      // Determine initial paid amount based on payment mode and settlement type
      let calculatedPaidAmount = 0;
      if (isCredit) {
        if (creditPaymentType === 'unpaid' || creditPaymentType === 'none') {
          // Credit with no initial payment: paidAmount = 0, dueAmount = totalAmount, status = UNPAID
          calculatedPaidAmount = 0;
        } else if (creditPaymentType === 'partial') {
          // Off Payment (Partial): paidAmount = amount entered by user
          const entered = parseFloat(creditPaidAmount);
          if (isNaN(entered) || entered < 0) {
            alert('⚠️ Invalid Payment: Please enter a valid non-negative amount for Off Payment.');
            setSavingInvoice(false);
            return;
          }
          if (entered > netPayable) {
            alert(`⚠️ Invalid Payment: Paid amount (₹${entered.toFixed(2)}) cannot exceed net payable (₹${netPayable.toFixed(2)}).`);
            setSavingInvoice(false);
            return;
          }
          calculatedPaidAmount = Number(entered.toFixed(2));
        } else {
          // Full payment under credit mode: paidAmount = totalAmount, dueAmount = 0, status = PAID
          calculatedPaidAmount = Number(netPayable.toFixed(2));
        }
      } else {
        // Non-credit modes (CASH, UPI / QR, BANK): default to full payment
        calculatedPaidAmount = Number(netPayable.toFixed(2));
      }

      // Validate bounds: paidAmount >= 0 and <= netPayable
      if (calculatedPaidAmount < 0 || calculatedPaidAmount > netPayable) {
        alert(`⚠️ Invalid Payment: Paid amount must be between ₹0 and ₹${netPayable.toFixed(2)}.`);
        setSavingInvoice(false);
        return;
      }

      const calculatedDue = Number(Math.max(0, netPayable - calculatedPaidAmount).toFixed(2));
      if (!isRetail && calculatedDue > 0 && !custId && isCredit && isPlaceholderWalkIn) {
        alert('⚠️ Registered Customer Required: Credit and Off Payment sales with pending balance require entering a customer name or selecting a registered customer account so dues are tracked in their Khata.');
        setSavingInvoice(false);
        return;
      }

      const invoiceData = {
        billingType: isRetail ? 'RETAIL' : 'CUSTOMER',
        customerId: isRetail ? null : custId,
        customerName: finalCustomerName,
        customerPhone: trimmedPhone || matchedCust?.phone || '',
        customerVillage: trimmedVillage || matchedCust?.village || '',
        customerAddress: trimmedAddress || matchedCust?.address || '',
        ownerGstId: ownerGstId.trim(),
        items: billItems.map(item => ({
          productId: item.id || item.code,
          quantity: Number(item.qty || 1),
          unitPrice: Number(item.price || 0),
        })),
        gstRate: Number(effectiveGstRate),
        gstMode,
        paymentMethod: isCredit ? 'CREDIT (KHATA)' : (paymentMode === 'CREDIT (KHATA)' ? 'CASH' : paymentMode),
        paidAmount: calculatedPaidAmount,
      };

      const res = await apiClient.post('/sales', invoiceData);
      const savedSale = res?.data || invoiceData;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fts:inventory-updated'));
      }

      setSales(prev => [savedSale, ...prev.filter(s => (s.id || s.invoiceNumber) !== (savedSale.id || savedSale.invoiceNumber))]);

      const displayInvoiceNum = savedSale.invoiceNumber || savedSale.invoice_number || 'INV-SUCCESS';
      const finalPaid = Number(savedSale.paidAmount !== undefined ? savedSale.paidAmount : calculatedPaidAmount);
      const finalDue = Number(savedSale.dueAmount !== undefined ? savedSale.dueAmount : calculatedDue);
      const finalStatus = savedSale.paymentStatus || savedSale.status || (finalDue <= 0 ? 'PAID' : finalPaid > 0 ? 'PARTIAL' : 'UNPAID');
      const statusLabel = finalStatus === 'PAID' ? 'Payment Cleared' : finalStatus === 'PARTIAL' ? 'Partially Paid' : 'Payment Pending';
      const billBadge = isRetail ? '🛒 Retail Bill' : '👥 Customer Bill';

      alert(`✅ ${billBadge} Created & Saved!\n\nInvoice: ${displayInvoiceNum}\nBilling Type: ${billBadge}\nCustomer: ${finalCustomerName}\nTotal Amount: ₹${Number(savedSale.totalAmount || netPayable).toFixed(2)}\nPaid Amount: ₹${finalPaid.toFixed(2)}\nPending Due: ₹${finalDue.toFixed(2)}\nStatus: ${statusLabel}\nPayment Method: ${savedSale.paymentMethod || invoiceData.paymentMethod}`);

      setBillItems([]);
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerVillage('');
      setCustomerAddress('');
      setCreditPaidAmount('');
      setCreditPaymentType('unpaid');
      await fetchData(); // Reload products, sales, customers & stock movements
      if (isRetail) {
        setActiveTab('retail-bills');
        setSalesBillingFilter('RETAIL');
        if (onNavigate) onNavigate('purchase-sales', 'retail-bills');
      } else {
        setActiveTab('customer-bills');
        setSalesBillingFilter('CUSTOMER');
        if (onNavigate) onNavigate('purchase-sales', 'customer-bills');
      }
    } catch (err) {
      console.error('Invoice save failed:', err);
      alert(`⚠️ Invoice Creation Failed: ${err.message || 'Please check items and stock availability.'}`);
    } finally {
      setSavingInvoice(false);
    }
  };

  // Phase 4: Handle opening payment modal for an invoice with remaining due
  const handleOpenPayModal = (sale) => {
    const due = Number(sale.dueAmount !== undefined ? sale.dueAmount : (sale.due_amount || 0));
    setSelectedInvoiceForPay(sale);
    setPayAmountInput(due > 0 ? String(due) : '');
    setPayMethodInput('CASH');
    setPayRefInput('');
    setPayNotesInput('');
    setPayError('');
    setIsPayModalOpen(true);
  };

  // Phase 4: Submit payment against an invoice
  const handleRecordPayment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedInvoiceForPay) return;

    const due = Number(selectedInvoiceForPay.dueAmount !== undefined ? selectedInvoiceForPay.dueAmount : (selectedInvoiceForPay.due_amount || 0));
    const amount = parseFloat(payAmountInput);

    if (isNaN(amount) || amount <= 0) {
      setPayError('Payment amount must be a positive number greater than ₹0.00.');
      return;
    }

    const parts = String(payAmountInput).trim().split('.');
    if (parts.length > 2 || (parts[1] && parts[1].length > 2)) {
      setPayError('Payment amount cannot have more than 2 decimal places.');
      return;
    }

    const payPaise = Math.round(amount * 100);
    const duePaise = Math.round(due * 100);

    if (payPaise > duePaise) {
      setPayError(`Payment amount (₹${(payPaise / 100).toFixed(2)}) cannot exceed remaining due (₹${(duePaise / 100).toFixed(2)}).`);
      return;
    }

    const cleanAmount = Number((payPaise / 100).toFixed(2));

    setSubmittingPayment(true);
    setPayError('');
    try {
      const saleId = selectedInvoiceForPay.id || selectedInvoiceForPay.invoiceNumber;
      const res = await apiClient.post(`/sales/${saleId}/payments`, {
        amount: cleanAmount,
        paymentMethod: payMethodInput,
        referenceNo: payRefInput.trim() || undefined,
        notes: payNotesInput.trim() || undefined,
      });

      const updatedSale = res?.data?.updatedSale;
      const paymentReceipt = res?.data?.payment;

      // Update local sales state immediately
      setSales(prev => prev.map(s => {
        if ((s.id && s.id === selectedInvoiceForPay.id) || (s.invoiceNumber && s.invoiceNumber === selectedInvoiceForPay.invoiceNumber)) {
          return {
            ...s,
            paidAmount: updatedSale?.paidAmount !== undefined ? updatedSale.paidAmount : (Number(s.paidAmount || 0) + amount),
            dueAmount: updatedSale?.dueAmount !== undefined ? updatedSale.dueAmount : Math.max(0, due - amount),
            paymentStatus: updatedSale?.status || (Math.max(0, due - amount) <= 0 ? 'PAID' : 'PARTIAL'),
            status: updatedSale?.status || (Math.max(0, due - amount) <= 0 ? 'PAID' : 'PARTIAL'),
          };
        }
        return s;
      }));

      setIsPayModalOpen(false);
      setSelectedInvoiceForPay(null);
      alert(`✅ Payment Recorded Successfully!\n\nReceipt: ${paymentReceipt?.receiptNumber || 'Confirmed'}\nInvoice: #${selectedInvoiceForPay.invoiceNumber}\nAmount Paid: ₹${amount.toFixed(2)}\nRemaining Due: ₹${(Math.max(0, due - amount)).toFixed(2)}`);
      fetchData(); // Refresh customers (Khata balances) and sales from server
    } catch (err) {
      console.error('Record payment failed:', err);
      setPayError(err.message || 'Failed to record payment. Please try again.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenInvoiceView = (sale) => {
    setSelectedInvoiceForView(sale);
    setIsInvoiceModalOpen(true);
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) {
      return new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Purchase & Sales
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => {
              setActiveTab('create-sale');
              if (onNavigate) onNavigate('purchase-sales', 'create-sale');
            }}
            style={{
              backgroundColor: '#0B1F3A',
              color: '#ffffff',
              border: '1px solid #1E293B',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(11, 31, 58, 0.25)'
            }}
            title="Create Registered Farmer / Customer Bill"
          >
            <span>👥</span> Create Sale / New Bill
          </button>
          <button
            onClick={() => setIsRetailModalOpen(true)}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: '1px solid #047857',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
              transition: 'all 0.15s ease',
            }}
            title="Open Instant Retail Purchase / Direct Counter Bill"
          >
            <span>🛒</span> + Retail Purchase
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '0.75rem',
        marginBottom: '1.5rem',
        overflowX: 'auto'
      }}>
        {[
          { id: 'create-sale', label: 'Create Sale / New Bill' },
          { id: 'stock-history', label: 'Stock History' },
          { id: 'retail-bills', label: '🛒 Retail Bills' },
          { id: 'customer-bills', label: '👥 Customer Bills' },
          { id: 'purchase-overview', label: 'Purchase Overview' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id ||
            (tab.id === 'retail-bills' && (activeTab === 'sales-history' || (activeTab !== 'create-sale' && activeTab !== 'stock-history' && activeTab !== 'purchase-overview' && salesBillingFilter === 'RETAIL'))) ||
            (tab.id === 'customer-bills' && (activeTab === 'invoices' || (activeTab !== 'create-sale' && activeTab !== 'stock-history' && activeTab !== 'purchase-overview' && salesBillingFilter === 'CUSTOMER')));

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'retail-bills') {
                  setSalesBillingFilter('RETAIL');
                } else if (tab.id === 'customer-bills') {
                  setSalesBillingFilter('CUSTOMER');
                }
                if (onNavigate) onNavigate('purchase-sales', tab.id);
              }}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isSelected ? '#0f172a' : '#f1f5f9',
                color: isSelected ? '#ffffff' : '#475569',
                fontSize: '0.825rem',
                fontWeight: isSelected ? '700' : '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* View 1: POS Billing Interface (Create Sale / New Bill) */}
      {activeTab === 'create-sale' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem' }}>
          {/* Bill Items Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem' }}>
              Billing Cart · Invoice Generator
            </h3>

            {billItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>🛒</div>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>Billing Cart is Empty</div>
                <div style={{ fontSize: '0.825rem', marginTop: '0.2rem' }}>Select a fertilizer product from the inventory dropdown below to start creating an invoice.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.825rem' }}>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Product</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Rate (₹)</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Quantity</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Remaining Stock</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Total (₹)</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem' }}>
                  {billItems.map((item, idx) => {
                    const prod = availableProducts.find(p => (p.id || p.code) === (item.id || item.code));
                    const currentStock = prod !== undefined ? Number(prod.stock || 0) : Number(item.stock || 0);
                    const qtyNum = Number(item.qty || 0);
                    const remainingStock = currentStock - qtyNum;
                    const isExceeded = remainingStock < 0;
                    const isLow = remainingStock >= 0 && remainingStock <= Number(prod?.minThreshold || item.minThreshold || 5);

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: '600', color: '#0F172A' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                            Available in store: <strong style={{ color: '#0B1F3A' }}>{currentStock} {item.unit || ''}</strong>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>₹{item.price.toFixed(2)}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', border: isExceeded ? '1.5px solid #DC2626' : '1.5px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const current = Number(item.qty) || 1;
                                if (current > 1) {
                                  handleUpdateQty(idx, current - 1);
                                }
                              }}
                              style={{
                                width: '28px',
                                height: '32px',
                                border: 'none',
                                background: '#f8fafc',
                                color: '#475569',
                                fontWeight: '700',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRight: '1px solid #e2e8f0',
                                userSelect: 'none'
                              }}
                              title="Decrease quantity"
                            >
                              −
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.qty}
                              onChange={(e) => handleUpdateQty(idx, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleBlurQty(idx)}
                              placeholder="Qty"
                              style={{
                                width: '50px',
                                height: '32px',
                                padding: '2px 4px',
                                border: 'none',
                                textAlign: 'center',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                outline: 'none',
                                color: isExceeded ? '#DC2626' : '#0F172A',
                                backgroundColor: 'transparent'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const current = Number(item.qty) || 0;
                                handleUpdateQty(idx, current + 1);
                              }}
                              style={{
                                width: '28px',
                                height: '32px',
                                border: 'none',
                                background: '#f8fafc',
                                color: '#475569',
                                fontWeight: '700',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderLeft: '1px solid #e2e8f0',
                                userSelect: 'none'
                              }}
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: isExceeded ? '#FEF2F2' : isLow ? '#FFFBEB' : '#F0FDF4',
                            color: isExceeded ? '#DC2626' : isLow ? '#B45309' : '#15803D',
                            border: `1px solid ${isExceeded ? '#FECACA' : isLow ? '#FDE68A' : '#BBF7D0'}`,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '0.775rem',
                            fontWeight: '800',
                            whiteSpace: 'nowrap',
                          }}>
                            {isExceeded
                              ? `⚠️ Exceeds stock (Deficit: ${Math.abs(remainingStock)})`
                              : remainingStock === 0
                              ? `0 ${item.unit || ''} left (Out of Stock)`
                              : `✓ ${remainingStock} ${item.unit || ''} left`}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700' }}>₹{item.total.toFixed(2)}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedProductCode}
                onChange={(e) => setSelectedProductCode(e.target.value)}
                style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', flex: 1, minWidth: '220px' }}
              >
                <option value="">-- Choose Fertilizer Product to Add --</option>
                {availableProducts.map(p => (
                  <option key={p.id || p.code} value={p.id || p.code}>
                    {p.name} ({p.brand}) - ₹{p.price} | Stock: {p.stock} {p.unit}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedProductCode}
                style={{
                  padding: '0.55rem 1rem',
                  background: selectedProductCode ? '#059669' : '#e2e8f0',
                  color: selectedProductCode ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedProductCode ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                + Add To Bill
              </button>
            </div>
          </div>

          {/* Payment & Customer Details Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.25rem' }}>
              Customer & Checkout
            </h3>

            {/* Select Registered Customer Dropdown */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B' }}>
                  Select Registered Farmer / Customer
                </label>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('customer-details')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '0.725rem',
                      fontWeight: '700',
                      color: '#2563EB',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    + Manage Customers →
                  </button>
                )}
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCustomerId(val);
                  const found = customers.find(c => c.id === val || `${c.name} (${c.village || 'Farmer'})` === val || c.name === val);
                  if (found) {
                    setCustomerName(found.name || '');
                    setCustomerPhone((found.phone || '').replace(/\D/g, '').slice(0, 10));
                    setCustomerVillage(found.village || '');
                    setCustomerAddress(found.address || '');
                  }
                }}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#FFFFFF', fontWeight: '600', color: '#0B1F3A' }}
              >
                <option value="">-- Select from Registered Customers --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.village || 'Local'} {c.phone ? `(${c.phone})` : ''} {c.outstandingDues > 0 ? `(Due: ₹${c.outstandingDues})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Details Box */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              padding: '0.9rem',
              border: '1.5px solid #E2E8F0',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  👥 Customer / Farmer Information
                </span>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('customer-details')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '6px',
                      padding: '3px 9px',
                      fontSize: '0.725rem',
                      fontWeight: '700',
                      color: '#1D4ED8',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Open Customer Details page"
                  >
                    <span>👥 Customer Details</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                {/* Customer Name */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.725rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.25rem' }}>
                    Customer / Farmer Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter customer / farmer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#0B1F3A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>

                {/* Phone */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label style={{ fontSize: '0.725rem', fontWeight: '700', color: '#1E293B', display: 'block', margin: 0 }}>
                      Phone Number
                    </label>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        color: customerPhone.length === 10 ? '#059669' : customerPhone.length > 0 ? '#D97706' : '#94A3B8',
                      }}
                    >
                      {customerPhone.length === 10 ? '✓ 10 Digits' : `${customerPhone.length}/10 digits`}
                    </span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setCustomerPhone(clean);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '6px',
                      border: customerPhone.length === 10
                        ? '1.5px solid #10B981'
                        : customerPhone.length > 0
                        ? '1.5px solid #F59E0B'
                        : '1.5px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#0B1F3A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => {
                      if (customerPhone.length === 10) e.target.style.borderColor = '#10B981';
                      else e.target.style.borderColor = '#2563EB';
                    }}
                    onBlur={(e) => {
                      if (customerPhone.length === 10) e.target.style.borderColor = '#10B981';
                      else if (customerPhone.length > 0) e.target.style.borderColor = '#F59E0B';
                      else e.target.style.borderColor = '#CBD5E1';
                    }}
                  />
                </div>

                {/* Village */}
                <div>
                  <label style={{ fontSize: '0.725rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.25rem' }}>
                    Village / Town
                  </label>
                  <input
                    type="text"
                    placeholder="Village name"
                    value={customerVillage}
                    onChange={(e) => setCustomerVillage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#0B1F3A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>
              </div>
            </div>

            {/* Owner GST ID (GSTIN) with Default GST badge */}
            <div style={{ marginBottom: '1.1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1E293B' }}>
                    Owner GST ID
                  </label>
                  <span style={{
                    fontSize: '0.675rem',
                    color: '#15803D',
                    backgroundColor: '#DCFCE7',
                    border: '1px solid #86EFAC',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    Default GST
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Enter owner GST ID"
                  value={ownerGstId}
                  onChange={(e) => setOwnerGstId(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.825rem',
                    fontFamily: 'monospace',
                    fontWeight: '700',
                    color: '#0B1F3A',
                    backgroundColor: '#FFFFFF',
                    letterSpacing: '0.04em',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {['CASH', 'UPI / QR', 'CREDIT (KHATA)', 'BANK'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: paymentMode === mode ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: paymentMode === mode ? '#f0fdf4' : '#ffffff',
                      color: paymentMode === mode ? '#166534' : '#475569',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {/* Credit settlement options appear only for CREDIT (KHATA) */}
              {paymentMode === 'CREDIT (KHATA)' && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.85rem',
                    backgroundColor: '#F8FAFC',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: '700', fontSize: '0.8rem', color: '#0F172A' }}>
                      Khata Settlement Options:
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>
                      Farmer Khata Account
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setCreditPaymentType('unpaid')}
                      style={{
                        padding: '0.5rem 0.25rem',
                        borderRadius: '6px',
                        border:
                          creditPaymentType === 'unpaid' || creditPaymentType === 'none'
                            ? '2px solid #DC2626'
                            : '1px solid #CBD5E1',
                        background:
                          creditPaymentType === 'unpaid' || creditPaymentType === 'none'
                            ? '#FEF2F2'
                            : '#FFFFFF',
                        color:
                          creditPaymentType === 'unpaid' || creditPaymentType === 'none'
                            ? '#991B1B'
                            : '#475569',
                        fontWeight: '700',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      No Initial Payment
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreditPaymentType('partial')}
                      style={{
                        padding: '0.5rem 0.25rem',
                        borderRadius: '6px',
                        border:
                          creditPaymentType === 'partial'
                            ? '2px solid #2563EB'
                            : '1px solid #CBD5E1',
                        background:
                          creditPaymentType === 'partial' ? '#EFF6FF' : '#FFFFFF',
                        color:
                          creditPaymentType === 'partial' ? '#1D4ED8' : '#475569',
                        fontWeight: '700',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      Off Payment
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreditPaymentType('full')}
                      style={{
                        padding: '0.5rem 0.25rem',
                        borderRadius: '6px',
                        border:
                          creditPaymentType === 'full'
                            ? '2px solid #059669'
                            : '1px solid #CBD5E1',
                        background:
                          creditPaymentType === 'full' ? '#F0FDF4' : '#FFFFFF',
                        color:
                          creditPaymentType === 'full' ? '#166534' : '#475569',
                        fontWeight: '700',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      Full Payment
                    </button>
                  </div>

                  {creditPaymentType === 'partial' && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontWeight: '700',
                          marginBottom: '0.35rem',
                          fontSize: '0.775rem',
                          color: '#1E293B',
                        }}
                      >
                        Amount Paid Now (₹):
                      </label>

                      <input
                        type="text"
                        min="0"
                        max={netPayable}
                        step="0.01"
                        value={creditPaidAmount}
                        onChange={(e) => setCreditPaidAmount(e.target.value)}
                        placeholder={`Enter amount paid today (max ₹${netPayable.toFixed(2)})`}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '0.55rem 0.75rem',
                          border: '1.5px solid #2563EB',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.45rem', fontSize: '0.8rem' }}>
                        <span style={{ color: '#059669', fontWeight: '600' }}>
                          Paid Today: ₹{Math.min(netPayable, Math.max(0, parseFloat(creditPaidAmount) || 0)).toFixed(2)}
                        </span>
                        <span style={{ color: '#DC2626', fontWeight: '800' }}>
                          Khata Pending Due: ₹{Math.max(0, netPayable - Math.min(netPayable, Math.max(0, parseFloat(creditPaidAmount) || 0))).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {(creditPaymentType === 'unpaid' || creditPaymentType === 'none') && (
                    <p style={{ margin: '0.6rem 0 0 0', fontSize: '0.75rem', color: '#991B1B', fontWeight: '600' }}>
                      📌 100% of bill amount (₹{netPayable.toFixed(2)}) will be registered as pending debt on the customer's Khata.
                    </p>
                  )}

                  {creditPaymentType === 'full' && (
                    <p style={{ margin: '0.6rem 0 0 0', fontSize: '0.75rem', color: '#166534', fontWeight: '600' }}>
                      ✅ Entire bill (₹{netPayable.toFixed(2)}) is cleared immediately. Zero balance carried to Khata.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Custom GST Tax Setting (Admin Configurable) */}
            <div style={{
              marginBottom: '1.25rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              padding: '0.85rem',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A' }}>
                  GST Tax Rate (%):
                </label>
                {/* Inclusive vs Exclusive toggle */}
                <div style={{ display: 'flex', gap: '0.25rem', background: '#E2E8F0', padding: '2px', borderRadius: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setGstMode('EXCLUSIVE')}
                    style={{
                      border: 'none',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: gstMode === 'EXCLUSIVE' ? '#2563EB' : 'transparent',
                      color: gstMode === 'EXCLUSIVE' ? '#FFFFFF' : '#475569',
                    }}
                    title="Add GST on top of subtotal"
                  >
                    + Add On Top
                  </button>
                  <button
                    type="button"
                    onClick={() => setGstMode('INCLUSIVE')}
                    style={{
                      border: 'none',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: gstMode === 'INCLUSIVE' ? '#2563EB' : 'transparent',
                      color: gstMode === 'INCLUSIVE' ? '#FFFFFF' : '#475569',
                    }}
                    title="GST already included in product prices"
                  >
                    Included
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', marginBottom: '0.6rem' }}>
                {[
                  { label: '0% (Nil)', value: 0 },
                  { label: '5% (Fert)', value: 5 },
                  { label: '12% (Bio)', value: 12 },
                  { label: '18% (Pest)', value: 18 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setGstRate(opt.value);
                      setIsCustomGst(false);
                      setCustomGstInput(String(opt.value));
                    }}
                    style={{
                      padding: '0.35rem 0.2rem',
                      borderRadius: '6px',
                      border: (!isCustomGst && gstRate === opt.value) ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      background: (!isCustomGst && gstRate === opt.value) ? '#EFF6FF' : '#FFFFFF',
                      color: (!isCustomGst && gstRate === opt.value) ? '#1D4ED8' : '#334155',
                      fontSize: '0.725rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom GST Input Field */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: isCustomGst ? '#EFF6FF' : '#FFFFFF',
                border: isCustomGst ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#0B1F3A',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>
                  <input
                    type="checkbox"
                    checked={isCustomGst}
                    onChange={(e) => {
                      setIsCustomGst(e.target.checked);
                      if (!e.target.checked) setCustomGstInput(String(gstRate));
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  Custom GST:
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 2.5 or 28"
                  value={customGstInput}
                  onChange={(e) => {
                    setIsCustomGst(true);
                    setCustomGstInput(e.target.value);
                  }}
                  style={{
                    flex: 1,
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    padding: '0.2rem 0.45rem',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    color: '#0B1F3A',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    width: '60px',
                  }}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B' }}>%</span>
              </div>
            </div>

            <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem', fontSize: '0.875rem', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem', fontSize: '0.875rem', color: '#64748b' }}>
                <span>
                  GST ({effectiveGstRate}% {gstMode === 'INCLUSIVE' ? 'Included' : 'Added'}):
                </span>
                <span style={{ fontWeight: '600', color: '#2563EB' }}>₹{gstAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', paddingTop: '0.45rem', borderTop: '1px solid #F1F5F9' }}>
                <span>Net Payable:</span>
                <span style={{ color: '#059669' }}>₹{netPayable.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={billItems.length === 0 || savingInvoice}
              onClick={handleSaveInvoice}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: billItems.length > 0 ? '#059669' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: billItems.length > 0 && !savingInvoice ? 'pointer' : 'not-allowed',
                boxShadow: billItems.length > 0 ? '0 4px 10px rgba(5, 150, 105, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {savingInvoice ? 'Saving Invoice...' : 'Print & Save Invoice 🖨️'}
            </button>
          </div>
        </div>
      ) : activeTab === 'stock-history' ? (
        /* Real-time Stock History Audit View (Added, Sell, Update) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Total Stock Inward</div>
              <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>+{stockMovements.filter(m => (m.action === 'ADDED' || m.type === 'PURCHASE')).reduce((acc, m) => acc + Math.abs(Number(m.changeQty || 0)), 0)}</span>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Units Added</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>From catalog creation & purchases</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Total Stock Sold</div>
              <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>-{stockMovements.filter(m => (m.action === 'SELL' || m.type === 'SALE')).reduce((acc, m) => acc + Math.abs(Number(m.changeQty || 0)), 0)}</span>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Units Sold</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Deducted across customer sales bills</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Stock Updates & Audits</div>
              <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>{stockMovements.filter(m => (m.action === 'UPDATE' || m.type === 'ADJUSTMENT')).length}</span>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Adjustments</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Manual reconciliations & counts</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Total Tracked Events</div>
              <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a' }}>
                {stockMovements.length} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Ledger Records</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Recorded with default date & timestamps</div>
            </div>
          </div>

          {/* Main Stock History Table Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📦</span> Real-time Stock History & Movements
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem', color: '#64748b' }}>
                  Live register of every stock event: Product added, customer sales deduction, and inventory update.
                </p>
              </div>

              {/* Action Filter Pills & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search product, code, invoice..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    minWidth: '220px',
                    outline: 'none'
                  }}
                />
                {[
                  { id: 'All', label: 'All Updates' },
                  { id: 'ADDED', label: '📥 Added' },
                  { id: 'SELL', label: '🛒 Sold' },
                  { id: 'UPDATE', label: '⚖️ Updated' },
                ].map((f) => {
                  const isActive = stockFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setStockFilter(f.id)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        borderRadius: '6px',
                        border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        backgroundColor: isActive ? '#0f172a' : '#ffffff',
                        color: isActive ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtered Movements List */}
            {(() => {
              const filteredMovements = stockMovements.filter((m) => {
                if (stockFilter !== 'All') {
                  const act = (m.action || (m.type === 'SALE' ? 'SELL' : m.type === 'PURCHASE' ? 'ADDED' : 'UPDATE')).toUpperCase();
                  if (stockFilter === 'ADDED' && act !== 'ADDED') return false;
                  if (stockFilter === 'SELL' && act !== 'SELL') return false;
                  if (stockFilter === 'UPDATE' && act !== 'UPDATE') return false;
                }
                if (stockSearch.trim()) {
                  const q = stockSearch.toLowerCase().trim();
                  const matchName = (m.productName || '').toLowerCase().includes(q);
                  const matchCode = (m.productCode || '').toLowerCase().includes(q);
                  const matchRef = (m.reference || '').toLowerCase().includes(q);
                  const matchReason = (m.reason || '').toLowerCase().includes(q);
                  return matchName || matchCode || matchRef || matchReason;
                }
                return true;
              });

              if (filteredMovements.length === 0) {
                return (
                  <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                      No Stock Movements Found
                    </div>
                    <div style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto' }}>
                      {stockMovements.length === 0
                        ? 'Add a new product, generate a sale bill, or update stock to see automatic ledger entries with default date and time.'
                        : 'No stock records match your search criteria. Try selecting "All Updates" or clearing search.'}
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.825rem' }}>
                        <th style={{ padding: '0.75rem' }}>Date & Time</th>
                        <th style={{ padding: '0.75rem' }}>Product Details</th>
                        <th style={{ padding: '0.75rem' }}>Stock Action</th>
                        <th style={{ padding: '0.75rem' }}>Quantity Change</th>
                        <th style={{ padding: '0.75rem' }}>Stock Balance</th>
                        <th style={{ padding: '0.75rem' }}>Reason & Reference</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.875rem' }}>
                      {filteredMovements.map((m, idx) => {
                        const act = (m.action || (m.type === 'SALE' ? 'SELL' : m.type === 'PURCHASE' ? 'ADDED' : 'UPDATE')).toUpperCase();
                        const isAdded = act === 'ADDED';
                        const isSell = act === 'SELL';
                        const isUpdate = act === 'UPDATE';
                        const changeNum = Number(m.changeQty || 0);

                        return (
                          <tr key={m.id || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                            {/* Default Device Date & Time */}
                            <td style={{ padding: '0.75rem', color: '#334155', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>
                                {formatDateTime(m.createdAt)}
                              </div>
                              <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                                Default System Date
                              </div>
                            </td>

                            {/* Product Details */}
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ fontWeight: '700', color: '#0f172a' }}>{m.productName || 'Fertilizer Product'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                                {m.productCode && <span style={{ fontFamily: 'monospace' }}>Code: {m.productCode}</span>}
                                {m.unit && <span>Unit: {m.unit}</span>}
                              </div>
                            </td>

                            {/* Stock Action Badge */}
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                background: isAdded ? '#dcfce7' : isSell ? '#fee2e2' : '#eff6ff',
                                color: isAdded ? '#166534' : isSell ? '#991b1b' : '#1e40af',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.775rem',
                                fontWeight: '700',
                                border: `1px solid ${isAdded ? '#bbf7d0' : isSell ? '#fca5a5' : '#bfdbfe'}`
                              }}>
                                {isAdded && '📥 Stock Added'}
                                {isSell && '🛒 Stock Sold'}
                                {isUpdate && '⚖️ Stock Update'}
                              </span>
                            </td>

                            {/* Quantity Change */}
                            <td style={{ padding: '0.75rem', fontWeight: '800', fontSize: '0.95rem' }}>
                              <span style={{
                                color: isAdded || changeNum > 0 ? '#059669' : isSell || changeNum < 0 ? '#dc2626' : '#2563eb'
                              }}>
                                {changeNum > 0 ? `+${changeNum}` : `${changeNum}`} {m.unit || 'Units'}
                              </span>
                            </td>

                            {/* Stock Balance Transition */}
                            <td style={{ padding: '0.75rem', color: '#334155' }}>
                              {m.previousStock != null && m.newStock != null ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                  <span style={{ color: '#64748b' }}>{m.previousStock}</span>
                                  <span style={{ color: '#94a3b8' }}>➔</span>
                                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{m.newStock} {m.unit || ''}</span>
                                </div>
                              ) : (
                                <span style={{ fontWeight: '600' }}>{m.newStock != null ? `${m.newStock} ${m.unit || ''}` : '—'}</span>
                              )}
                            </td>

                            {/* Reason & Reference */}
                            <td style={{ padding: '0.75rem', color: '#475569' }}>
                              <div style={{ fontWeight: '600' }}>{m.reason || (isAdded ? 'Product Added Inward' : isSell ? 'Customer Sale Bill' : 'Stock Adjustment')}</div>
                              {m.reference && (
                                <div style={{ fontSize: '0.75rem', color: '#2563eb', fontFamily: 'monospace', fontWeight: '600', marginTop: '2px' }}>
                                  Ref: {m.reference}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* Real History & Invoice Table View for sales-history, invoices, purchase-overview */
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {activeTab === 'purchase-overview' && '🏢 Fertilizer Inward & Supplier Records'}
              {activeTab !== 'purchase-overview' && (salesBillingFilter === 'RETAIL' || activeTab === 'retail-bills' || activeTab === 'sales-history') && '🛒 Retail Bills & Counter POS Register'}
              {activeTab !== 'purchase-overview' && (salesBillingFilter === 'CUSTOMER' || activeTab === 'customer-bills' || activeTab === 'invoices') && '👥 Customer Bills & Khata Invoices'}
            </h3>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {(activeTab === 'invoices' || activeTab === 'sales-history' || activeTab === 'retail-bills' || activeTab === 'customer-bills') && (
                <button
                  type="button"
                  onClick={() => {
                    setClearReceiptsSuccess('');
                    setIsClearReceiptsModalOpen(true);
                  }}
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1.5px solid #FECACA',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    color: '#DC2626',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(220, 38, 38, 0.08)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEE2E2';
                    e.currentTarget.style.borderColor = '#FCA5A5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEF2F2';
                    e.currentTarget.style.borderColor = '#FECACA';
                  }}
                  title="Clear all customer sales and payment receipts"
                >
                  <span>🧹</span> Clear Customer Receipts
                </button>
              )}
              <button
                onClick={() => onNavigate && onNavigate('purchase-sales', 'stock-history')}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>📦</span> View Stock History (Added, Sell, Update)
              </button>
            </div>
          </div>

          {/* Billing Classification Segregation (Strictly Separated Retail and Customer - No Merged All Bills) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            backgroundColor: '#F8FAFC',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginRight: '0.35rem' }}>
              Select Place:
            </span>
            {[
              {
                id: 'RETAIL',
                label: `🛒 Retail Bills (${sales.filter(s => (s.billingType || s.billing_type || (!s.customerId ? 'RETAIL' : 'CUSTOMER')).toUpperCase() === 'RETAIL').length})`,
                tab: 'retail-bills',
              },
              {
                id: 'CUSTOMER',
                label: `👥 Customer Bills (${sales.filter(s => (s.billingType || s.billing_type || (!s.customerId ? 'RETAIL' : 'CUSTOMER')).toUpperCase() === 'CUSTOMER').length})`,
                tab: 'customer-bills',
              },
            ].map((f) => {
              const isSelected = salesBillingFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSalesBillingFilter(f.id);
                    setActiveTab(f.tab);
                    if (onNavigate) onNavigate('purchase-sales', f.tab);
                  }}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '6px',
                    border: isSelected ? '1.5px solid #0B1F3A' : '1px solid #CBD5E1',
                    backgroundColor: isSelected ? '#0B1F3A' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 6px rgba(11, 31, 58, 0.2)' : 'none',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {(() => {
            const isRetailMode = salesBillingFilter === 'RETAIL' || activeTab === 'retail-bills' || activeTab === 'sales-history';
            const filteredSales = sales.filter((sale) => {
              const type = (sale.billingType || sale.billing_type || (sale.customerId ? 'CUSTOMER' : 'RETAIL')).toUpperCase();
              return isRetailMode ? type === 'RETAIL' : type === 'CUSTOMER';
            });

            if (filteredSales.length === 0) {
              return (
                <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {isRetailMode ? 'No Retail Bills Found' : 'No Customer Bills Found'}
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {isRetailMode
                      ? 'No direct counter retail sales recorded yet. Click "+ Retail Purchase" to record one.'
                      : 'No customer billing invoices recorded yet. Select a customer and generate an invoice.'}
                  </div>
                </div>
              );
            }

            return (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      <th style={{ padding: '0.75rem' }}>Invoice No.</th>
                      <th style={{ padding: '0.75rem' }}>{isRetailMode ? 'Company / Customer' : 'Customer / Farmer'}</th>
                      <th style={{ padding: '0.75rem' }}>{isRetailMode ? 'Product Name' : 'Items / Products'}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.75rem' }}>Date & Time</th>
                      <th style={{ padding: '0.75rem' }}>Total Amount</th>
                      <th style={{ padding: '0.75rem' }}>Total Paid</th>
                      <th style={{ padding: '0.75rem' }}>Pending Amount</th>
                      <th style={{ padding: '0.75rem' }}>Payment Method</th>
                      <th style={{ padding: '0.75rem' }}>Payment Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '0.875rem' }}>
                    {filteredSales.map((sale) => {
                      const isRetail = (sale.billingType || sale.billing_type || (!sale.customerId ? 'RETAIL' : 'CUSTOMER')).toUpperCase() === 'RETAIL';
                      const totalAmt = Number(sale.totalAmount !== undefined ? sale.totalAmount : (sale.total_amount || 0));
                      const paidAmt = Number(sale.paidAmount !== undefined ? sale.paidAmount : (sale.paid_amount || 0));
                      const dueAmt = Number(sale.dueAmount !== undefined ? sale.dueAmount : (sale.due_amount || 0));
                      const rawStatus = (sale.paymentStatus || sale.status || (dueAmt <= 0 ? 'PAID' : paidAmt > 0 ? 'PARTIAL' : 'UNPAID')).toUpperCase();
                      const isPaid = rawStatus === 'PAID';
                      const isPartial = rawStatus === 'PARTIAL';
                      const isUnpaid = rawStatus === 'UNPAID';

                      return (
                        <tr key={sale.id || sale.invoiceNumber} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                          {/* Invoice Number & Type Badge */}
                          <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0F172A', fontSize: '0.875rem' }}>
                              {sale.invoiceNumber || sale.invoice_number || sale.id}
                            </div>
                            <div style={{ marginTop: '3px' }}>
                              {isRetail ? (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: '800',
                                  backgroundColor: '#ECFDF5',
                                  color: '#047857',
                                  border: '1px solid #A7F3D0',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.02em',
                                }}>
                                  🛒 Retail
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: '800',
                                  backgroundColor: '#EEF2FF',
                                  color: '#4338CA',
                                  border: '1px solid #C7D2FE',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.02em',
                                }}>
                                  👥 Customer
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer / Company */}
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>
                            <div style={{ color: '#0F172A' }}>{sale.customerName || sale.customer_name || (isRetail ? 'Direct Counter Sale' : 'Walk-in Customer')}</div>
                            {sale.customerVillage && (
                              <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '2px' }}>
                                📍 {sale.customerVillage}
                              </div>
                            )}
                            {(sale.ownerGstin || sale.gstId) && (
                              <div style={{ fontSize: '0.7rem', color: '#2563EB', fontFamily: 'monospace', fontWeight: '600' }}>
                                GSTIN: {sale.ownerGstin || sale.gstId}
                              </div>
                            )}
                          </td>

                          {/* Product Name / Items */}
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>
                            {sale.items && sale.items.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {sale.items.map((it, idx) => (
                                  <div key={idx} style={{ color: '#0F172A', fontSize: '0.825rem', fontWeight: '700' }}>
                                    {it.productName || it.product_name || it.name || 'Fertilizer Product'}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: '#0F172A', fontSize: '0.825rem', fontWeight: '700' }}>
                                {sale.productName || 'Fertilizer Product'}
                              </div>
                            )}
                          </td>

                          {/* Qty Column */}
                          <td style={{ padding: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {sale.items && sale.items.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                {sale.items.map((it, idx) => {
                                  const q = Number(it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 1));
                                  return (
                                    <span key={idx} style={{
                                      fontWeight: '800',
                                      fontSize: '0.825rem',
                                      color: '#0B1F3A',
                                      backgroundColor: '#F1F5F9',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #CBD5E1',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}>
                                      {q} {it.unit ? <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>{it.unit}</span> : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{
                                fontWeight: '800',
                                fontSize: '0.825rem',
                                color: '#0B1F3A',
                                backgroundColor: '#F1F5F9',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                display: 'inline-block',
                              }}>
                                {Number(sale.quantity || sale.qty || sale.totalQuantity || 1)}
                              </span>
                            )}
                          </td>

                          {/* Date & Time */}
                          <td style={{ padding: '0.75rem', color: '#475569', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {formatDateTime(sale.saleDate || sale.sale_date || sale.date || sale.createdAt)}
                          </td>

                          {/* Total Bill Amount */}
                          <td style={{ padding: '0.75rem', fontWeight: '800', color: '#0F172A', whiteSpace: 'nowrap' }}>
                            ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Total Amount Paid */}
                          <td style={{ padding: '0.75rem', fontWeight: '700', color: '#059669', whiteSpace: 'nowrap' }}>
                            ₹{paidAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Pending Amount (Due) */}
                          <td style={{ padding: '0.75rem', fontWeight: '800', color: dueAmt > 0 ? '#DC2626' : '#64748B', whiteSpace: 'nowrap' }}>
                            ₹{dueAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Payment Method */}
                          <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.725rem',
                              fontWeight: '700',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              border: '1px solid #CBD5E1',
                            }}>
                              {sale.paymentMethod || sale.payment_method || 'CASH'}
                            </span>
                          </td>

                          {/* Payment Status with Required Standard Labels */}
                          <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: isPaid ? '#DCFCE7' : isPartial ? '#FEF3C7' : '#FEE2E2',
                              color: isPaid ? '#166534' : isPartial ? '#92400E' : '#991B1B',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              border: `1px solid ${isPaid ? '#BBF7D0' : isPartial ? '#FDE68A' : '#FCA5A5'}`,
                            }}>
                              {isPaid && '● Payment Cleared'}
                              {isPartial && '◐ Partially Paid'}
                              {isUnpaid && '○ Payment Pending'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              {dueAmt > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayModal(sale)}
                                  title="Record remaining invoice payment"
                                  style={{
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                                  }}
                                >
                                  <span>💳</span> Receive Payment
                                </button>
                              ) : (
                                <span style={{
                                  fontSize: '0.725rem',
                                  color: '#166534',
                                  fontWeight: '700',
                                  padding: '0.35rem 0.5rem',
                                  background: '#F0FDF4',
                                  borderRadius: '4px',
                                  border: '1px solid #BBF7D0',
                                }}>
                                  ✓ Cleared
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenInvoiceView(sale)}
                                title="View & Print Invoice"
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  color: '#0F172A',
                                  border: '1px solid #CBD5E1',
                                  padding: '0.35rem 0.55rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                🖨️ View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* =======================================================================
          MODAL 1: RECORD REMAINING PAYMENT (Phase 4)
      ======================================================================= */}
      {isPayModalOpen && selectedInvoiceForPay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0F172A' }}>
                  💳 Record Invoice Payment
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                  Invoice: <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#2563EB' }}>#{selectedInvoiceForPay.invoiceNumber || selectedInvoiceForPay.invoice_number || selectedInvoiceForPay.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsPayModalOpen(false); setSelectedInvoiceForPay(null); }}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '1.35rem',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '0.2rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRecordPayment} style={{ padding: '1.25rem 1.5rem' }}>
              {/* Invoice Summary Card */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                padding: '0.85rem',
                border: '1px solid #E2E8F0',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748B' }}>Customer:</span>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>{selectedInvoiceForPay.customerName || 'Direct Counter Sale'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748B' }}>Total Invoiced:</span>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>
                    ₹{Number(selectedInvoiceForPay.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748B' }}>Already Paid:</span>
                  <span style={{ fontWeight: '700', color: '#059669' }}>
                    ₹{Number(selectedInvoiceForPay.paidAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.45rem',
                  borderTop: '1px dashed #CBD5E1',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                }}>
                  <span style={{ color: '#DC2626' }}>Pending Balance Due:</span>
                  <span style={{ color: '#DC2626' }}>
                    ₹{Number(selectedInvoiceForPay.dueAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Amount Input */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#0F172A' }}>
                    Payment Amount to Settle (₹) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayAmountInput(String(selectedInvoiceForPay.dueAmount || 0))}
                    style={{
                      fontSize: '0.725rem',
                      color: '#2563EB',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '700',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    Pay Full Due (₹{Number(selectedInvoiceForPay.dueAmount || 0).toFixed(2)})
                  </button>
                </div>
                <input
                  type="number"
                  min="0.01"
                  max={Number(Number(selectedInvoiceForPay.dueAmount || 0).toFixed(2))}
                  step="0.01"
                  required
                  value={payAmountInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    const decParts = val.split('.');
                    if (decParts[1] && decParts[1].length > 2) return;
                    setPayAmountInput(val);
                  }}
                  placeholder="Enter payment amount"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.65rem 0.75rem',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>

              {/* Payment Method Selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.35rem' }}>
                  Payment Method <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {[
                    { id: 'CASH', label: 'Cash' },
                    { id: 'UPI', label: 'UPI / QR' },
                    { id: 'BANK_TRANSFER', label: 'Bank / Card' },
                    { id: 'CHEQUE', label: 'Cheque' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethodInput(m.id)}
                      style={{
                        padding: '0.45rem 0.2rem',
                        borderRadius: '6px',
                        border: payMethodInput === m.id ? '2px solid #2563EB' : '1px solid #CBD5E1',
                        backgroundColor: payMethodInput === m.id ? '#EFF6FF' : '#FFFFFF',
                        color: payMethodInput === m.id ? '#1D4ED8' : '#475569',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference / Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                    Reference / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    placeholder="Optional TXN ID"
                    value={payRefInput}
                    onChange={(e) => setPayRefInput(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.45rem 0.65rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cleared by farmer"
                    value={payNotesInput}
                    onChange={(e) => setPayNotesInput(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.45rem 0.65rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>

              {/* Error Message */}
              {payError && (
                <div style={{
                  padding: '0.6rem 0.8rem',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  color: '#991B1B',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                  fontWeight: '600',
                }}>
                  ⚠️ {payError}
                </div>
              )}

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setIsPayModalOpen(false); setSelectedInvoiceForPay(null); }}
                  disabled={submittingPayment}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || !payAmountInput || Number(payAmountInput) <= 0}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: submittingPayment ? '#94A3B8' : '#059669',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: submittingPayment ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 4px rgba(5,150,105,0.2)',
                  }}
                >
                  {submittingPayment ? 'Recording...' : `Record Payment (₹${Number(payAmountInput || 0).toFixed(2)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 2: PRINT / VIEW INVOICE BREAKDOWN
      ======================================================================= */}
      {isInvoiceModalOpen && selectedInvoiceForView && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}>
            {/* Header with Print & Close */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px 12px 0 0',
            }}>
              <div>
                {(() => {
                  const isModalRetail = (selectedInvoiceForView.billingType || selectedInvoiceForView.billing_type || (!selectedInvoiceForView.customerId ? 'RETAIL' : 'CUSTOMER')).toUpperCase() === 'RETAIL';
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0F172A' }}>
                        {isModalRetail ? '🛒 Retail Cash Memo' : '📄 Customer Tax Invoice'}
                      </h3>
                      <span style={{
                        fontSize: '0.675rem',
                        fontWeight: '800',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: isModalRetail ? '#ECFDF5' : '#EEF2FF',
                        color: isModalRetail ? '#047857' : '#4338CA',
                        border: `1px solid ${isModalRetail ? '#A7F3D0' : '#C7D2FE'}`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                      }}>
                        {isModalRetail ? 'Retail Bill' : 'Customer Bill'}
                      </span>
                    </div>
                  );
                })()}
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Fertilizer Management ERP System
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #059669',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  🖨️ Print
                </button>
                <button
                  type="button"
                  onClick={() => { setIsInvoiceModalOpen(false); setSelectedInvoiceForView(null); }}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* Invoice Meta Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '1rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #E2E8F0',
                marginBottom: '1rem',
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Invoice Number</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A', fontFamily: 'monospace' }}>
                    {selectedInvoiceForView.invoiceNumber || selectedInvoiceForView.invoice_number || selectedInvoiceForView.id}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.2rem' }}>
                    Date: {formatDateTime(selectedInvoiceForView.saleDate || selectedInvoiceForView.sale_date || selectedInvoiceForView.date || selectedInvoiceForView.createdAt)}
                  </div>
                  {(selectedInvoiceForView.ownerGstin || selectedInvoiceForView.gstId) && (
                    <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: '700', marginTop: '0.25rem' }}>
                      Shop GSTIN: {selectedInvoiceForView.ownerGstin || selectedInvoiceForView.gstId}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                    {(selectedInvoiceForView.billingType || selectedInvoiceForView.billing_type || (!selectedInvoiceForView.customerId ? 'RETAIL' : 'CUSTOMER')).toUpperCase() === 'RETAIL' ? 'Buyer / Counter Customer' : 'Billed Farmer / Customer'}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0F172A' }}>
                    {selectedInvoiceForView.customerName || ((selectedInvoiceForView.billingType || selectedInvoiceForView.billing_type || (!selectedInvoiceForView.customerId ? 'RETAIL' : 'CUSTOMER')).toUpperCase() === 'RETAIL' ? 'Retail Walk-in Customer' : 'Direct Counter Sale')}
                  </div>
                  {selectedInvoiceForView.customerPhone && (
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>Phone: {selectedInvoiceForView.customerPhone}</div>
                  )}
                  {selectedInvoiceForView.customerVillage && (
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>Village: {selectedInvoiceForView.customerVillage}</div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Purchased Line Items
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoiceForView.items && selectedInvoiceForView.items.length > 0 ? (
                      selectedInvoiceForView.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.5rem' }}>
                            <div style={{ fontWeight: '700', color: '#0F172A' }}>{it.productName || it.name}</div>
                            {it.productCode && <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>Code: {it.productCode}</div>}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600' }}>
                            {it.quantity} {it.unit || ''}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#475569' }}>
                            ₹{Number(it.unitPrice || it.price || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700', color: '#0F172A' }}>
                            ₹{Number(it.subtotal || ((it.quantity || 1) * (it.unitPrice || it.price || 0))).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '0.75rem', textAlign: 'center', color: '#64748B' }}>
                          Fertilizer products and supplies
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748B' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: '600', color: '#0F172A' }}>
                    ₹{Number(selectedInvoiceForView.subtotal || selectedInvoiceForView.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                {selectedInvoiceForView.gstRate !== undefined && selectedInvoiceForView.gstRate > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748B' }}>
                    <span>GST ({selectedInvoiceForView.gstRate}% {selectedInvoiceForView.gstMode === 'INCLUSIVE' ? 'Included' : 'Added'}):</span>
                    <span style={{ fontWeight: '600', color: '#2563EB' }}>
                      ₹{Number(selectedInvoiceForView.gstAmount || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: '800', color: '#0F172A', paddingTop: '0.35rem', borderTop: '1px solid #CBD5E1' }}>
                  <span>Grand Total:</span>
                  <span style={{ color: '#059669' }}>
                    ₹{Number(selectedInvoiceForView.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '700', color: '#059669' }}>
                  <span>Amount Paid:</span>
                  <span>
                    ₹{Number(selectedInvoiceForView.paidAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: '800', color: Number(selectedInvoiceForView.dueAmount || 0) > 0 ? '#DC2626' : '#64748B' }}>
                  <span>Balance Due:</span>
                  <span>
                    ₹{Number(selectedInvoiceForView.dueAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingTop: '0.35rem', borderTop: '1px dashed #CBD5E1', color: '#64748B' }}>
                  <span>Payment Method: <b>{selectedInvoiceForView.paymentMethod || 'CASH'}</b></span>
                  <span>Status: <b>{selectedInvoiceForView.paymentStatus || selectedInvoiceForView.status || 'PAID'}</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          RETAIL PURCHASE MODAL
          Contains: Company Name, Product Name, Qty, Single Product Cost, Total Bill
         ======================================================================= */}
      {isRetailModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(11, 31, 58, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(11, 31, 58, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #CBD5E1',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#059669',
              color: '#FFFFFF',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🛒</span> Retail Purchase Entry
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#D1FAE5', marginTop: '3px' }}>
                  Enter Company Name, Product Name, Qty, Single Product Cost, and Total Bill.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRetailModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
                title="Close Modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 5 Fields Only */}
            <form onSubmit={handleSaveRetailSale} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* 1. Company Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.35rem' }}>
                  Company Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter company name (e.g. IFFCO, Coromandel)"
                  value={retailCompanyName}
                  onChange={(e) => setRetailCompanyName(e.target.value)}
                  list="retail-company-suggestions"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#059669')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
                <datalist id="retail-company-suggestions">
                  {['IFFCO', 'Coromandel', 'Tata Chemicals', 'KPR', 'Nagarjuna', 'Yara', 'Mahadhan', 'IPL', 'Zuari', 'FACT'].map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* 2. Product Name */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0F172A' }}>
                    Product Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  {availableProducts.length > 0 && (
                    <span style={{ fontSize: '0.725rem', color: '#64748B' }}>
                      Select from catalog or enter below
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {availableProducts.length > 0 && (
                    <select
                      value={retailSelectedProductId}
                      onChange={(e) => handleRetailProductSelect(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.825rem',
                        fontWeight: '600',
                        color: '#0B1F3A',
                        backgroundColor: '#F8FAFC',
                        outline: 'none',
                      }}
                    >
                      <option value="">-- Choose from existing products --</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.brand ? `(${p.brand})` : ''} - ₹{p.costPrice || p.price || 0}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="Enter product name (e.g. Urea 50kg, DAP 50kg)"
                    value={retailProductName}
                    onChange={(e) => setRetailProductName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#059669')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>
              </div>

              {/* 3 & 4. Qty and Single Product Cost in 2 columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* 3. Qty */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.35rem' }}>
                    Qty <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 10"
                    value={retailQty}
                    onChange={(e) => handleRetailQtyChange(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#059669')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>

                {/* 4. Single Product Cost */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.35rem' }}>
                    Single Product Cost (₹) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 450"
                    value={retailSingleProductCost}
                    onChange={(e) => handleRetailSingleCostChange(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#059669')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>
              </div>

              {/* 5. Total Bill */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.35rem' }}>
                  Total Bill (₹) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Total Bill = Qty × Single Product Cost"
                    value={retailTotalBill}
                    onChange={(e) => handleRetailTotalBillChange(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '8px',
                      border: '2px solid #86EFAC',
                      fontSize: '1.15rem',
                      fontWeight: '800',
                      color: '#059669',
                      backgroundColor: '#F0FDF4',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#059669')}
                    onBlur={(e) => (e.target.style.borderColor = '#86EFAC')}
                  />
                </div>
                {retailQty && retailSingleProductCost && (
                  <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '4px' }}>
                    ✓ Auto-calculated: {retailQty} units × ₹{Number(retailSingleProductCost || 0).toFixed(2)} = ₹{Number(retailTotalBill || 0).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #E2E8F0',
                marginTop: '0.5rem',
              }}>
                <button
                  type="button"
                  onClick={() => setIsRetailModalOpen(false)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRetailSale}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: savingRetailSale ? '#94A3B8' : '#059669',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    cursor: savingRetailSale ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  {savingRetailSale ? 'Saving...' : '✓ Save Retail Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          CLEAR CUSTOMER RECEIPTS CONFIRMATION MODAL
      ======================================================================= */}
      {isClearReceiptsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            border: '1px solid #FECACA',
            textAlign: 'left',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.2rem 1.5rem',
              borderBottom: '1px solid #FEE2E2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FEF2F2',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.35rem' }}>🧹</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#991B1B' }}>
                    Clear Receipts & Invoices
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#B91C1C', marginTop: '2px', fontWeight: '600' }}>
                    Wipe transaction history and reset customer dues
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClearReceiptsModalOpen(false)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #FECACA',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  color: '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              {clearReceiptsSuccess ? (
                <div style={{
                  backgroundColor: '#DCFCE7',
                  border: '1.5px solid #86EFAC',
                  color: '#15803D',
                  padding: '1rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  textAlign: 'center',
                }}>
                  ✅ {clearReceiptsSuccess}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: '1.55' }}>
                    Are you sure you want to clear receipt details? This will wipe the selected transaction records, payment receipts, and recalculate customer dues.
                  </p>

                  {/* Scope Selection */}
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Select Clearing Scope
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: '#0B1F3A' }}>
                        <input
                          type="radio"
                          name="clearScope"
                          value="CUSTOMER"
                          checked={clearReceiptsType === 'CUSTOMER'}
                          onChange={() => setClearReceiptsType('CUSTOMER')}
                        />
                        <span>👥 Customer Receipts Only (Preserves Retail Walk-in Sales)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: '#0B1F3A' }}>
                        <input
                          type="radio"
                          name="clearScope"
                          value="ALL"
                          checked={clearReceiptsType === 'ALL'}
                          onChange={() => setClearReceiptsType('ALL')}
                        />
                        <span>🌐 All Receipts & Sales (Both Customer and Retail Counter)</span>
                      </label>
                    </div>
                  </div>

                  {/* Inventory Restore Checkbox */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    cursor: 'pointer',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    color: '#166534',
                    fontWeight: '600',
                  }}>
                    <input
                      type="checkbox"
                      checked={clearRestoreStock}
                      onChange={(e) => setClearRestoreStock(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#16A34A' }}
                    />
                    <span>Return sold items back to store inventory stock</span>
                  </label>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      disabled={clearingReceipts}
                      onClick={() => setIsClearReceiptsModalOpen(false)}
                      style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#475569',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={clearingReceipts}
                      onClick={handleClearCustomerReceipts}
                      style={{
                        padding: '0.6rem 1.4rem',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: clearingReceipts ? '#FCA5A5' : '#DC2626',
                        color: '#FFFFFF',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: clearingReceipts ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                      }}
                    >
                      {clearingReceipts ? 'Clearing Receipts...' : 'Yes, Clear Receipts'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
