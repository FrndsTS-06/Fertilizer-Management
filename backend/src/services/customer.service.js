const customerRepository = require('../repositories/customer.repository');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/appError');
const validators = require('../validators');

/**
 * Customer Business Service
 * Encapsulates validation, Khata reconciliation, credit accounting, and ledger statements.
 */
class CustomerService {
  /**
   * List customers with search, village filter, dues filter, and dashboard summary
   * @param {object} query
   * @returns {Promise<{ customers: Array<object>, summary: object, pagination: object }>}
   */
  async listCustomers(query = {}) {
    const {
      search = '',
      village = 'All',
      duesOnly = 'all',
      dateFilter = 'all',
      startDate,
      endDate,
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

    const [customers, total, summary] = await Promise.all([
      customerRepository.findAll({
        search,
        village,
        duesOnly,
        isActive: activeFilter,
        dateFilter,
        startDate,
        endDate,
        page: pageNum,
        limit: limitNum,
        sortBy,
        sortOrder,
      }),
      customerRepository.countAll({
        search,
        village,
        duesOnly,
        isActive: activeFilter,
        dateFilter,
        startDate,
        endDate,
      }),
      customerRepository.getSummary(),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      customers,
      summary,
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
   * Get single customer by UUID or customer_code (e.g. CUST001)
   * @param {string} idOrCode
   * @returns {Promise<object>}
   */
  async getCustomer(idOrCode) {
    if (!idOrCode) {
      throw new BadRequestError('Customer identifier is required');
    }

    const customer = await customerRepository.findById(idOrCode);
    if (!customer) {
      throw new NotFoundError(`Customer '${idOrCode}' not found`);
    }

    return customer;
  }

  /**
   * Register a new farmer customer
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createCustomer(data) {
    const {
      name,
      customer_code,
      customerCode,
      phone,
      village,
      address,
      creditLimit,
      credit_limit,
      openingBalance,
      opening_balance,
      totalPayment,
      duePayment,
      notes,
    } = data;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestError('Customer name is required');
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 150) {
      throw new BadRequestError('Customer name cannot exceed 150 characters');
    }

    // Phone uniqueness check
    let trimmedPhone = phone ? String(phone).trim() : null;
    if (trimmedPhone) {
      const existingPhone = await customerRepository.findByPhone(trimmedPhone);
      if (existingPhone) {
        throw new ConflictError(`Phone number '${trimmedPhone}' is already registered to ${existingPhone.name} (${existingPhone.customer_code})`);
      }
    }

    // Customer code assignment
    let finalCode = customer_code || customerCode;
    if (finalCode) {
      finalCode = String(finalCode).trim().toUpperCase();
      const existingCode = await customerRepository.findById(finalCode);
      if (existingCode) {
        throw new ConflictError(`Customer code '${finalCode}' already exists`);
      }
    } else {
      finalCode = await customerRepository.generateNextCustomerCode();
    }

    // Credit limit
    const rawCreditLimit = creditLimit !== undefined ? creditLimit : credit_limit;
    const finalCreditLimit = rawCreditLimit !== undefined && rawCreditLimit !== '' ? Number(rawCreditLimit) : 30000.0;
    if (isNaN(finalCreditLimit) || finalCreditLimit < 0) {
      throw new BadRequestError('Credit limit must be a non-negative number');
    }

    // Opening balance (debt carried forward prior to software adoption)
    let finalOpeningBalance = 0.0;
    if (openingBalance !== undefined || opening_balance !== undefined) {
      finalOpeningBalance = Number(openingBalance !== undefined ? openingBalance : opening_balance);
    } else if (duePayment !== undefined && duePayment !== '') {
      finalOpeningBalance = Number(duePayment);
    } else if (totalPayment !== undefined && totalPayment !== '') {
      finalOpeningBalance = Number(totalPayment);
    }

    if (isNaN(finalOpeningBalance) || finalOpeningBalance < 0) {
      throw new BadRequestError('Opening balance must be a non-negative number');
    }

    return customerRepository.create({
      customer_code: finalCode,
      name: trimmedName,
      phone: trimmedPhone,
      village: village ? String(village).trim() : null,
      address: address ? String(address).trim() : null,
      credit_limit: finalCreditLimit,
      opening_balance: finalOpeningBalance,
      notes: notes ? String(notes).trim() : null,
    });
  }

  /**
   * Update customer profile
   * @param {string} idOrCode
   * @param {object} data
   * @returns {Promise<object>}
   */
  async updateCustomer(idOrCode, data) {
    const existing = await this.getCustomer(idOrCode);

    const updates = {};

    if (data.name !== undefined) {
      const trimmed = String(data.name).trim();
      if (!trimmed) {
        throw new BadRequestError('Customer name cannot be empty');
      }
      if (trimmed.length > 150) {
        throw new BadRequestError('Customer name cannot exceed 150 characters');
      }
      updates.name = trimmed;
    }

    if (data.phone !== undefined) {
      const trimmedPhone = data.phone ? String(data.phone).trim() : null;
      if (trimmedPhone && trimmedPhone !== existing.phone) {
        const duplicatePhone = await customerRepository.findByPhone(trimmedPhone);
        if (duplicatePhone && duplicatePhone.id !== existing.id) {
          throw new ConflictError(`Phone number '${trimmedPhone}' is already registered to another customer (${duplicatePhone.name})`);
        }
      }
      updates.phone = trimmedPhone;
    }

    if (data.village !== undefined) {
      updates.village = data.village ? String(data.village).trim() : null;
    }

    if (data.address !== undefined) {
      updates.address = data.address ? String(data.address).trim() : null;
    }

    const rawCredit = data.creditLimit !== undefined ? data.creditLimit : data.credit_limit;
    if (rawCredit !== undefined && rawCredit !== '') {
      const numCredit = Number(rawCredit);
      if (isNaN(numCredit) || numCredit < 0) {
        throw new BadRequestError('Credit limit must be a non-negative number');
      }
      updates.creditLimit = numCredit;
    }

    const rawOpening = data.openingBalance !== undefined ? data.openingBalance : data.opening_balance;
    if (rawOpening !== undefined && rawOpening !== '') {
      const numOpening = Number(rawOpening);
      if (isNaN(numOpening) || numOpening < 0) {
        throw new BadRequestError('Opening balance must be a non-negative number');
      }
      updates.openingBalance = numOpening;
    }

    if (data.notes !== undefined) {
      updates.notes = data.notes ? String(data.notes).trim() : null;
    }

    if (data.is_active !== undefined || data.isActive !== undefined) {
      updates.isActive = Boolean(data.is_active !== undefined ? data.is_active : data.isActive);
    }

    const rawDate = data.date !== undefined ? data.date : (data.createdAt !== undefined ? data.createdAt : data.created_at);
    if (rawDate !== undefined && rawDate !== null && rawDate !== '') {
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        const now = new Date();
        const dateWithTime = new Date(parsedDate);
        dateWithTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        updates.createdAt = dateWithTime;
      }
    }

    return customerRepository.update(existing.id, updates);
  }

  /**
   * Archive / Delete customer
   * Hard-deletes if customer has no sales/payments; otherwise soft-deletes to preserve audit trail
   * @param {string} idOrCode
   * @returns {Promise<{ message: string, customer?: object }>}
   */
  async archiveCustomer(idOrCode) {
    const existing = await this.getCustomer(idOrCode);
    const sales = await customerRepository.getCustomerSales(existing.id);
    const payments = await customerRepository.getCustomerPayments(existing.id);

    if ((!sales || sales.length === 0) && (!payments || payments.length === 0)) {
      await customerRepository.delete(existing.id);
      return {
        message: `Customer '${existing.name}' (${existing.customerCode}) deleted permanently.`,
      };
    }

    const archived = await customerRepository.archive(existing.id);
    return {
      message: `Customer '${existing.name}' (${existing.customerCode}) archived successfully. Historical Khata records preserved.`,
      customer: archived,
    };
  }

  /**
   * Restore archived customer
   * @param {string} idOrCode
   * @returns {Promise<{ message: string, customer: object }>}
   */
  async restoreCustomer(idOrCode) {
    const existing = await this.getCustomer(idOrCode);
    const restored = await customerRepository.restore(existing.id);

    return {
      message: `Customer '${existing.name}' (${existing.customerCode}) restored successfully.`,
      customer: restored,
    };
  }

  /**
   * Single source of truth customer balance summary
   * @param {string} idOrCode
   * @returns {Promise<object>}
   */
  async getCustomerBalance(idOrCode) {
    const customer = await this.getCustomer(idOrCode);
    const allSales = await customerRepository.getCustomerSales(customer.id);
    const unpaidInvoices = allSales.filter((s) => Number(s.dueAmount) > 0);

    return {
      customerId: customer.id,
      customerCode: customer.customerCode,
      customerName: customer.name,
      creditLimit: customer.creditLimit,
      totalPurchases: customer.totalPurchases,
      totalPaid: customer.totalPaid,
      outstandingDues: customer.outstandingDues,
      availableCredit: customer.availableCredit,
      balanceStatus: customer.balanceStatus,
      unpaidInvoices,
    };
  }

  /**
   * Get all sales/invoices for a customer
   * @param {string} idOrCode
   * @returns {Promise<Array<object>>}
   */
  async getCustomerSales(idOrCode) {
    const customer = await this.getCustomer(idOrCode);
    return customerRepository.getCustomerSales(customer.id);
  }

  /**
   * Get all payment receipts for a customer
   * @param {string} idOrCode
   * @returns {Promise<Array<object>>}
   */
  async getCustomerPayments(idOrCode) {
    const customer = await this.getCustomer(idOrCode);
    return customerRepository.getCustomerPayments(customer.id);
  }

  /**
   * Unified chronological transaction ledger statement
   * @param {string} idOrCode
   * @returns {Promise<object>}
   */
  async getCustomerLedger(idOrCode) {
    const customer = await this.getCustomer(idOrCode);
    return customerRepository.getCustomerLedger(customer.id);
  }
}

module.exports = new CustomerService();
