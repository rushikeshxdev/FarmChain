const { query } = require('../config/database');
const logger = require('../config/logger');

class Transaction {
  // Create new transaction
  static async create({
    batchId,
    fromUserId,
    toUserId,
    transactionType,
    location,
    temperature,
    humidity,
    blockchainTxHash,
    notes
  }) {
    try {
      const sql = `
        INSERT INTO transactions (
          batch_id, from_user_id, to_user_id, transaction_type,
          location, temperature, humidity, blockchain_tx_hash, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await query(sql, [
        batchId,
        fromUserId,
        toUserId,
        transactionType,
        location || null,
        temperature || null,
        humidity || null,
        blockchainTxHash || null,
        notes || null
      ]);

      logger.info(`Transaction created: ${transactionType} for batch ${batchId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Find transaction by ID
  static async findById(transactionId) {
    try {
      const sql = `
        SELECT 
          t.*,
          b.crop_type,
          b.quantity,
          b.unit,
          from_user.name as from_user_name,
          from_user.role as from_user_role,
          from_user.email as from_user_email,
          to_user.name as to_user_name,
          to_user.role as to_user_role,
          to_user.email as to_user_email
        FROM transactions t
        JOIN batches b ON t.batch_id = b.batch_id
        LEFT JOIN users from_user ON t.from_user_id = from_user.user_id
        LEFT JOIN users to_user ON t.to_user_id = to_user.user_id
        WHERE t.transaction_id = $1
      `;

      const result = await query(sql, [transactionId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  // Get all transactions for a batch
  static async findByBatchId(batchId) {
    try {
      const sql = `
        SELECT 
          t.*,
          from_user.name as from_user_name,
          from_user.role as from_user_role,
          from_user.location as from_user_location,
          to_user.name as to_user_name,
          to_user.role as to_user_role,
          to_user.location as to_user_location
        FROM transactions t
        LEFT JOIN users from_user ON t.from_user_id = from_user.user_id
        LEFT JOIN users to_user ON t.to_user_id = to_user.user_id
        WHERE t.batch_id = $1
        ORDER BY t.timestamp ASC
      `;

      const result = await query(sql, [batchId]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding transactions by batch ID:', error);
      throw error;
    }
  }

  // Get all transactions for a user
  static async findByUserId(userId, limit = 50, offset = 0) {
    try {
      const sql = `
        SELECT 
          t.*,
          b.batch_id,
          b.crop_type,
          b.quantity,
          b.unit,
          b.status,
          from_user.name as from_user_name,
          from_user.role as from_user_role,
          to_user.name as to_user_name,
          to_user.role as to_user_role
        FROM transactions t
        JOIN batches b ON t.batch_id = b.batch_id
        LEFT JOIN users from_user ON t.from_user_id = from_user.user_id
        LEFT JOIN users to_user ON t.to_user_id = to_user.user_id
        WHERE t.from_user_id = $1 OR t.to_user_id = $1
        ORDER BY t.timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await query(sql, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding transactions by user ID:', error);
      throw error;
    }
  }

  // Get all transactions with filters
  static async findAll({ transactionType, batchId, limit = 100, offset = 0 }) {
    try {
      let sql = `
        SELECT 
          t.*,
          b.crop_type,
          b.quantity,
          b.status,
          from_user.name as from_user_name,
          from_user.role as from_user_role,
          to_user.name as to_user_name,
          to_user.role as to_user_role
        FROM transactions t
        JOIN batches b ON t.batch_id = b.batch_id
        LEFT JOIN users from_user ON t.from_user_id = from_user.user_id
        LEFT JOIN users to_user ON t.to_user_id = to_user.user_id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (transactionType) {
        sql += ` AND t.transaction_type = $${paramCount}`;
        params.push(transactionType);
        paramCount++;
      }

      if (batchId) {
        sql += ` AND t.batch_id = $${paramCount}`;
        params.push(batchId);
        paramCount++;
      }

      sql += ` ORDER BY t.timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding all transactions:', error);
      throw error;
    }
  }

  // Get transaction count by type
  static async countByType() {
    try {
      const sql = `
        SELECT transaction_type, COUNT(*) as count
        FROM transactions
        GROUP BY transaction_type
        ORDER BY count DESC
      `;

      const result = await query(sql);
      return result.rows;
    } catch (error) {
      logger.error('Error counting transactions by type:', error);
      throw error;
    }
  }

  // Get recent transactions
  static async getRecent(limit = 20) {
    try {
      const sql = `
        SELECT 
          t.*,
          b.batch_id,
          b.crop_type,
          from_user.name as from_user_name,
          from_user.role as from_user_role,
          to_user.name as to_user_name,
          to_user.role as to_user_role
        FROM transactions t
        JOIN batches b ON t.batch_id = b.batch_id
        LEFT JOIN users from_user ON t.from_user_id = from_user.user_id
        LEFT JOIN users to_user ON t.to_user_id = to_user.user_id
        ORDER BY t.timestamp DESC
        LIMIT $1
      `;

      const result = await query(sql, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      throw error;
    }
  }

  // Get transaction statistics for a user
  static async getUserStats(userId) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN from_user_id = $1 THEN 1 END) as sent_transactions,
          COUNT(CASE WHEN to_user_id = $1 THEN 1 END) as received_transactions,
          COUNT(DISTINCT batch_id) as unique_batches,
          COUNT(DISTINCT transaction_type) as transaction_types
        FROM transactions
        WHERE from_user_id = $1 OR to_user_id = $1
      `;

      const result = await query(sql, [userId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user transaction stats:', error);
      throw error;
    }
  }

  // Get supply chain flow for a batch (complete journey)
  static async getSupplyChainFlow(batchId) {
    try {
      const sql = `
        SELECT 
          t.transaction_id,
          t.transaction_type,
          t.timestamp,
          t.location,
          t.temperature,
          t.humidity,
          t.notes,
          t.blockchain_tx_hash,
          from_user.user_id as from_user_id,
          from_user.name as from_user_name,
          from_user.role as from_user_role,
          from_user.location as from_location,
          to_user.user_id as to_user_id,
          to_user.name as to_user_name,
          to_user.role as to_user_role,
          to_user.location as to_location
        FROM transactions t
        LEFT JOIN users from_user ON t.from_user_id = from_user.user_id
        LEFT JOIN users to_user ON t.to_user_id = to_user.user_id
        WHERE t.batch_id = $1
        ORDER BY t.timestamp ASC
      `;

      const result = await query(sql, [batchId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting supply chain flow:', error);
      throw error;
    }
  }

  // Update transaction
  static async update(transactionId, updates) {
    try {
      const allowedFields = ['location', 'temperature', 'humidity', 'notes', 'blockchain_tx_hash'];
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(transactionId);
      const sql = `
        UPDATE transactions
        SET ${fields.join(', ')}
        WHERE transaction_id = $${paramCount}
        RETURNING *
      `;

      const result = await query(sql, values);
      logger.info(`Transaction updated: ${transactionId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating transaction:', error);
      throw error;
    }
  }

  // Delete transaction
  static async delete(transactionId) {
    try {
      const sql = `
        DELETE FROM transactions
        WHERE transaction_id = $1
        RETURNING transaction_id
      `;

      const result = await query(sql, [transactionId]);
      logger.info(`Transaction deleted: ${transactionId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Get transactions within date range
  static async findByDateRange(startDate, endDate, limit = 100) {
    try {
      const sql = `
        SELECT 
          t.*,
          b.crop_type,
          from_user.name as from_user_name,
          to_user.name as to_user_name
        FROM transactions t
        JOIN batches b ON t.batch_id = b.batch_id
        LEFT JOIN users from_user ON t.from_user_id = from_user.user_id
        LEFT JOIN users to_user ON t.to_user_id = to_user.user_id
        WHERE t.timestamp BETWEEN $1 AND $2
        ORDER BY t.timestamp DESC
        LIMIT $3
      `;

      const result = await query(sql, [startDate, endDate, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding transactions by date range:', error);
      throw error;
    }
  }
}

module.exports = Transaction;
