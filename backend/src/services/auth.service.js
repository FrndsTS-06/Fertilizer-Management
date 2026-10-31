const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepository = require('../repositories/user.repository');
const { UnauthorizedError, ForbiddenError, BadRequestError, NotFoundError } = require('../utils/appError');
const { resetRateLimit } = require('../middleware/rateLimiter');

// Constant dummy hash to prevent timing attacks when email does not exist
const DUMMY_HASH = '$2a$10$wT6d0O2oWqUv8XqPqDqWc.3nQv8sE6/aBvT6y8u4c3n9p2sE6aBvT';

/**
 * Authentication & Identity Service
 * Encapsulates credential verification, password hashing, and JWT token issuance.
 */
class AuthService {
  /**
   * Authenticate a user with email and password
   * @param {string} email
   * @param {string} password
   * @param {string} [clientIp]
   * @returns {Promise<{ token: string, user: object }>}
   */
  async login(email, password, clientIp = null) {
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const user = await userRepository.findByEmail(email);

    // If user does not exist, run a dummy bcrypt comparison to thwart timing attacks
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check account active status
    if (!user.is_active) {
      throw new ForbiddenError('Account has been deactivated. Please contact your store administrator.');
    }

    // Reset rate limiter on successful authentication
    if (clientIp) {
      resetRateLimit(clientIp);
    }

    // Generate signed JWT token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  /**
   * Verify a JWT token and retrieve the active user profile
   * @param {string} token
   * @returns {Promise<object>}
   */
  async verifyToken(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Authentication token has expired');
      }
      throw new UnauthorizedError('Authentication token is invalid');
    }

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User account associated with this token no longer exists');
    }

    if (!user.is_active) {
      throw new ForbiddenError('User account associated with this token has been deactivated');
    }

    return user;
  }

  /**
   * Hash a plaintext password using bcrypt
   * @param {string} password
   * @returns {Promise<string>}
   */
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  /**
   * Reset / Change user password
   * @param {string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    if (!newPassword || newPassword.trim().length < 6) {
      throw new BadRequestError('New password must be at least 6 characters long');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password if provided
    if (currentPassword) {
      const fullUser = await userRepository.findByEmail(user.email);
      const isMatch = await bcrypt.compare(currentPassword, fullUser.password_hash);
      if (!isMatch) {
        throw new BadRequestError('Current password is incorrect');
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await userRepository.updatePassword(userId, newHash);

    return { success: true, message: 'Password updated successfully' };
  }

  /**
   * Get store information (Shop Name, GSTIN, Email, Phone, Address)
   * @returns {Promise<object>}
   */
  async getStoreInfo() {
    const pool = require('../config/db');
    const res = await pool.query(`
      SELECT store_name, legal_name, gstin, email, phone, address_line1, village_or_city, state, pincode
      FROM store_settings
      WHERE id = 1
    `);
    const row = res.rows[0] || {};
    return {
      storeName: row.store_name || '',
      legalName: row.legal_name || 'Retail Agricultural Inputs Agency',
      gstin: row.gstin || '',
      email: row.email || 'info@fertilizershop.local',
      phone: row.phone || '9822012345',
      address: [row.address_line1, row.village_or_city, row.state].filter(Boolean).join(', '),
    };
  }

  /**
   * Update store profile and optionally user email
   */
  async updateStoreInfo({ storeName, gstin, email, userId }) {
    const pool = require('../config/db');
    const setClauses = [];
    const params = [];
    let idx = 1;

    if (storeName !== undefined) {
      const trimmedName = String(storeName).trim();
      setClauses.push(`store_name = $${idx++}`);
      params.push(trimmedName || 'Fertilizer & Seed Store');
    }
    if (gstin !== undefined) {
      const trimmedGst = gstin ? String(gstin).trim().toUpperCase() : null;
      setClauses.push(`gstin = $${idx++}`);
      params.push(trimmedGst && trimmedGst.length === 15 ? trimmedGst : null);
    }
    if (email !== undefined) {
      const trimmedEmail = email ? String(email).trim().toLowerCase() : null;
      setClauses.push(`email = $${idx++}`);
      params.push(trimmedEmail || null);
    }

    if (setClauses.length > 0) {
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      await pool.query(`UPDATE store_settings SET ${setClauses.join(', ')} WHERE id = 1`, params);
    }

    // Also update logged-in user email if provided
    let updatedUser = null;
    if (userId && email && String(email).trim()) {
      const trimmedEmail = String(email).trim().toLowerCase();
      const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [trimmedEmail, userId]);
      if (existing.rows.length === 0) {
        const uRes = await pool.query(
          'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, full_name, role',
          [trimmedEmail, userId]
        );
        if (uRes.rows[0]) {
          updatedUser = {
            id: uRes.rows[0].id,
            email: uRes.rows[0].email,
            fullName: uRes.rows[0].full_name,
            role: uRes.rows[0].role,
          };
        }
      }
    }

    const storeInfo = await this.getStoreInfo();
    return { storeInfo, user: updatedUser };
  }

  /**
   * Clear store details
   */
  async clearStoreData() {
    const pool = require('../config/db');
    await pool.query(`
      UPDATE store_settings 
      SET store_name = 'Fertilizer & Seed Store', gstin = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = 1
    `);
    const storeInfo = await this.getStoreInfo();
    return { success: true, message: 'Store profile details cleared successfully', storeInfo };
  }
}

module.exports = new AuthService();
