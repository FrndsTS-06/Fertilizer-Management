const {
  customers,
  sales,
  payments,
  recalculateCustomerDues,
} = require('./customers.data');
const { products, movements, computeStatus } = require('../products/products.data');

// GET /api/customers
exports.getAllCustomers = (req, res) => {
  try {
    const { search, duesOnly, village } = req.query;
    let list = [...customers];

    // Search by name or phone
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.village && c.village.toLowerCase().includes(q))
      );
    }

    // Filter by outstanding dues
    if (duesOnly === 'true' || duesOnly === 'has-dues') {
      list = list.filter(c => c.outstandingDues > 0);
    } else if (duesOnly === 'cleared') {
      list = list.filter(c => c.outstandingDues === 0);
    }

    if (village && village !== 'All') {
      list = list.filter(c => c.village.toLowerCase() === village.toLowerCase());
    }

    const totalCustomers = customers.length;
    const totalOutstandingDues = customers.reduce((sum, c) => sum + (c.outstandingDues || 0), 0);
    const customersWithDues = customers.filter(c => c.outstandingDues > 0).length;
    const totalPaymentsReceived = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Ensure totalPaid is populated for each customer
    const enrichedList = list.map(c => ({
      ...c,
      totalPaid: Math.max(0, (c.totalPurchases || 0) - (c.outstandingDues || 0)),
    }));

    res.json({
      success: true,
      count: enrichedList.length,
      summary: {
        totalCustomers,
        totalOutstandingDues,
        customersWithDues,
        totalPaymentsReceived,
        clearedCustomers: totalCustomers - customersWithDues,
      },
      data: enrichedList,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/customers/:id
exports.getCustomerById = (req, res) => {
  try {
    const { id } = req.params;
    const customer = customers.find(c => c.id === id);

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/customers
exports.createCustomer = (req, res) => {
  try {
    const {
      name,
      phone,
      village,
      address,
      totalPayment,
      paidAmount,
      duePayment,
      date,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Customer name is required' });
    }

    if (phone && customers.some(c => c.phone === phone.trim())) {
      return res.status(400).json({ success: false, error: `Phone number ${phone} is already registered` });
    }

    const total = Number(totalPayment) || 0;
    const paid = Number(paidAmount) || 0;
    const due = duePayment !== undefined && duePayment !== ''
      ? Number(duePayment)
      : Math.max(0, total - paid);
    const effectiveDate = date ? new Date(date) : new Date();

    const newId = `CUST${String(customers.length + 1).padStart(3, '0')}`;
    const newCustomer = {
      id: newId,
      name: name.trim(),
      phone: phone ? phone.trim() : '',
      village: village ? village.trim() : '',
      address: address ? address.trim() : '',
      totalPurchases: total,
      totalPaid: paid,
      outstandingDues: due,
      notes: notes || '',
      createdAt: effectiveDate,
      updatedAt: new Date(),
    };

    customers.unshift(newCustomer);

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: newCustomer,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/customers/:id
exports.updateCustomer = (req, res) => {
  try {
    const { id } = req.params;
    const index = customers.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const existing = customers[index];
    const {
      name,
      phone,
      village,
      address,
      totalPayment,
      paidAmount,
      duePayment,
      date,
      notes,
    } = req.body;

    const total = totalPayment !== undefined ? Number(totalPayment) : (existing.totalPurchases || 0);
    const paid = paidAmount !== undefined ? Number(paidAmount) : (existing.totalPaid || 0);
    const due = duePayment !== undefined && duePayment !== ''
      ? Number(duePayment)
      : (existing.outstandingDues !== undefined ? existing.outstandingDues : Math.max(0, total - paid));

    customers[index] = {
      ...existing,
      name: name !== undefined ? name.trim() : existing.name,
      phone: phone !== undefined ? phone.trim() : existing.phone,
      village: village !== undefined ? village.trim() : existing.village,
      address: address !== undefined ? address.trim() : existing.address,
      totalPurchases: total,
      totalPaid: paid,
      outstandingDues: due,
      notes: notes !== undefined ? notes : existing.notes,
      createdAt: date ? new Date(date) : existing.createdAt,
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      message: 'Customer details updated',
      data: customers[index],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/customers/:id/sales
exports.getCustomerSales = (req, res) => {
  try {
    const { id } = req.params;
    const customer = customers.find(c => c.id === id);

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const customerSales = sales
      .filter(s => s.customerId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      count: customerSales.length,
      data: customerSales,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/customers/:id/payments
exports.getCustomerPayments = (req, res) => {
  try {
    const { id } = req.params;
    const customer = customers.find(c => c.id === id);

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const customerPayments = payments
      .filter(p => p.customerId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      count: customerPayments.length,
      data: customerPayments,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/customers/:id/balance
exports.getCustomerBalance = (req, res) => {
  try {
    const { id } = req.params;
    const customer = customers.find(c => c.id === id);

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    recalculateCustomerDues(id);

    const unpaidSales = sales
      .filter(s => s.customerId === id && s.dueAmount > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: {
        customerId: customer.id,
        customerName: customer.name,
        creditLimit: customer.creditLimit,
        totalPurchases: customer.totalPurchases,
        totalOutstandingDues: customer.outstandingDues,
        availableCredit: Math.max(0, customer.creditLimit - customer.outstandingDues),
        unpaidInvoices: unpaidSales,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/sales/:id/payments
// Record payments against an invoice
exports.recordSalePayment = (req, res) => {
  try {
    const { id } = req.params; // Sale / Invoice ID
    const { amount, method = 'CASH', reference, notes } = req.body;

    const sale = sales.find(s => s.id === id || s.invoiceNumber === id);
    if (!sale) {
      return res.status(404).json({ success: false, error: `Invoice ${id} not found` });
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Payment amount must be greater than zero' });
    }

    if (payAmount > sale.dueAmount) {
      return res.status(400).json({
        success: false,
        error: `Payment amount ₹${payAmount} exceeds current due amount of ₹${sale.dueAmount}`,
      });
    }

    // Update sale invoice status and amounts
    sale.paidAmount += payAmount;
    sale.dueAmount = Math.max(0, sale.totalAmount - sale.paidAmount);
    sale.status = sale.dueAmount === 0 ? 'PAID' : 'PARTIAL';

    // Create payment receipt record
    const receiptRecord = {
      id: `PAY-${String(payments.length + 1001)}`,
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      customerId: sale.customerId,
      customerName: sale.customerName,
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      amount: payAmount,
      method: method.toUpperCase(),
      reference: reference || `TXN-${Date.now().toString().slice(-4)}`,
      date: new Date(),
      notes: notes || `Payment recorded against bill ${sale.invoiceNumber}`,
    };

    payments.unshift(receiptRecord);

    // Recalculate customer aggregate dues
    recalculateCustomerDues(sale.customerId);

    res.status(201).json({
      success: true,
      message: `Payment of ₹${payAmount} successfully recorded for invoice ${sale.invoiceNumber}`,
      data: {
        payment: receiptRecord,
        updatedSale: sale,
        updatedCustomerDue: customers.find(c => c.id === sale.customerId)?.outstandingDues || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/sales
exports.getAllSales = (req, res) => {
  try {
    const list = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/payments
exports.getAllPayments = (req, res) => {
  try {
    const list = [...payments].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/customers/:id
exports.deleteCustomer = (req, res) => {
  try {
    const { id } = req.params;
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    const [deleted] = customers.splice(index, 1);
    res.json({
      success: true,
      message: `Customer ${deleted.name} removed successfully`,
      data: deleted,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/customers
exports.clearAllCustomers = (req, res) => {
  try {
    customers.length = 0;
    sales.length = 0;
    payments.length = 0;
    res.json({
      success: true,
      message: 'All customers and khata records cleared successfully',
      count: 0,
      data: [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/sales
exports.createSale = (req, res) => {
  try {
    const saleData = req.body;
    const invoiceNumber = saleData.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
    const newSale = {
      id: invoiceNumber,
      invoiceNumber,
      customerId: saleData.customerId || null,
      customerName: saleData.customerName || 'Direct Counter Sale',
      customerPhone: saleData.customerPhone || '',
      customerVillage: saleData.customerVillage || '',
      ownerGstId: saleData.ownerGstId || saleData.gstId || null,
      gstId: saleData.ownerGstId || saleData.gstId || null,
      date: saleData.date || new Date().toISOString(),
      items: saleData.items || [],
      subtotal: Number(saleData.subtotal) || 0,
      gstRate: Number(saleData.gstRate) || 0,
      gstMode: saleData.gstMode || 'EXCLUSIVE',
      gstAmount: Number(saleData.gstAmount) || 0,
      totalAmount: Number(saleData.totalAmount) || 0,
      paidAmount: Number(saleData.paidAmount) || 0,
      dueAmount: Number(saleData.dueAmount) || 0,
      paymentMethod: saleData.paymentMethod || 'CASH',
      status: saleData.status || (Number(saleData.dueAmount) > 0 ? 'UNPAID' : 'PAID'),
      createdAt: new Date().toISOString(),
    };

    sales.unshift(newSale);

    // Automatically deduct stock and record stock ledger movement for each sold item
    if (Array.isArray(newSale.items)) {
      newSale.items.forEach((item) => {
        const prod = products.find(p =>
          (item.productId && (p.id === item.productId || p.code === item.productId)) ||
          (item.id && (p.id === item.id || p.code === item.id)) ||
          (item.code && (p.code === item.code || p.id === item.code)) ||
          (item.name && p.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
        );
        if (prod) {
          const prevStock = Number(prod.stock) || 0;
          const qty = Number(item.quantity !== undefined ? item.quantity : (item.qty || 1));
          const newStock = Math.max(0, prevStock - qty);
          prod.stock = newStock;
          prod.status = computeStatus(newStock, prod.minThreshold);
          prod.updatedAt = new Date();

          movements.unshift({
            id: `MOV${String(movements.length + 1001)}`,
            productId: prod.id,
            productName: prod.name,
            productCode: prod.code,
            type: 'SALE',
            action: 'SELL',
            changeQty: -qty,
            previousStock: prevStock,
            newStock,
            unit: prod.unit || item.unit || 'bags',
            reason: `Sold to ${newSale.customerName || 'Direct Counter Sale'}`,
            reference: invoiceNumber,
            createdAt: new Date(),
          });
        }
      });
    }

    if (newSale.customerId) {
      recalculateCustomerDues(newSale.customerId);
    }

    res.status(201).json({
      success: true,
      message: `Invoice ${invoiceNumber} created successfully`,
      data: newSale,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


