const categoryRepository = require('../repositories/category.repository');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/appError');

/**
 * Category Business Service
 * Encapsulates validation and business rules for product categories.
 */
class CategoryService {
  /**
   * Retrieve all categories
   * @param {object} query
   * @returns {Promise<Array<object>>}
   */
  async getAllCategories(query = {}) {
    const { search, is_active, isActive, sortBy, sortOrder } = query;
    let activeFilter = true;
    if (is_active === 'all' || isActive === 'all') {
      activeFilter = null;
    } else if (is_active !== undefined) {
      activeFilter = is_active === 'true' || is_active === true;
    } else if (isActive !== undefined) {
      activeFilter = isActive === 'true' || isActive === true;
    }

    return categoryRepository.findAll({
      search,
      isActive: activeFilter,
      sortBy,
      sortOrder,
    });
  }

  /**
   * Get single category by ID
   * @param {string} id
   * @returns {Promise<object>}
   */
  async getCategoryById(id) {
    if (!id) {
      throw new BadRequestError('Category ID is required');
    }

    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError(`Category with ID '${id}' not found`);
    }

    return category;
  }

  /**
   * Create a new category
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createCategory(data) {
    const { name, description } = data;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestError('Category name is required and cannot be empty');
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      throw new BadRequestError('Category name cannot exceed 100 characters');
    }

    // Check name uniqueness (case-insensitive)
    const existing = await categoryRepository.findByName(trimmedName);
    if (existing) {
      throw new ConflictError(`A category with name '${trimmedName}' already exists`);
    }

    return categoryRepository.create({
      name: trimmedName,
      description: description ? description.trim() : null,
    });
  }

  /**
   * Update category
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async updateCategory(id, data) {
    const existing = await this.getCategoryById(id);

    const { name, description, is_active, isActive } = data;
    const updates = {};

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new BadRequestError('Category name cannot be empty');
      }
      if (trimmedName.length > 100) {
        throw new BadRequestError('Category name cannot exceed 100 characters');
      }

      // If name changed, check uniqueness
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await categoryRepository.findByName(trimmedName);
        if (duplicate && duplicate.id !== id) {
          throw new ConflictError(`A category with name '${trimmedName}' already exists`);
        }
      }
      updates.name = trimmedName;
    }

    if (description !== undefined) {
      updates.description = description ? description.trim() : null;
    }

    const activeVal = is_active !== undefined ? is_active : isActive;
    if (activeVal !== undefined) {
      updates.is_active = Boolean(activeVal);
    }

    return categoryRepository.update(id, updates);
  }

  /**
   * Archive / Delete category
   * If products are linked to this category, soft-archive to preserve referential integrity.
   * 
   * @param {string} id
   * @returns {Promise<{ message: string, category: object, archived: boolean }>}
   */
  async deleteCategory(id) {
    const category = await this.getCategoryById(id);

    const productCount = await categoryRepository.countReferencedProducts(id);
    if (productCount > 0) {
      // Soft-archive to preserve referential integrity
      const archived = await categoryRepository.archive(id);
      return {
        message: `Category '${category.name}' has ${productCount} associated product(s). It has been archived to preserve historical data.`,
        category: archived,
        archived: true,
      };
    }

    // If no products reference it, soft-archive or delete
    const archived = await categoryRepository.archive(id);
    return {
      message: `Category '${category.name}' archived successfully`,
      category: archived,
      archived: true,
    };
  }
}

module.exports = new CategoryService();
