const { products, movements, computeStatus } = require('../products/products.data');

// GET /api/inventory/summary
exports.getInventorySummary = (req, res) => {
  try {
    const totalProducts = products.length;
    const totalAvailableStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const lowStockCount = products.filter(p => p.status === 'Low Stock').length;
    const outOfStockCount = products.filter(p => p.status === 'Out of Stock').length;
    const inStockCount = products.filter(p => p.status === 'In Stock').length;

    res.json({
      success: true,
      data: {
        totalProducts,
        totalAvailableStock,
        lowStockCount,
        outOfStockCount,
        inStockCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/inventory/movements
exports.getInventoryMovements = (req, res) => {
  try {
    const { productId, type } = req.query;
    let list = [...movements];

    if (productId) {
      list = list.filter(m => m.productId === productId || m.productCode === productId);
    }

    if (type && type !== 'All') {
      list = list.filter(m => m.type.toUpperCase() === type.toUpperCase());
    }

    // Sort descending by date
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/inventory/adjustments
// Stock adjustment and retail purchase inward handler
exports.createAdjustment = (req, res) => {
  try {
    const {
      productId,
      productName,
      company,
      brand,
      operation = 'ADD',
      quantity,
      costPrice,
      overallCost,
      unit,
      reason,
      reference,
      type: customType,
    } = req.body;

    const op = (operation || 'ADD').toUpperCase();
    const qty = Math.abs(Number(quantity));

    if ((!productId && !productName) || isNaN(qty) || qty < 0) {
      return res.status(400).json({
        success: false,
        error: 'Product and valid quantity are required.',
      });
    }

    let product = products.find(p =>
      (productId && (p.id === productId || p.code === productId)) ||
      (productName && p.name && p.name.trim().toLowerCase() === productName.trim().toLowerCase())
    );

    // If product doesn't exist yet, auto-create it for retail purchase
    if (!product && productName) {
      const newCode = `PRD${String(products.length + 1).padStart(3, '0')}`;
      const singlePrice = Number(costPrice) || 0;
      product = {
        id: newCode,
        code: newCode,
        name: productName.trim(),
        category: req.body.category || 'Fertilizer',
        brand: company || brand || 'Standard',
        unit: unit || '50kg Bag',
        stock: 0,
        minThreshold: 10,
        costPrice: singlePrice,
        price: singlePrice > 0 ? Math.round(singlePrice * 1.1) : 0,
        photo: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&auto=format&fit=crop&q=60',
        status: 'Out of Stock',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      products.push(product);
    }

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const prevStock = Number(product.stock) || 0;
    let newStock = prevStock;
    let changeQty = 0;

    if (op === 'ADD') {
      newStock = prevStock + qty;
      changeQty = qty;
    } else if (op === 'REDUCE') {
      if (prevStock < qty) {
        return res.status(400).json({
          success: false,
          error: `Cannot reduce ${qty} units. Current stock is only ${prevStock}.`,
        });
      }
      newStock = prevStock - qty;
      changeQty = -qty;
    } else if (op === 'CORRECT') {
      newStock = qty;
      changeQty = qty - prevStock;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation. Must be ADD, REDUCE, or CORRECT.',
      });
    }

    // Update product stock and properties
    product.stock = newStock;
    if (costPrice !== undefined && Number(costPrice) > 0) {
      product.costPrice = Number(costPrice);
      if (!product.price || product.price <= product.costPrice) {
        product.price = Math.round(Number(costPrice) * 1.1);
      }
    }
    if (company || brand) product.brand = company || brand;
    if (unit) product.unit = unit;
    product.status = computeStatus(newStock, product.minThreshold);
    product.updatedAt = new Date();

    const finalReason = reason || (company ? `Retail Purchase from ${company}` : 'Stock Inward Purchase');
    const finalRef = reference || (company ? `${company.toUpperCase().slice(0, 4)}-PUR-${Date.now().toString().slice(-4)}` : `PUR-${Date.now().toString().slice(-4)}`);

    // Create movement audit record
    const movementRecord = {
      id: `MOV${String(movements.length + 1001)}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      type: customType || (op === 'ADD' ? 'PURCHASE' : 'ADJUSTMENT'),
      action: op === 'ADD' ? 'ADDED' : 'UPDATE',
      changeQty,
      previousStock: prevStock,
      newStock,
      unit: product.unit,
      costPrice: Number(costPrice) || product.costPrice || 0,
      overallCost: Number(overallCost) || ((Number(costPrice) || product.costPrice || 0) * qty),
      reason: finalReason,
      reference: finalRef,
      createdAt: new Date(),
    };

    movements.unshift(movementRecord);

    res.status(201).json({
      success: true,
      message: `Stock successfully updated for ${product.name}`,
      data: {
        product,
        movement: movementRecord,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
