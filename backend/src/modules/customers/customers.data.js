// In-memory persistence layer for customers, sales, and payments (Cleared of all fake and temporary data)
let customers = [];
let sales = [];
let payments = [];

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
