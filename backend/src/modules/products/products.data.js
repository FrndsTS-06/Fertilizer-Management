// In-memory persistence layer for products & inventory (Cleared of all products and stock items)
let products = [];

let movements = [];

// Helper to compute status dynamically based on current stock & threshold
function computeStatus(stock, minThreshold) {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= minThreshold) return 'Low Stock';
  return 'In Stock';
}

module.exports = {
  products,
  movements,
  computeStatus,
};
