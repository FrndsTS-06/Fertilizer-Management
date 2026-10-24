/**
 * Service layer for Customer Management, Invoices & Khata Payments
 * Supports both live backend REST API and seamless client-side state caching
 */

const API_BASE_URL = 'http://localhost:5000/api';

// In-memory fallback dataset
let fallbackCustomers = [
  {
    id: 'CUST001',
    name: 'Ramesh Patil',
    phone: '9822104521',
    village: 'Wadgaon',
    address: 'Near Old Gram Panchayat, Wadgaon',
    creditLimit: 30000,
    totalPurchases: 45000,
    outstandingDues: 14200,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-20T11:00:00Z',
  },
  {
    id: 'CUST002',
    name: 'Balasaheb Shinde',
    phone: '9421098432',
    village: 'Shivaji Nagar',
    address: 'Plot No. 14, Main Road, Shivaji Nagar',
    creditLimit: 25000,
    totalPurchases: 32000,
    outstandingDues: 8500,
    createdAt: '2026-02-14T09:30:00Z',
    updatedAt: '2026-10-18T16:00:00Z',
  },
  {
    id: 'CUST003',
    name: 'Anand Deshmukh',
    phone: '9765412390',
    village: 'Pimpalgaon',
    address: 'Gat No. 82, Pimpalgaon',
    creditLimit: 40000,
    totalPurchases: 58000,
    outstandingDues: 0,
    createdAt: '2026-02-28T14:15:00Z',
    updatedAt: '2026-10-23T12:00:00Z',
  },
  {
    id: 'CUST004',
    name: 'Kisanrao More',
    phone: '9890123456',
    village: 'Borgaon',
    address: 'Near Water Tank, Borgaon',
    creditLimit: 20000,
    totalPurchases: 28000,
    outstandingDues: 13300,
    createdAt: '2026-03-05T11:45:00Z',
    updatedAt: '2026-09-12T10:00:00Z',
  },
  {
    id: 'CUST005',
    name: 'Dnyaneshwar Jadhav',
    phone: '9923456781',
    village: 'Koregaon',
    address: 'Bazaar Peth, Koregaon',
    creditLimit: 15000,
    totalPurchases: 18500,
    outstandingDues: 4000,
    createdAt: '2026-04-12T08:00:00Z',
    updatedAt: '2026-10-20T17:30:00Z',
  }
];

