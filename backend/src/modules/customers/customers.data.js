// In-memory persistence layer for customers, sales, and payments
let customers = [
  {
    id: 'CUST001',
    name: 'Ramesh Patel',
    phone: '9822012345',
    village: 'Shivaji Nagar',
    address: 'Plot 12, Shivaji Nagar',
    creditLimit: 50000,
    totalPurchases: 45000,
    outstandingDues: 14200,
    createdAt: new Date('2026-01-10T09:00:00Z'),
    updatedAt: new Date(),
  },
  {
    id: 'CUST002',
    name: 'Santosh Kumar',
    phone: '9833012346',
    village: 'Kisanpur',
    address: 'House 45, Main Road, Kisanpur',
    creditLimit: 40000,
    totalPurchases: 32000,
    outstandingDues: 0,
    createdAt: new Date('2026-02-15T10:30:00Z'),
    updatedAt: new Date(),
  },
  {
    id: 'CUST003',
    name: 'Anil Deshmukh',
    phone: '9844012347',
    village: 'Green Valley',
    address: 'Sector 3, Green Valley Farm',
    creditLimit: 60000,
    totalPurchases: 58000,
    outstandingDues: 8500,
    createdAt: new Date('2026-03-01T11:00:00Z'),
    updatedAt: new Date(),
  },
  {
    id: 'CUST004',
    name: 'Rajendra Verma',
    phone: '9855012348',
    village: 'Shivaji Nagar',
    address: 'Near Temple, Shivaji Nagar',
    creditLimit: 25000,
    totalPurchases: 18000,
    outstandingDues: 0,
    createdAt: new Date('2026-03-20T14:20:00Z'),
    updatedAt: new Date(),
  },
  {
    id: 'CUST005',
    name: 'Mahesh Jadhav',
    phone: '9866012349',
    village: 'Wadgaon',
    address: 'Wadgaon East',
    creditLimit: 45000,
    totalPurchases: 39500,
    outstandingDues: 5200,
    createdAt: new Date('2026-04-05T16:00:00Z'),
    updatedAt: new Date(),
  },
];

let sales = [
  {
    id: 'INV-2026-0891',
    invoiceNumber: 'INV-2026-0891',
    customerId: 'CUST001',
    customerName: 'Ramesh Patel',
    customerPhone: '9822012345',
    customerVillage: 'Shivaji Nagar',
    date: new Date('2026-08-15T10:30:00Z'),
    items: [
      { productId: 'PRD001', productName: 'Neem Coated Urea (45kg)', quantity: 20, unitPrice: 266.5, totalPrice: 5330 },
      { productId: 'PRD002', productName: 'DAP - Di-Ammonium Phosphate (50kg)', quantity: 5, unitPrice: 1350, totalPrice: 6750 },
      { productId: 'PRD005', productName: 'Zinc Sulphate Monohydrate 33% (5kg)', quantity: 4, unitPrice: 490, totalPrice: 1960 },
    ],
    subtotal: 14040,
    gstRate: 0,
    gstMode: 'EXCLUSIVE',
    gstAmount: 160,
    totalAmount: 14200,
    paidAmount: 0,
    dueAmount: 14200,
    status: 'UNPAID',
    paymentMethod: 'CREDIT',
    createdAt: new Date('2026-08-15T10:30:00Z'),
  },
  {
    id: 'INV-2026-0902',
    invoiceNumber: 'INV-2026-0902',
    customerId: 'CUST002',
    customerName: 'Santosh Kumar',
    customerPhone: '9833012346',
    customerVillage: 'Kisanpur',
    date: new Date('2026-09-01T14:15:00Z'),
    items: [
      { productId: 'PRD001', productName: 'Neem Coated Urea (45kg)', quantity: 10, unitPrice: 266.5, totalPrice: 2665 },
      { productId: 'PRD007', productName: 'Bio-NPK Liquid Biofertilizer (1L)', quantity: 5, unitPrice: 230, totalPrice: 1150 },
    ],
    subtotal: 3815,
    gstRate: 0,
    gstMode: 'EXCLUSIVE',
    gstAmount: 0,
    totalAmount: 3815,
    paidAmount: 3815,
    dueAmount: 0,
    status: 'PAID',
    paymentMethod: 'UPI',
    createdAt: new Date('2026-09-01T14:15:00Z'),
  },
  {
    id: 'INV-2026-0915',
    invoiceNumber: 'INV-2026-0915',
    customerId: 'CUST003',
    customerName: 'Anil Deshmukh',
    customerPhone: '9844012347',
    customerVillage: 'Green Valley',
    date: new Date('2026-09-12T16:00:00Z'),
    items: [
      { productId: 'PRD002', productName: 'DAP - Di-Ammonium Phosphate (50kg)', quantity: 10, unitPrice: 1350, totalPrice: 13500 },
    ],
    subtotal: 13500,
    gstRate: 0,
    gstMode: 'EXCLUSIVE',
    gstAmount: 0,
    totalAmount: 13500,
    paidAmount: 5000,
    dueAmount: 8500,
    status: 'PARTIAL',
    paymentMethod: 'CREDIT',
    createdAt: new Date('2026-09-12T16:00:00Z'),
  },
];

let payments = [
  {
    id: 'PAY-1001',
    saleId: 'INV-2026-0902',
    invoiceNumber: 'INV-2026-0902',
    customerId: 'CUST002',
    customerName: 'Santosh Kumar',
    amount: 3815,
    method: 'UPI',
    reference: 'UPI/20260901/78912',
    notes: 'Paid at billing',
    date: new Date('2026-09-01T14:15:00Z'),
    createdAt: new Date('2026-09-01T14:15:00Z'),
  },
  {
    id: 'PAY-1002',
    saleId: 'INV-2026-0915',
    invoiceNumber: 'INV-2026-0915',
    customerId: 'CUST003',
    customerName: 'Anil Deshmukh',
    amount: 5000,
    method: 'CASH',
    reference: 'RCPT-501',
    notes: 'Initial cash deposit',
    date: new Date('2026-09-12T16:00:00Z'),
    createdAt: new Date('2026-09-12T16:00:00Z'),
  },
];

function recalculateCustomerDues(customerId) {
  const customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  const customerSales = sales.filter(s => s.customerId === customerId);
  if (customerSales.length === 0) {
    return;
  }
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
