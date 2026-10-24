// Seed data and in-memory persistence layer for customers, their sales, and payments
let customers = [
  {
    id: 'CUST001',
    name: 'Ramesh Patil',
    phone: '9822104521',
    village: 'Wadgaon',
    address: 'Near Old Gram Panchayat, Wadgaon',
    creditLimit: 30000,
    totalPurchases: 45000,
    outstandingDues: 14200,
    createdAt: new Date('2026-01-10T10:00:00Z'),
    updatedAt: new Date('2026-10-20T11:00:00Z'),
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
    createdAt: new Date('2026-02-14T09:30:00Z'),
    updatedAt: new Date('2026-10-18T16:00:00Z'),
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
    createdAt: new Date('2026-02-28T14:15:00Z'),
    updatedAt: new Date('2026-10-23T12:00:00Z'),
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
    createdAt: new Date('2026-03-05T11:45:00Z'),
    updatedAt: new Date('2026-09-12T10:00:00Z'),
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
    createdAt: new Date('2026-04-12T08:00:00Z'),
    updatedAt: new Date('2026-10-20T17:30:00Z'),
  }
];

let sales = [
  {
    id: 'INV-2026-0885',
    invoiceNumber: 'INV-2026-0885',
    customerId: 'CUST001',
    customerName: 'Ramesh Patil',
    date: new Date('2026-09-15T10:30:00Z'),
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
    date: new Date('2026-10-12T14:20:00Z'),
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
    date: new Date('2026-10-05T11:00:00Z'),
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
    date: new Date('2026-10-18T16:45:00Z'),
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
    date: new Date('2026-08-20T09:10:00Z'),
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
    date: new Date('2026-10-10T15:30:00Z'),
    items: [
      { name: 'NPK 10:26:26 50kg', quantity: 5, unitPrice: 1470, total: 7350 },
    ],
    totalAmount: 7350,
    paidAmount: 3350,
    dueAmount: 4000,
    status: 'PARTIAL',
  }
];

let payments = [
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
    date: new Date('2026-09-15T11:00:00Z'),
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
    date: new Date('2026-10-18T16:50:00Z'),
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
    date: new Date('2026-10-10T15:45:00Z'),
    notes: 'Partial advance payment, balance ₹4000 promised next week',
  }
];

function recalculateCustomerDues(customerId) {
  const customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  const customerSales = sales.filter(s => s.customerId === customerId);
  const totalPurchases = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const outstandingDues = customerSales.reduce((sum, s) => sum + s.dueAmount, 0);

  customer.totalPurchases = totalPurchases;
  customer.outstandingDues = outstandingDues;
  customer.updatedAt = new Date();
}

module.exports = {
  customers,
  sales,
  payments,
  recalculateCustomerDues,
};