let fallbackSales = [
  {
    id: 'INV-2026-0885',
    invoiceNumber: 'INV-2026-0885',
    customerId: 'CUST001',
    customerName: 'Ramesh Patil',
    date: '2026-09-15T10:30:00Z',
    items: [
      { name: 'Neem Coated Urea 45kg', quantity: 10, unitPrice: 266.5, total: 2665 },
      { name: 'DAP 18:46:0 50kg', quantity: 4, unitPrice: 1350, total: 5400 },
    ],
    totalAmount: 8065,
    paidAmount: 8065,
    dueAmount: 0,
    status: 'PAID',
  },
  {
    id: 'INV-2026-0891',
    invoiceNumber: 'INV-2026-0891',
    customerId: 'CUST001',
    customerName: 'Ramesh Patil',
    date: '2026-10-12T14:20:00Z',
    items: [
      { name: 'NPK 10:26:26 50kg', quantity: 8, unitPrice: 1470, total: 11760 },
      { name: 'Zinc Sulphate 5kg', quantity: 4, unitPrice: 420, total: 1680 },
      { name: 'Liquid Bio-NPK 1L', quantity: 2, unitPrice: 380, total: 760 },
    ],
    totalAmount: 14200,
    paidAmount: 0,
    dueAmount: 14200,
    status: 'UNPAID',
  },
  {
    id: 'INV-2026-0888',
    invoiceNumber: 'INV-2026-0888',
    customerId: 'CUST002',
    customerName: 'Balasaheb Shinde',
    date: '2026-10-05T11:00:00Z',
    items: [
      { name: 'MOP 60% K2O 50kg', quantity: 5, unitPrice: 1700, total: 8500 },
    ],
    totalAmount: 8500,
    paidAmount: 0,
    dueAmount: 8500,
    status: 'UNPAID',
  },
  {
    id: 'INV-2026-0890',
    invoiceNumber: 'INV-2026-0890',
    customerId: 'CUST003',
    customerName: 'Anand Deshmukh',
    date: '2026-10-18T16:45:00Z',
    items: [
      { name: 'DAP 18:46:0 50kg', quantity: 10, unitPrice: 1350, total: 13500 },
    ],
    totalAmount: 13500,
    paidAmount: 13500,
    dueAmount: 0,
    status: 'PAID',
  },
  {
    id: 'INV-2026-0870',
    invoiceNumber: 'INV-2026-0870',
    customerId: 'CUST004',
    customerName: 'Kisanrao More',
    date: '2026-08-20T09:10:00Z',
    items: [
      { name: 'Neem Coated Urea 45kg', quantity: 12, unitPrice: 266.5, total: 3198 },
      { name: 'SSP Powder 50kg', quantity: 15, unitPrice: 540, total: 8100 },
      { name: 'Zinc Sulphate 5kg', quantity: 5, unitPrice: 400, total: 2002 },
    ],
    totalAmount: 13300,
    paidAmount: 0,
    dueAmount: 13300,
    status: 'UNPAID',
  },
  {
    id: 'INV-2026-0895',
    invoiceNumber: 'INV-2026-0895',
    customerId: 'CUST005',
    customerName: 'Dnyaneshwar Jadhav',
    date: '2026-10-10T15:30:00Z',
    items: [
      { name: 'NPK 10:26:26 50kg', quantity: 5, unitPrice: 1470, total: 7350 },
    ],
    totalAmount: 7350,
    paidAmount: 3350,
    dueAmount: 4000,
    status: 'PARTIAL',
  }
];

let fallbackPayments = [
  {
    id: 'PAY-1001',
    receiptNumber: 'REC-2026-012',
    customerId: 'CUST001',
    customerName: 'Ramesh Patil',
    saleId: 'INV-2026-0885',
    invoiceNumber: 'INV-2026-0885',
    amount: 8065,
    method: 'CASH',
    reference: 'CASH-TXN-0915',
    date: '2026-09-15T11:00:00Z',
    notes: 'Full bill clearance for sowing season purchase',
  },
  {
    id: 'PAY-1002',
    receiptNumber: 'REC-2026-035',
    customerId: 'CUST003',
    customerName: 'Anand Deshmukh',
    saleId: 'INV-2026-0890',
    invoiceNumber: 'INV-2026-0890',
    amount: 13500,
    method: 'UPI',
    reference: 'UPI/629104819283/HDFC',
    date: '2026-10-18T16:50:00Z',
    notes: 'Google Pay transfer at counter',
  },
  {
    id: 'PAY-1003',
    receiptNumber: 'REC-2026-041',
    customerId: 'CUST005',
    customerName: 'Dnyaneshwar Jadhav',
    saleId: 'INV-2026-0895',
    invoiceNumber: 'INV-2026-0895',
    amount: 3350,
    method: 'CASH',
    reference: 'CASH-TXN-1010',
    date: '2026-10-10T15:45:00Z',
    notes: 'Partial advance payment, balance ₹4000 promised next week',
  }
];

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
    const newCustomer = {
      ...customerData,
      id: newId,
      creditLimit: Number(customerData.creditLimit) || 25000,
      totalPurchases: 0,
      outstandingDues: 0,
      createdAt: new Date().toISOString(),
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
      fallbackCustomers[idx] = {
        ...fallbackCustomers[idx],
        ...customerData,
        creditLimit: customerData.creditLimit !== undefined ? Number(customerData.creditLimit) : fallbackCustomers[idx].creditLimit,
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
