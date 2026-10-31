/**
 * Service layer for Products & Stock Management
 * Powered by centralized apiClient with live backend REST API integration.
 */
import apiClient from './apiClient';

function calcStatus(stock, threshold) {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= threshold) return 'Low Stock';
  return 'In Stock';
}

function notifyInventoryChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fts:inventory-updated'));
  }
}

// In-memory fallback dataset for offline/degraded mode
let fallbackProducts = [
  {
    id: 'PRD001',
    code: 'PRD001',
    name: 'Neem Coated Urea (45kg)',
    category: 'Nitrogenous',
    brand: 'IFFCO',
    unit: 'bags',
    stock: 120,
    minThreshold: 20,
    costPrice: 242.0,
    price: 266.5,
    photo: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60',
    status: 'In Stock',
    description: 'Agricultural grade Neem Coated Urea containing 46% Nitrogen for soil application.',
    createdAt: new Date('2026-10-01T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-01T08:00:00Z').toISOString(),
  },
  {
    id: 'PRD002',
    code: 'PRD002',
    name: 'DAP - Di-Ammonium Phosphate (50kg)',
    category: 'Phosphatic',
    brand: 'IFFCO',
    unit: 'bags',
    stock: 45,
    minThreshold: 15,
    costPrice: 1250.0,
    price: 1350.0,
    photo: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=300&auto=format&fit=crop&q=60',
    status: 'In Stock',
    description: 'High phosphorus fertilizer (18:46:0) essential for root development and crop establishment.',
    createdAt: new Date('2026-10-02T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-02T09:00:00Z').toISOString(),
  },
  {
    id: 'PRD003',
    code: 'PRD003',
    name: 'MOP - Muriate of Potash (50kg)',
    category: 'Potassic',
    brand: 'KRIBHCO',
    unit: 'bags',
    stock: 8,
    minThreshold: 15,
    costPrice: 1580.0,
    price: 1700.0,
    photo: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=300&auto=format&fit=crop&q=60',
    status: 'Low Stock',
    description: 'Potash source (60% K2O) providing disease resistance and quality grain development.',
    createdAt: new Date('2026-10-03T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-03T10:00:00Z').toISOString(),
  },
  {
    id: 'PRD004',
    code: 'PRD004',
    name: 'NPK 19:19:19 Water Soluble (1kg)',
    category: 'Complex',
    brand: 'Mahadhan',
    unit: 'packets',
    stock: 0,
    minThreshold: 10,
    costPrice: 125.0,
    price: 160.0,
    photo: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60',
    status: 'Out of Stock',
    description: '100% water soluble balanced fertilizer for foliar spray and fertigation.',
    createdAt: new Date('2026-10-04T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-04T11:00:00Z').toISOString(),
  },
  {
    id: 'PRD005',
    code: 'PRD005',
    name: 'Zinc Sulphate Monohydrate 33% (5kg)',
    category: 'Micronutrients',
    brand: 'Multiplex',
    unit: 'packets',
    stock: 35,
    minThreshold: 10,
    costPrice: 410.0,
    price: 490.0,
    photo: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=300&auto=format&fit=crop&q=60',
    status: 'In Stock',
    description: 'Essential micronutrient for preventing zinc deficiency and chlorosis in crops.',
    createdAt: new Date('2026-10-05T12:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-05T12:00:00Z').toISOString(),
  },
  {
    id: 'PRD006',
    code: 'PRD006',
    name: 'Single Super Phosphate - SSP (50kg)',
    category: 'Phosphatic',
    brand: 'Coromandel',
    unit: 'bags',
    stock: 5,
    minThreshold: 12,
    costPrice: 420.0,
    price: 480.0,
    photo: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=300&auto=format&fit=crop&q=60',
    status: 'Low Stock',
    description: 'Contains 16% water soluble P2O5 and 11% Sulphur, ideal for oilseeds and pulses.',
    createdAt: new Date('2026-10-06T13:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-06T13:00:00Z').toISOString(),
  },
  {
    id: 'PRD007',
    code: 'PRD007',
    name: 'Bio-NPK Liquid Biofertilizer (1L)',
    category: 'Biofertilizers',
    brand: 'IFFCO',
    unit: 'bottles',
    stock: 60,
    minThreshold: 15,
    costPrice: 180.0,
    price: 230.0,
    photo: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60',
    status: 'In Stock',
    description: 'Consortium of nitrogen-fixing, phosphate-solubilizing and potash-mobilizing bacteria.',
    createdAt: new Date('2026-10-07T14:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-07T14:00:00Z').toISOString(),
  },
  {
    id: 'PRD008',
    code: 'PRD008',
    name: 'Ammonium Sulphate (50kg)',
    category: 'Nitrogenous',
    brand: 'GSFC',
    unit: 'bags',
    stock: 24,
    minThreshold: 10,
    costPrice: 850.0,
    price: 960.0,
    photo: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=300&auto=format&fit=crop&q=60',
    status: 'In Stock',
    description: 'Provides 20.6% ammoniacal nitrogen and 24% sulphur for paddy, tea and sugarcane.',
    createdAt: new Date('2026-10-08T15:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-08T15:00:00Z').toISOString(),
  },
];

