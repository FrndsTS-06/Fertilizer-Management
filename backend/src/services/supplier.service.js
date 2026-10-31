const supplierRepository = require('../repositories/supplier.repository');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/appError');
const validators = require('../validators');

/**
 * Supplier Business Service
 * Encapsulates validation, GSTIN format compliance, and supplier distributor management.
 */
class SupplierService {
  /**
   * List suppliers with search, active status filter, and pagination
   * @param {object} query
   * @returns {Promise<{ suppliers: Array<object>, pagination: object }>}
   */
  async listSuppliers(query = {}) {
    const {
      search = '',
      is_active,
      isActive,
      include_archived,
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'ASC',
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

    const [suppliers, total] = await Promise.all([
      supplierRepository.findAll({
        search,
        isActive: activeFilter,
        page: pageNum,
        limit: limitNum,
        sortBy,
        sortOrder,
      }),
      supplierRepository.countAll({
        search,
        isActive: activeFilter,
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      suppliers,
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
   * Get single supplier detail by UUID or Name
   * @param {string} idOrName
   * @returns {Promise<object>}
   */
  async getSupplier(idOrName) {
    if (!idOrName) {
      throw new BadRequestError('Supplier identifier is required');
    }

    const supplier = await supplierRepository.findById(idOrName);
    if (!supplier) {
      throw new NotFoundError(`Supplier '${idOrName}' not found`);
    }

    return supplier;
  }

  /**
   * Create a new supplier
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createSupplier(data) {
    const { name, contact_person, contactPerson, phone, email, address, gstin } = data;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestError('Supplier company name is required');
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 150) {
      throw new BadRequestError('Supplier name cannot exceed 150 characters');
    }

    // Uniqueness check (case-insensitive)
    const existing = await supplierRepository.findByName(trimmedName);
    if (existing) {
      throw new ConflictError(`Supplier with name '${trimmedName}' already exists`);
    }

    // GSTIN format validation
    let finalGstin = gstin ? String(gstin).trim().toUpperCase() : null;
    if (finalGstin && !validators.isGSTIN(finalGstin)) {
      throw new BadRequestError('Invalid GSTIN format. Must be a valid 15-character Indian Goods & Services Tax identification number.');
    }

    // Email validation
    let finalEmail = email ? String(email).trim() : null;
    if (finalEmail && !validators.isEmail(finalEmail)) {
      throw new BadRequestError('Invalid email format');
    }

    return supplierRepository.create({
      name: trimmedName,
      contact_person: contact_person || contactPerson || null,
      phone: phone ? String(phone).trim() : null,
      email: finalEmail,
      address: address ? String(address).trim() : null,
      gstin: finalGstin,
    });
  }

  /**
   * Update supplier attributes
   * @param {string} idOrName
   * @param {object} data
   * @returns {Promise<object>}
   */
  async updateSupplier(idOrName, data) {
    const existing = await this.getSupplier(idOrName);

    const updates = {};

    if (data.name !== undefined) {
      const trimmedName = String(data.name).trim();
      if (!trimmedName) {
        throw new BadRequestError('Supplier name cannot be empty');
      }
      if (trimmedName.length > 150) {
        throw new BadRequestError('Supplier name cannot exceed 150 characters');
      }

      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await supplierRepository.findByName(trimmedName);
        if (duplicate && duplicate.id !== existing.id) {
          throw new ConflictError(`Supplier with name '${trimmedName}' already exists`);
        }
      }
      updates.name = trimmedName;
    }

    if (data.contactPerson !== undefined || data.contact_person !== undefined) {
      const cp = data.contactPerson !== undefined ? data.contactPerson : data.contact_person;
      updates.contactPerson = cp ? String(cp).trim() : null;
    }

    if (data.phone !== undefined) {
      updates.phone = data.phone ? String(data.phone).trim() : null;
    }

    if (data.email !== undefined) {
      const em = data.email ? String(data.email).trim() : null;
      if (em && !validators.isEmail(em)) {
        throw new BadRequestError('Invalid email format');
      }
      updates.email = em;
    }

    if (data.address !== undefined) {
      updates.address = data.address ? String(data.address).trim() : null;
    }

    if (data.gstin !== undefined) {
      const g = data.gstin ? String(data.gstin).trim().toUpperCase() : null;
      if (g && !validators.isGSTIN(g)) {
        throw new BadRequestError('Invalid GSTIN format. Must be a valid 15-character Indian Goods & Services Tax identification number.');
      }
      updates.gstin = g;
    }

    if (data.is_active !== undefined || data.isActive !== undefined) {
      updates.isActive = Boolean(data.is_active !== undefined ? data.is_active : data.isActive);
    }

    return supplierRepository.update(existing.id, updates);
  }

  /**
   * Archive / Soft-delete supplier
   * Preserves historical purchase orders and distributor relationships
   * @param {string} idOrName
   * @returns {Promise<{ message: string, supplier: object }>}
   */
  async archiveSupplier(idOrName) {
    const existing = await this.getSupplier(idOrName);
    const archived = await supplierRepository.archive(existing.id);

    return {
      message: `Supplier '${existing.name}' archived successfully. Historical purchase records preserved.`,
      supplier: archived,
    };
  }

  /**
   * Restore archived supplier
   * @param {string} idOrName
   * @returns {Promise<{ message: string, supplier: object }>}
   */
  async restoreSupplier(idOrName) {
    const existing = await this.getSupplier(idOrName);
    const restored = await supplierRepository.restore(existing.id);

    return {
      message: `Supplier '${existing.name}' restored successfully.`,
      supplier: restored,
    };
  }

  /**
   * Get purchase order history associated with a supplier
   * @param {string} idOrName
   * @param {object} query
   * @returns {Promise<Array<object>>}
   */
  async getSupplierPurchases(idOrName, query = {}) {
    const supplier = await this.getSupplier(idOrName);
    const { page = 1, limit = 50 } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    return supplierRepository.getPurchases(supplier.id, {
      limit: limitNum,
      offset,
    });
  }
}

module.exports = new SupplierService();
