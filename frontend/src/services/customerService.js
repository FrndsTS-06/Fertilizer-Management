/**
 * Service layer for Customer Management, Invoices & Khata Payments
 * Supports both live backend REST API and seamless client-side state caching
 */

const API_BASE_URL = 'http://localhost:5000/api';

// In-memory fallback dataset
let fallbackCustomers = [];
let fallbackSales = [];
let fallbackPayments = [];

export const customerService = {
  // GET /api/customers
  async getCustomers({ search = '', duesOnly = 'all', village = 'All' } = {}) {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (duesOnly) params.append('duesOnly', duesOnly);
      if (village && village !== 'All') params.append('village', village);

      const res = await fetch(`${API_BASE_URL}/customers?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        return { data: json.data, summary: json.summary };
      }
    } catch (e) {}

    // Fallback filtering
    let list = [...fallbackCustomers];
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.village && c.village.toLowerCase().includes(q))
      );
    }
    if (duesOnly === 'true' || duesOnly === 'has-dues') {
      list = list.filter(c => c.outstandingDues > 0);
    } else if (duesOnly === 'cleared') {
      list = list.filter(c => c.outstandingDues === 0);
    }
    if (village && village !== 'All') {
      list = list.filter(c => c.village.toLowerCase() === village.toLowerCase());
    }

    const totalCustomers = fallbackCustomers.length;
    const totalOutstandingDues = fallbackCustomers.reduce((sum, c) => sum + (c.outstandingDues || 0), 0);
    const customersWithDues = fallbackCustomers.filter(c => c.outstandingDues > 0).length;
    const totalPaymentsReceived = fallbackPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const enrichedList = list.map(c => ({
      ...c,
      totalPaid: Math.max(0, (c.totalPurchases || 0) - (c.outstandingDues || 0)),
    }));

    return {
      data: enrichedList,
      summary: {
        totalCustomers,
        totalOutstandingDues,
        customersWithDues,
        totalPaymentsReceived,
        clearedCustomers: totalCustomers - customersWithDues,
      },
    };
  },

  // GET /api/customers/:id
  async getCustomerById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${id}`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    return fallbackCustomers.find(c => c.id === id) || null;
  },

  // POST /api/customers
  async createCustomer(customerData) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const newId = `CUST${String(fallbackCustomers.length + 1).padStart(3, '0')}`;
    const total = Number(customerData.totalPayment) || 0;
    const paid = Number(customerData.paidAmount) || 0;
    const due = customerData.duePayment !== undefined && customerData.duePayment !== ''
      ? Number(customerData.duePayment)
      : Math.max(0, total - paid);
    const newCustomer = {
      ...customerData,
      id: newId,
      totalPurchases: total,
      totalPaid: paid,
      outstandingDues: due,
      createdAt: customerData.date ? new Date(customerData.date).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fallbackCustomers.unshift(newCustomer);
    return newCustomer;
  },

  // PATCH /api/customers/:id
  async updateCustomer(id, customerData) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const idx = fallbackCustomers.findIndex(c => c.id === id);
    if (idx !== -1) {
      const existing = fallbackCustomers[idx];
      const total = customerData.totalPayment !== undefined ? Number(customerData.totalPayment) : existing.totalPurchases;
      const paid = customerData.paidAmount !== undefined ? Number(customerData.paidAmount) : (existing.totalPaid || 0);
      const due = customerData.duePayment !== undefined && customerData.duePayment !== ''
        ? Number(customerData.duePayment)
        : (existing.outstandingDues !== undefined ? existing.outstandingDues : Math.max(0, total - paid));

      fallbackCustomers[idx] = {
        ...existing,
        ...customerData,
        totalPurchases: total,
        totalPaid: paid,
        outstandingDues: due,
        createdAt: customerData.date ? new Date(customerData.date).toISOString() : existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      return fallbackCustomers[idx];
    }
    return null;
  },

  // GET /api/customers/:id/sales
  async getCustomerSales(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${id}/sales`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    return fallbackSales.filter(s => s.customerId === id);
  },

  // GET /api/customers/:id/payments
  async getCustomerPayments(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${id}/payments`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    return fallbackPayments.filter(p => p.customerId === id);
  },

  // GET /api/customers/:id/balance
  async getCustomerBalance(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${id}/balance`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const customer = fallbackCustomers.find(c => c.id === id);
    const unpaidSales = fallbackSales.filter(s => s.customerId === id && s.dueAmount > 0);

    return {
      customerId: id,
      customerName: customer?.name || '',
      creditLimit: customer?.creditLimit || 0,
      totalPurchases: customer?.totalPurchases || 0,
      totalOutstandingDues: customer?.outstandingDues || 0,
      availableCredit: Math.max(0, (customer?.creditLimit || 0) - (customer?.outstandingDues || 0)),
      unpaidInvoices: unpaidSales,
    };
  },

  // POST /api/sales/:id/payments
  async recordInvoicePayment(saleId, { amount, method = 'CASH', reference = '', notes = '' }) {
    try {
      const res = await fetch(`${API_BASE_URL}/sales/${saleId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method, reference, notes }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const sale = fallbackSales.find(s => s.id === saleId || s.invoiceNumber === saleId);
    if (!sale) throw new Error('Invoice not found');

    const payAmount = Number(amount);
    if (payAmount > sale.dueAmount) throw new Error(`Amount ₹${payAmount} exceeds due ₹${sale.dueAmount}`);

    sale.paidAmount += payAmount;
    sale.dueAmount = Math.max(0, sale.totalAmount - sale.paidAmount);
    sale.status = sale.dueAmount === 0 ? 'PAID' : 'PARTIAL';

    const newPayment = {
      id: `PAY-${Date.now().toString().slice(-4)}`,
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      customerId: sale.customerId,
      customerName: sale.customerName,
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      amount: payAmount,
      method: method.toUpperCase(),
      reference: reference || `TXN-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      notes,
    };

    fallbackPayments.unshift(newPayment);

    // Recalculate customer due
    const cust = fallbackCustomers.find(c => c.id === sale.customerId);
    if (cust) {
      const cSales = fallbackSales.filter(s => s.customerId === cust.id);
      cust.outstandingDues = cSales.reduce((sum, s) => sum + s.dueAmount, 0);
    }

    return { payment: newPayment, updatedSale: sale };
  }
};