let fallbackMovements = [
  {
    id: 'MOV1001',
    productId: 'PRD001',
    productName: 'Neem Coated Urea (45kg)',
    productCode: 'PRD001',
    type: 'PURCHASE',
    action: 'ADDED',
    changeQty: 120,
    previousStock: 0,
    newStock: 120,
    unit: 'bags',
    reason: 'Initial Product Stock Inward',
    reference: 'PO-2026-001',
    createdAt: new Date('2026-10-01T10:00:00Z').toISOString(),
  },
  {
    id: 'MOV1002',
    productId: 'PRD002',
    productName: 'DAP - Di-Ammonium Phosphate (50kg)',
    productCode: 'PRD002',
    type: 'PURCHASE',
    action: 'ADDED',
    changeQty: 45,
    previousStock: 0,
    newStock: 45,
    unit: 'bags',
    reason: 'Initial Product Stock Inward',
    reference: 'PO-2026-002',
    createdAt: new Date('2026-10-02T11:00:00Z').toISOString(),
  },
  {
    id: 'MOV1003',
    productId: 'PRD003',
    productName: 'MOP - Muriate of Potash (50kg)',
    productCode: 'PRD003',
    type: 'PURCHASE',
    action: 'ADDED',
    changeQty: 8,
    previousStock: 0,
    newStock: 8,
    unit: 'bags',
    reason: 'Initial Product Stock Inward',
    reference: 'PO-2026-003',
    createdAt: new Date('2026-10-03T09:30:00Z').toISOString(),
  },
  {
    id: 'MOV1004',
    productId: 'PRD005',
    productName: 'Zinc Sulphate Monohydrate 33% (5kg)',
    productCode: 'PRD005',
    type: 'PURCHASE',
    action: 'ADDED',
    changeQty: 35,
    previousStock: 0,
    newStock: 35,
    unit: 'packets',
    reason: 'Initial Product Stock Inward',
    reference: 'PO-2026-004',
    createdAt: new Date('2026-10-04T14:15:00Z').toISOString(),
  },
];

export const productsStockService = {
  // GET /api/products
  async getProducts({ search = '', category = 'All', status = 'All', page = 1, limit = 50 } = {}) {
    try {
      const params = {};
      if (search && search.trim()) params.search = search.trim();
      if (category && category !== 'All') params.category = category;
      if (status && status !== 'All') params.status = status;
      if (page) params.page = page;
      if (limit) params.limit = limit;

      const res = await apiClient.get('/products', params);
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('productsStockService.getProducts API error, using fallback:', e.message);
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
      const res = await apiClient.get(`/products/${id}`);
      if (res?.data) {
        return res.data;
      }
    } catch (e) {
      console.warn('productsStockService.getProductById API error:', e.message);
    }

    return fallbackProducts.find(p => p.id === id || p.code === id) || null;
  },

  // POST /api/products
  async createProduct(productData) {
    try {
      const res = await apiClient.post('/products', productData);
      if (res?.data) {
        notifyInventoryChange();
        return res.data;
      }
    } catch (e) {
      // If error is from server (e.g. 400 validation error or 403 forbidden), throw it to inform user
      if (e.status) throw e;
      console.warn('productsStockService.createProduct network error, using fallback:', e.message);
    }

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
    notifyInventoryChange();
    return newProduct;
  },

  // PATCH /api/products/:id
  async updateProduct(id, productData) {
    try {
      const res = await apiClient.patch(`/products/${id}`, productData);
      if (res?.data) {
        notifyInventoryChange();
        return res.data;
      }
    } catch (e) {
      if (e.status) throw e;
      console.warn('productsStockService.updateProduct error:', e.message);
    }

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
      notifyInventoryChange();
      return fallbackProducts[idx];
    }
    return null;
  },

  // GET /api/inventory/summary
  async getInventorySummary() {
    try {
      const res = await apiClient.get('/inventory/summary');
      if (res?.data) {
        return res.data;
      }
    } catch (e) {
      console.warn('productsStockService.getInventorySummary error:', e.message);
    }

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
      const params = {};
      if (productId) params.productId = productId;
      if (type && type !== 'All') params.type = type;

      const res = await apiClient.get('/inventory/movements', params);
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('productsStockService.getInventoryMovements error:', e.message);
    }

    let list = [...fallbackMovements];
    if (productId) {
      list = list.filter(m => m.productId === productId || m.productCode === productId);
    }
    if (type && type !== 'All') {
      list = list.filter(m => m.type.toUpperCase() === type.toUpperCase());
    }
    return list;
  },

  // POST /api/inventory/adjustments
  async createStockAdjustment(adjData) {
    try {
      const res = await apiClient.post('/inventory/adjustments', adjData);
      if (res?.data) {
        notifyInventoryChange();
        return res.data;
      }
    } catch (e) {
      if (e.status) throw e;
      console.warn('productsStockService.createStockAdjustment error:', e.message);
    }

    const { productId, operation = 'ADD', quantity, reason, reference = '' } = adjData;

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
    notifyInventoryChange();
    return { product, movement };
  },

  // DELETE /api/products/:id
  async deleteProduct(id) {
    try {
      const res = await apiClient.delete(`/products/${id}`);
      if (res?.data) {
        notifyInventoryChange();
        return res.data;
      }
    } catch (e) {
      if (e.status) throw e;
      console.warn('productsStockService.deleteProduct error:', e.message);
    }

    const idx = fallbackProducts.findIndex(p => p.id === id || p.code === id);
    if (idx !== -1) {
      const [removed] = fallbackProducts.splice(idx, 1);
      notifyInventoryChange();
      return removed;
    }
    return null;
  }
};
