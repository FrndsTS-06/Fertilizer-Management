const { products, movements, computeStatus } = require('./products.data');

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

    const stockQty = Number(initialStock !== undefined ? initialStock : (req.body.stock !== undefined ? req.body.stock : (req.body.stockQty || 0))) || 0;
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

    // Record stock movement if product created with initial stock
    if (stockQty > 0) {
      movements.unshift({
        id: `MOV${String(movements.length + 1001)}`,
        productId: newProduct.id,
        productName: newProduct.name,
        productCode: newProduct.code,
        type: 'PURCHASE',
        action: 'ADDED',
        changeQty: stockQty,
        previousStock: 0,
        newStock: stockQty,
        unit: newProduct.unit,
        reason: 'Initial Product Stock Inward',
        reference: `ADD-${newProduct.code}`,
        createdAt: new Date(),
      });
    }

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

    let updatedStock = existing.stock;
    const rawStock = req.body.stock !== undefined ? req.body.stock : req.body.initialStock;
    if (rawStock !== undefined) {
      const newStockVal = Number(rawStock);
      if (!isNaN(newStockVal) && newStockVal !== existing.stock) {
        const diff = newStockVal - existing.stock;
        updatedStock = newStockVal;
        movements.unshift({
          id: `MOV${String(movements.length + 1001)}`,
          productId: existing.id,
          productName: name !== undefined ? name : existing.name,
          productCode: existing.code,
          type: diff > 0 ? 'PURCHASE' : 'ADJUSTMENT',
          action: diff > 0 ? 'ADDED' : 'UPDATE',
          changeQty: diff,
          previousStock: existing.stock,
          newStock: updatedStock,
          unit: unit !== undefined ? unit : existing.unit,
          reason: diff > 0 ? 'Stock Inward Restock' : 'Stock Quantity Audit',
          reference: `UPD-${existing.code}`,
          createdAt: new Date(),
        });
      }
    }

    const updatedThreshold = minThreshold !== undefined ? Number(minThreshold) : existing.minThreshold;

    products[index] = {
      ...existing,
      name: name !== undefined ? name : existing.name,
      category: category !== undefined ? category : existing.category,
      brand: brand !== undefined ? brand : existing.brand,
      unit: unit !== undefined ? unit : existing.unit,
      stock: updatedStock,
      costPrice: costPrice !== undefined ? Number(costPrice) : existing.costPrice,
      price: price !== undefined ? Number(price) : existing.price,
      minThreshold: updatedThreshold,
      photo: photo !== undefined ? photo : existing.photo,
      description: description !== undefined ? description : existing.description,
      status: computeStatus(updatedStock, updatedThreshold),
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

// DELETE /api/products/:id
exports.deleteProduct = (req, res) => {
  try {
    const { id } = req.params;
    const index = products.findIndex(p => p.id === id || p.code === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const [deleted] = products.splice(index, 1);
    res.json({
      success: true,
      message: `Product ${deleted.name} (${deleted.code}) removed successfully`,
      data: deleted,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/products
exports.clearAllProducts = (req, res) => {
  try {
    const { movements } = require('./products.data');
    products.length = 0;
    if (movements) movements.length = 0;

    res.json({
      success: true,
      message: 'All products and stock inventory items have been cleared',
      count: 0,
      data: [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

