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
// Manual adjustment only for corrections or non-sale/non-purchase changes
exports.createAdjustment = (req, res) => {
  try {
    const { productId, operation, quantity, reason, reference } = req.body;

    if (!productId || !operation || quantity === undefined || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Product ID, Operation (ADD, REDUCE, CORRECT), Quantity, and Reason are required.',
      });
    }

    const product = products.find(p => p.id === productId || p.code === productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const prevStock = Number(product.stock) || 0;
    const qty = Math.abs(Number(quantity));
    let newStock = prevStock;
    let changeQty = 0;

    const op = operation.toUpperCase();
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
      // Direct count overwrite
      newStock = qty;
      changeQty = qty - prevStock;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation. Must be ADD, REDUCE, or CORRECT.',
      });
    }

    // Update product stock and recompute status
    product.stock = newStock;
    product.status = computeStatus(newStock, product.minThreshold);
    product.updatedAt = new Date();

    // Create movement audit record
    const movementRecord = {
      id: `MOV${String(movements.length + 1001)}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      type: 'ADJUSTMENT',
      changeQty,
      previousStock: prevStock,
      newStock,
      reason,
      reference: reference || `MAN-ADJ-${Date.now().toString().slice(-4)}`,
      createdAt: new Date(),
    };

    movements.unshift(movementRecord);

    res.status(201).json({
      success: true,
      message: `Stock successfully adjusted for ${product.name}`,
      data: {
        product,
        movement: movementRecord,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
