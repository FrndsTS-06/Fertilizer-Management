const productRepository = require('../repositories/product.repository');
const categoryRepository = require('../repositories/category.repository');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/appError');

/**
 * Product Business Service
 * Encapsulates validation, categorization, packaging normalization,
 * and inventory-linked product creation.
 */
class ProductService {
  /**
   * Resolve category from UUID or category name
   * @private
   * @param {string} categoryInput
   * @returns {Promise<object>}
   */
  async _resolveCategory(categoryInput) {
    if (!categoryInput) {
      throw new BadRequestError('Category is required');
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryInput);
    let category = null;

    if (isUUID) {
      category = await categoryRepository.findById(categoryInput);
    } else {
      category = await categoryRepository.findByName(categoryInput);
    }

    if (!category) {
      throw new BadRequestError(`Invalid category: '${categoryInput}'. Category does not exist in master records.`);
    }

    if (!category.is_active) {
      throw new BadRequestError(`Category '${category.name}' is archived. Cannot assign archived category.`);
    }

    return category;
  }

  /**
   * Normalize package type, size, and unit from request payload
   * @private
   */
  _normalizePackaging(data) {
    let unit = data.unit ? String(data.unit).trim() : '';
    let packageType = data.packageType || data.package_type || 'Bags';
    let packageSize = data.packageSize || data.package_size || '50kgs';

    if (!unit) {
      if (packageType && packageSize) {
        unit = `${packageType} (${packageSize})`;
      } else {
        unit = 'Bags (50kgs)';
      }
    }

    return {
      packageType: String(packageType).trim(),
      packageSize: String(packageSize).trim(),
      unit,
    };
  }

