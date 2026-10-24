const { products, computeStatus } = require('./products.data');

// GET /api/products
exports.getAllProducts = (req, res) => {
  try {
    const { search, category, status } = req.query;
    let list = [...products];

    // Filter by search query (name or code)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (category && category !== 'All') {
      list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by stock status
    if (status && status !== 'All') {
      list = list.filter(p => p.status.toLowerCase() === status.toLowerCase());
    }

    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/products/:id
exports.getProductById = (req, res) => {
  try {
    const { id } = req.params;
    const product = products.find(p => p.id === id || p.code === id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/products
exports.createProduct = (req, res) => {
  try {
    const {
      name,
      code,
      category,
      unit,
      costPrice,
      price,
      minThreshold = 10,
      photo,
      brand,
      description,
      initialStock = 0,
    } = req.body;

    if (!name || !category || !unit) {
      return res.status(400).json({
        success: false,
        error: 'Name, Category, and Unit are required fields',
      });
    }

    // Generate code if missing
    const newCode = code || `PRD${String(products.length + 1).padStart(3, '0')}`;
    const newId = newCode;

    // Check duplicate code
    if (products.some(p => p.code.toLowerCase() === newCode.toLowerCase())) {
      return res.status(400).json({ success: false, error: `Product code ${newCode} already exists` });
    }

    const stockQty = Number(initialStock) || 0;
    const threshold = Number(minThreshold) || 10;

    const newProduct = {
      id: newId,
      code: newCode,
      name,
      category,
      brand: brand || 'Standard',
      unit,
      stock: stockQty,
      minThreshold: threshold,
      costPrice: Number(costPrice) || 0,
      price: Number(price) || 0,
      photo: photo || 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60',
      status: computeStatus(stockQty, threshold),
      description: description || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    products.push(newProduct);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/products/:id
exports.updateProduct = (req, res) => {
  try {
    const { id } = req.params;
    const index = products.findIndex(p => p.id === id || p.code === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const existing = products[index];
    const {
      name,
      category,
      brand,
      unit,
      costPrice,
      price,
      minThreshold,
      photo,
      description,
    } = req.body;

    const updatedThreshold = minThreshold !== undefined ? Number(minThreshold) : existing.minThreshold;

    products[index] = {
      ...existing,
      name: name !== undefined ? name : existing.name,
      category: category !== undefined ? category : existing.category,
      brand: brand !== undefined ? brand : existing.brand,
      unit: unit !== undefined ? unit : existing.unit,
      costPrice: costPrice !== undefined ? Number(costPrice) : existing.costPrice,
      price: price !== undefined ? Number(price) : existing.price,
      minThreshold: updatedThreshold,
      photo: photo !== undefined ? photo : existing.photo,
      description: description !== undefined ? description : existing.description,
      status: computeStatus(existing.stock, updatedThreshold),
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: products[index],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
