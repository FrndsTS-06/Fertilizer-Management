/**
 * Service layer for Products & Stock Management
 * Supports both live backend REST API and seamless client-side state caching
 */

const API_BASE_URL = 'http://localhost:5000/api';

// In-memory fallback dataset
let fallbackProducts = [
  {
    id: 'PRD001',
    code: 'PRD001',
    name: 'Urea (Neem Coated 46% N)',
    category: 'Nitrogenous',
    brand: 'IFFCO',
    unit: 'bags',
    stock: 70,
    minThreshold: 20,
    costPrice: 245.0,
    price: 266.5,
    photo: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60',
    hsnCode: '31021000',
    status: 'In Stock',
    description: 'Government subsidized Neem Coated Urea in 45kg standard bags.',
    createdAt: new Date('2026-01-15T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-20T14:30:00Z').toISOString(),
  },
  {
    id: 'PRD002',
    code: 'PRD002',
    name: 'DAP (Di-Ammonium Phosphate 18:46:0)',
    category: 'Phosphatic',
    brand: 'IFFCO',
    unit: 'bags',
    stock: 8,
    minThreshold: 15,
    costPrice: 1250.0,
    price: 1350.0,
    photo: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=300&auto=format&fit=crop&q=60',
    hsnCode: '31053000',
    status: 'Low Stock',
    description: 'High phosphorus nutrient fertilizer for root development and germination.',
    createdAt: new Date('2026-02-10T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-22T10:15:00Z').toISOString(),
  },
  {
    id: 'PRD003',
    code: 'PRD003',
    name: 'NPK (10:26:26 Complex)',
    category: 'Complex',
    brand: 'Mahadhan',
    unit: 'bags',
    stock: 0,
    minThreshold: 10,
    costPrice: 1380.0,
    price: 1470.0,
    photo: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=300&auto=format&fit=crop&q=60',
    hsnCode: '31052000',
    status: 'Out of Stock',
    description: 'Balanced compound fertilizer suitable for sugarcane, cotton, and vegetables.',
    createdAt: new Date('2026-03-01T08:30:00Z').toISOString(),
    updatedAt: new Date('2026-10-23T16:00:00Z').toISOString(),
  },
  {
    id: 'PRD004',
    code: 'PRD004',
    name: 'MOP (Muriate of Potash 60% K2O)',
    category: 'Potassic',
    brand: 'IPL',
    unit: 'bags',
    stock: 24,
    minThreshold: 15,
    costPrice: 1580.0,
    price: 1700.0,
    photo: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=300&auto=format&fit=crop&q=60',
    hsnCode: '31042000',
    status: 'In Stock',
    description: 'Potash source critical for crop resistance and fruit sizing.',
    createdAt: new Date('2026-03-12T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-18T12:00:00Z').toISOString(),
  },
  {
    id: 'PRD005',
    code: 'PRD005',
    name: 'SSP (Single Super Phosphate 16% P2O5)',
    category: 'Phosphatic',
    brand: 'Khaitan',
    unit: 'bags',
    stock: 6,
    minThreshold: 12,
    costPrice: 480.0,
    price: 540.0,
    photo: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60',
    hsnCode: '31031000',
    status: 'Low Stock',
    description: 'Enriched with sulfur and calcium for oilseed and pulse crops.',
    createdAt: new Date('2026-04-05T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-21T11:45:00Z').toISOString(),
  },
  {
    id: 'PRD006',
    code: 'PRD006',
    name: 'Zinc Sulphate Monohydrate 33%',
    category: 'Micronutrients',
    brand: 'Aries Agro',
    unit: 'packs (5kg)',
    stock: 42,
    minThreshold: 10,
    costPrice: 380.0,
    price: 430.0,
    photo: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=300&auto=format&fit=crop&q=60',
    hsnCode: '28332990',
    status: 'In Stock',
    description: 'Fast acting chelated micronutrient for curing Khaira disease and zinc deficiency.',
    createdAt: new Date('2026-04-18T14:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-19T17:20:00Z').toISOString(),
  },
  {
    id: 'PRD007',
    code: 'PRD007',
    name: 'Liquid Bio-NPK Consortium',
    category: 'Bio-Fertilizers',
    brand: 'Multiplex',
    unit: 'bottles (1L)',
    stock: 55,
    minThreshold: 15,
    costPrice: 310.0,
    price: 380.0,
    photo: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=300&auto=format&fit=crop&q=60',
    hsnCode: '31010099',
    status: 'In Stock',
    description: 'Nitrogen fixing, phosphate solubilizing & potassium mobilizing bacterial consortia.',
    createdAt: new Date('2026-05-02T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-23T09:00:00Z').toISOString(),
  }
];

let fallbackMovements = [
  {
    id: 'MOV1001',
    productId: 'PRD001',
    productName: 'Urea (Neem Coated 46% N)',
    productCode: 'PRD001',
    type: 'PURCHASE',
    changeQty: 100,
    previousStock: 0,
    newStock: 100,
    reason: 'Received shipment from IFFCO Plant',
    reference: 'PO-2026-4401',
    createdAt: '2026-10-15T09:30:00Z',
  },
  {
    id: 'MOV1002',
    productId: 'PRD001',
    productName: 'Urea (Neem Coated 46% N)',
    productCode: 'PRD001',
    type: 'SALE',
    changeQty: -25,
    previousStock: 100,
    newStock: 75,
    reason: 'Sold to Ramesh Patil & group',
    reference: 'INV-2026-0885',
    createdAt: '2026-10-18T14:10:00Z',
  },
  {
    id: 'MOV1003',
    productId: 'PRD001',
    productName: 'Urea (Neem Coated 46% N)',
    productCode: 'PRD001',
    type: 'ADJUSTMENT',
    changeQty: -5,
    previousStock: 75,
    newStock: 70,
    reason: 'Torn/damaged bags during warehouse unloading',
    reference: 'ADJ-2026-004',
    createdAt: '2026-10-20T14:30:00Z',
  },
  {
    id: 'MOV1004',
    productId: 'PRD002',
    productName: 'DAP (Di-Ammonium Phosphate 18:46:0)',
    productCode: 'PRD002',
    type: 'SALE',
    changeQty: -12,
    previousStock: 20,
    newStock: 8,
    reason: 'Retail sale bill',
    reference: 'INV-2026-0891',
    createdAt: '2026-10-22T10:15:00Z',
  },
  {
    id: 'MOV1005',
    productId: 'PRD003',
    productName: 'NPK (10:26:26 Complex)',
    productCode: 'PRD003',
    type: 'SALE',
    changeQty: -15,
    previousStock: 15,
    newStock: 0,
    reason: 'Stock depleted due to heavy sowing demand',
    reference: 'INV-2026-0894',
    createdAt: '2026-10-23T16:00:00Z',
  }
];

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

  // POST /api/inventory/adjustments
  async createStockAdjustment({ productId, operation, quantity, reason, reference = '' }) {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, operation, quantity, reason, reference }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

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
  }
};
