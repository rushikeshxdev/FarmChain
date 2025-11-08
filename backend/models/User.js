const { query } = require('../config/database');
const bcrypt = require('bcrypt');
const logger = require('../config/logger');

class User {
  // Create new user
  static async create({ name, email, password, role, phone, location, walletAddress }) {
    try {
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const sql = `
        INSERT INTO users (name, email, password_hash, role, phone, location, wallet_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING user_id, name, email, role, phone, location, wallet_address, created_at
      `;

      const result = await query(sql, [
        name,
        email,
        passwordHash,
        role,
        phone || null,
        location || null,
        walletAddress || null
      ]);

      logger.info(`User created: ${email} (${role})`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const sql = `
        SELECT user_id, name, email, password_hash, role, phone, location, 
               wallet_address, created_at, updated_at
        FROM users
        WHERE email = $1
      `;

      const result = await query(sql, [email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(userId) {
    try {
      const sql = `
        SELECT user_id, name, email, role, phone, location, 
               wallet_address, created_at, updated_at
        FROM users
        WHERE user_id = $1
      `;

      const result = await query(sql, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Get all users with optional role filter
  static async findAll(role = null, limit = 100, offset = 0) {
    try {
      let sql = `
        SELECT user_id, name, email, role, phone, location, 
               wallet_address, created_at, updated_at
        FROM users
      `;

      const params = [];
      
      if (role) {
        sql += ` WHERE role = $1`;
        params.push(role);
        sql += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
        params.push(limit, offset);
      } else {
        sql += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
        params.push(limit, offset);
      }

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw error;
    }
  }

  // Update user profile
  static async update(userId, updates) {
    try {
      const allowedFields = ['name', 'phone', 'location', 'wallet_address'];
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Build dynamic UPDATE query
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          const dbField = key === 'walletAddress' ? 'wallet_address' : key;
          fields.push(`${dbField} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(userId);
      const sql = `
        UPDATE users
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${paramCount}
        RETURNING user_id, name, email, role, phone, location, wallet_address, updated_at
      `;

      const result = await query(sql, values);
      logger.info(`User updated: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  // Update password
  static async updatePassword(userId, newPassword) {
    try {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      const sql = `
        UPDATE users
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
        RETURNING user_id
      `;

      const result = await query(sql, [passwordHash, userId]);
      logger.info(`Password updated for user: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error verifying password:', error);
      throw error;
    }
  }

  // Delete user (soft delete by setting inactive status)
  static async delete(userId) {
    try {
      const sql = `
        DELETE FROM users
        WHERE user_id = $1
        RETURNING user_id
      `;

      const result = await query(sql, [userId]);
      logger.info(`User deleted: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getStats(userId) {
    try {
      const sql = `
        SELECT 
          u.role,
          COUNT(DISTINCT b.batch_id) as total_batches,
          COUNT(DISTINCT t.transaction_id) as total_transactions,
          COUNT(DISTINCT qr.report_id) as total_reports
        FROM users u
        LEFT JOIN batches b ON u.user_id = b.farmer_id
        LEFT JOIN transactions t ON u.user_id = t.from_user_id OR u.user_id = t.to_user_id
        LEFT JOIN quality_reports qr ON u.user_id = qr.inspector_id
        WHERE u.user_id = $1
        GROUP BY u.role
      `;

      const result = await query(sql, [userId]);
      return result.rows[0] || {
        role: null,
        total_batches: 0,
        total_transactions: 0,
        total_reports: 0
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Count users by role
  static async countByRole() {
    try {
      const sql = `
        SELECT role, COUNT(*) as count
        FROM users
        GROUP BY role
        ORDER BY count DESC
      `;

      const result = await query(sql);
      return result.rows;
    } catch (error) {
      logger.error('Error counting users by role:', error);
      throw error;
    }
  }

  // Check if email exists
  static async emailExists(email, excludeUserId = null) {
    try {
      let sql = `SELECT user_id FROM users WHERE email = $1`;
      const params = [email];

      if (excludeUserId) {
        sql += ` AND user_id != $2`;
        params.push(excludeUserId);
      }

      const result = await query(sql, params);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking email existence:', error);
      throw error;
    }
  }
}

module.exports = User;