  /**
   * List products with search, category/status filtering, and pagination
   * @param {object} query
   * @returns {Promise<{ products: Array<object>, pagination: object }>}
   */
  async listProducts(query = {}) {
    const {
      search = '',
      category = 'All',
      status = 'All',
      is_active,
      isActive,
      include_archived,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = query;

    let activeFilter = true;
    if (include_archived === 'true' || is_active === 'all' || isActive === 'all') {
      activeFilter = 'all';
    } else if (is_active !== undefined) {
      activeFilter = is_active === 'true' || is_active === true;
    } else if (isActive !== undefined) {
      activeFilter = isActive === 'true' || isActive === true;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const [products, total] = await Promise.all([
      productRepository.findAll({
        search,
        category,
        status,
        isActive: activeFilter,
        page: pageNum,
        limit: limitNum,
        sortBy,
        sortOrder,
      }),
      productRepository.countAll({
        search,
        category,
        status,
        isActive: activeFilter,
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  }

  /**
   * Get single product by UUID or SKU code
   * @param {string} idOrCode
   * @returns {Promise<object>}
   */
  async getProduct(idOrCode) {
    if (!idOrCode) {
      throw new BadRequestError('Product identifier is required');
    }

    const product = await productRepository.findById(idOrCode);
    if (!product) {
      throw new NotFoundError(`Product '${idOrCode}' not found`);
    }

    return product;
  }

  /**
   * Create a new product with initial stock linked to inventory movements
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createProduct(data) {
    const {
      name,
      code,
      brand = 'Standard',
      costPrice,
      cost_price,
      price,
      selling_price,
      minThreshold,
      min_threshold,
      initialStock,
      initial_stock,
      photo,
      description,
    } = data;

    // 1. Required field validations
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestError('Product name is required');
    }

    const rawCategory = data.category || data.categoryId || data.category_id;
    const category = await this._resolveCategory(rawCategory);

    // 2. Validate pricing and thresholds
    const finalCostPrice = Number(costPrice !== undefined ? costPrice : cost_price);
    if (isNaN(finalCostPrice) || finalCostPrice < 0) {
      throw new BadRequestError('Cost price must be a valid non-negative number');
    }

    const finalSellingPrice = Number(price !== undefined ? price : selling_price);
    if (isNaN(finalSellingPrice) || finalSellingPrice < 0) {
      throw new BadRequestError('Selling price must be a valid non-negative number');
    }

    const finalMinThreshold = minThreshold !== undefined || min_threshold !== undefined
      ? Number(minThreshold !== undefined ? minThreshold : min_threshold)
      : 10;
    if (isNaN(finalMinThreshold) || finalMinThreshold < 0) {
      throw new BadRequestError('Minimum stock threshold must be a non-negative number');
    }

    const finalInitialStock = initialStock !== undefined || initial_stock !== undefined
      ? Number(initialStock !== undefined ? initialStock : initial_stock)
      : 0;
    if (isNaN(finalInitialStock) || finalInitialStock < 0) {
      throw new BadRequestError('Initial stock must be a non-negative number');
    }

    // 3. Packaging details
    const packaging = this._normalizePackaging(data);

    // 4. SKU Code determination
    let finalCode = code ? String(code).trim().toUpperCase() : null;
    if (finalCode) {
      const existing = await productRepository.findByCode(finalCode);
      if (existing) {
        throw new ConflictError(`Product SKU code '${finalCode}' already exists`);
      }
    } else {
      finalCode = await productRepository.generateNextCode();
    }

    // 5. Build product record
    const productRecord = {
      code: finalCode,
      name: name.trim(),
      categoryId: category.id,
      brand: brand ? String(brand).trim() : 'Standard',
      packageType: packaging.packageType,
      packageSize: packaging.packageSize,
      unit: packaging.unit,
      costPrice: finalCostPrice,
      price: finalSellingPrice,
      minThreshold: finalMinThreshold,
      photo: photo ? String(photo).trim() : null,
      description: description ? String(description).trim() : null,
    };

    // 6. Execute atomic creation through inventory workflow
    return productRepository.createWithInitialStock(productRecord, finalInitialStock);
  }

  /**
   * Update product attributes
   * Note: Stock CANNOT be modified here. Stock changes must use inventory adjustment.
   * 
   * @param {string} idOrCode
   * @param {object} data
   * @returns {Promise<object>}
   */
  async updateProduct(idOrCode, data) {
    const existing = await this.getProduct(idOrCode);

    // Enforce safety rule: Reject direct stock modifications
    if (data.stock !== undefined || data.initialStock !== undefined || data.initial_stock !== undefined) {
      throw new BadRequestError(
        'Direct stock modification is not permitted via product updates. Use the Inventory Stock Adjustment workflow to change stock levels.'
      );
    }

    const updates = {};

    if (data.name !== undefined) {
      if (!data.name || !String(data.name).trim()) {
        throw new BadRequestError('Product name cannot be empty');
      }
      updates.name = String(data.name).trim();
    }

    // Resolve category if changed
    const rawCategory = data.category || data.categoryId || data.category_id;
    if (rawCategory !== undefined) {
      const category = await this._resolveCategory(rawCategory);
      updates.categoryId = category.id;
    }

    if (data.brand !== undefined) {
      updates.brand = String(data.brand).trim();
    }

    if (data.packageType !== undefined || data.package_type !== undefined) {
      updates.packageType = String(data.packageType || data.package_type).trim();
    }

    if (data.packageSize !== undefined || data.package_size !== undefined) {
      updates.packageSize = String(data.packageSize || data.package_size).trim();
    }

    if (data.unit !== undefined) {
      if (!data.unit || !String(data.unit).trim()) {
        throw new BadRequestError('Unit cannot be empty');
      }
      updates.unit = String(data.unit).trim();
    }

    const costPriceVal = data.costPrice !== undefined ? data.costPrice : data.cost_price;
    if (costPriceVal !== undefined) {
      const num = Number(costPriceVal);
      if (isNaN(num) || num < 0) {
        throw new BadRequestError('Cost price must be a non-negative number');
      }
      updates.costPrice = num;
    }

    const priceVal = data.price !== undefined ? data.price : data.selling_price;
    if (priceVal !== undefined) {
      const num = Number(priceVal);
      if (isNaN(num) || num < 0) {
        throw new BadRequestError('Selling price must be a non-negative number');
      }
      updates.price = num;
    }

    const minThresholdVal = data.minThreshold !== undefined ? data.minThreshold : data.min_threshold;
    if (minThresholdVal !== undefined) {
      const num = Number(minThresholdVal);
      if (isNaN(num) || num < 0) {
        throw new BadRequestError('Minimum stock threshold must be a non-negative number');
      }
      updates.minThreshold = num;
    }

    if (data.photo !== undefined) {
      updates.photo = data.photo ? String(data.photo).trim() : null;
    }

    if (data.description !== undefined) {
      updates.description = data.description ? String(data.description).trim() : null;
    }

    if (data.is_active !== undefined || data.isActive !== undefined) {
      updates.isActive = Boolean(data.is_active !== undefined ? data.is_active : data.isActive);
    }

    return productRepository.update(existing.id, updates);
  }

  /**
   * Archive / Soft-delete product
   * Preserves historical stock movements, purchases, and sales
   * 
   * @param {string} idOrCode
   * @returns {Promise<{ message: string, product: object }>}
   */
  async archiveProduct(idOrCode) {
    const existing = await this.getProduct(idOrCode);
    const archived = await productRepository.archive(existing.id);

    return {
      message: `Product '${existing.name}' (${existing.code}) archived successfully. Historical transaction references preserved.`,
      product: archived,
    };
  }

  /**
   * Restore an archived product
   * @param {string} idOrCode
   * @returns {Promise<{ message: string, product: object }>}
   */
  async restoreProduct(idOrCode) {
    const existing = await this.getProduct(idOrCode);
    const restored = await productRepository.restore(existing.id);

    return {
      message: `Product '${existing.name}' (${existing.code}) restored successfully.`,
      product: restored,
    };
  }
}

module.exports = new ProductService();
