/**
 * Service layer for Products & Stock Management
 * Supports both live backend REST API and seamless client-side state caching
 */

const API_BASE_URL = 'http://localhost:5000/api';

// In-memory fallback dataset
let fallbackProducts = [];

let fallbackMovements = [];

function calcStatus(stock, threshold) {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= threshold) return 'Low Stock';
  return 'In Stock';
}

export const productsStockService = {
  // GET /api/products
  async getProducts({ search = '', category = 'All', status = 'All' } = {}) {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category && category !== 'All') params.append('category', category);
      if (status && status !== 'All') params.append('status', status);

      const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {
      // Fallback to local state
    }

    let list = [...fallbackProducts];
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }
    if (category && category !== 'All') {
      list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (status && status !== 'All') {
      list = list.filter(p => p.status.toLowerCase() === status.toLowerCase());
    }
    return list;
  },

  // GET /api/products/:id
  async getProductById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    return fallbackProducts.find(p => p.id === id || p.code === id) || null;
  },

  // POST /api/products
  async createProduct(productData) {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const code = productData.code || `PRD${String(fallbackProducts.length + 1).padStart(3, '0')}`;
    const stock = Number(productData.initialStock) || 0;
    const threshold = Number(productData.minThreshold) || 10;
    const newProduct = {
      ...productData,
      id: code,
      code,
      stock,
      minThreshold: threshold,
      status: calcStatus(stock, threshold),
      costPrice: Number(productData.costPrice) || 0,
      price: Number(productData.price) || 0,
      photo: productData.photo || 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fallbackProducts.unshift(newProduct);
    return newProduct;
  },

  // PATCH /api/products/:id
  async updateProduct(id, productData) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const idx = fallbackProducts.findIndex(p => p.id === id || p.code === id);
    if (idx !== -1) {
      const existing = fallbackProducts[idx];
      const threshold = productData.minThreshold !== undefined ? Number(productData.minThreshold) : existing.minThreshold;
      fallbackProducts[idx] = {
        ...existing,
        ...productData,
        minThreshold: threshold,
        status: calcStatus(existing.stock, threshold),
        updatedAt: new Date().toISOString(),
      };
      return fallbackProducts[idx];
    }
    return null;
  },

  // GET /api/inventory/summary
  async getInventorySummary() {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/summary`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const totalProducts = fallbackProducts.length;
    const totalAvailableStock = fallbackProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const lowStockCount = fallbackProducts.filter(p => p.status === 'Low Stock').length;
    const outOfStockCount = fallbackProducts.filter(p => p.status === 'Out of Stock').length;
    const inStockCount = fallbackProducts.filter(p => p.status === 'In Stock').length;

    return {
      totalProducts,
      totalAvailableStock,
      lowStockCount,
      outOfStockCount,
      inStockCount,
    };
  },

  // GET /api/inventory/movements
  async getInventoryMovements({ productId = '', type = 'All' } = {}) {
    try {
      const params = new URLSearchParams();
      if (productId) params.append('productId', productId);
      if (type && type !== 'All') params.append('type', type);

      const res = await fetch(`${API_BASE_URL}/inventory/movements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    let list = [...fallbackMovements];
    if (productId) {
      list = list.filter(m => m.productId === productId || m.productCode === productId);
    }
    if (type && type !== 'All') {
      list = list.filter(m => m.type.toUpperCase() === type.toUpperCase());
    }
    return list;
  },

  // POST /api/inventory/adjustments (Stock Inward / Retail Purchase / Adjustment)
  async createStockAdjustment(adjData) {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjData),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const { productId, operation = 'ADD', quantity, reason, reference = '', costPrice, unit } = adjData;

    const product = fallbackProducts.find(p => p.id === productId || p.code === productId);
    if (!product) throw new Error('Product not found');

    const prev = Number(product.stock) || 0;
    const qty = Math.abs(Number(quantity));
    let newStock = prev;
    let changeQty = 0;

    const op = operation.toUpperCase();
    if (op === 'ADD') {
      newStock = prev + qty;
      changeQty = qty;
    } else if (op === 'REDUCE') {
      if (prev < qty) throw new Error(`Cannot reduce ${qty}. Available is only ${prev}.`);
      newStock = prev - qty;
      changeQty = -qty;
    } else if (op === 'CORRECT') {
      newStock = qty;
      changeQty = qty - prev;
    }

    product.stock = newStock;
    product.status = calcStatus(newStock, product.minThreshold);
    product.updatedAt = new Date().toISOString();

    const movement = {
      id: `MOV${String(fallbackMovements.length + 1001)}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      type: 'ADJUSTMENT',
      changeQty,
      previousStock: prev,
      newStock,
      reason,
      reference: reference || `MAN-ADJ-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };

    fallbackMovements.unshift(movement);
    return { product, movement };
  },

  // DELETE /api/products/:id
  async deleteProduct(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const idx = fallbackProducts.findIndex(p => p.id === id || p.code === id);
    if (idx !== -1) {
      const [removed] = fallbackProducts.splice(idx, 1);
      return removed;
    }
    return null;
  }
};
