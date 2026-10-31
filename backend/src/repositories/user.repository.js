const BaseRepository = require('./base.repository');

/**
 * User Repository
 * Data-access layer for user accounts, credentials, and role status.
 */
class UserRepository extends BaseRepository {
  /**
   * Find a user by their email address (including password_hash for auth validation)
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    return this.findOne(
      `SELECT id, email, password_hash, full_name, role, is_active, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER($1);`,
      [email]
    );
  }

  /**
   * Find user by UUID (excluding password hash)
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    return this.findOne(
      `SELECT id, email, full_name, role, is_active, created_at, updated_at
       FROM users
       WHERE id = $1;`,
      [id]
    );
  }

  /**
   * Update user active status
   * @param {string} id
   * @param {boolean} isActive
   * @returns {Promise<object|null>}
   */
  async setActiveStatus(id, isActive) {
    return this.findOne(
      `UPDATE users
       SET is_active = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, full_name, role, is_active, updated_at;`,
      [id, isActive]
    );
  }

  /**
   * Update user password hash
   * @param {string} id
   * @param {string} passwordHash
   * @returns {Promise<object|null>}
   */
  async updatePassword(id, passwordHash) {
    return this.findOne(
      `UPDATE users
       SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, full_name, role, is_active, updated_at;`,
      [id, passwordHash]
    );
  }
}

module.exports = new UserRepository();
