const { query } = require('../config/database');
const logger = require('../config/logger');
const QRCode = require('qrcode');

class Batch {
  // Generate unique batch ID
  static generateBatchId() {
    const prefix = 'AG';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900000) + 100000;
    return `${prefix}-${year}-${random}`;
  }

  // Create new batch
  static async create({
    farmerId,
    cropType,
    quantity,
    unit,
    harvestDate,
    qualityGrade,
    pesticideUsed,
    organicCertified,
    location,
    blockchainHash
  }) {
    try {
      const batchId = this.generateBatchId();
      
      const sql = `
        INSERT INTO batches (
          batch_id, farmer_id, crop_type, quantity, unit, harvest_date,
          quality_grade, pesticide_used, organic_certified, location,
          blockchain_hash, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const result = await query(sql, [
        batchId,
        farmerId,
        cropType,
        quantity,
        unit,
        harvestDate,
        qualityGrade,
        pesticideUsed || false,
        organicCertified || false,
        location || null,
        blockchainHash || null,
        'harvested'
      ]);

      logger.info(`Batch created: ${batchId} by farmer ${farmerId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating batch:', error);
      throw error;
    }
  }

  // Generate QR code for batch
  static async generateQRCode(batchId) {
    try {
      // QR code contains verification URL
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${batchId}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Update batch with QR code URL
      const sql = `
        UPDATE batches
        SET qr_code_url = $1
        WHERE batch_id = $2
        RETURNING batch_id, qr_code_url
      `;

      const result = await query(sql, [qrCodeDataUrl, batchId]);
      logger.info(`QR code generated for batch: ${batchId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Find batch by ID with farmer details
  static async findById(batchId) {
    try {
      const sql = `
        SELECT 
          b.*,
          u.name as farmer_name,
          u.email as farmer_email,
          u.phone as farmer_phone,
          u.location as farmer_location,
          u.wallet_address as farmer_wallet
        FROM batches b
        JOIN users u ON b.farmer_id = u.user_id
        WHERE b.batch_id = $1
      `;

      const result = await query(sql, [batchId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding batch by ID:', error);
      throw error;
    }
  }

  // Get all batches with filters
  static async findAll({ farmerId, status, cropType, limit = 50, offset = 0 }) {
    try {
      let sql = `
        SELECT 
          b.*,
          u.name as farmer_name,
          u.email as farmer_email,
          u.location as farmer_location
        FROM batches b
        JOIN users u ON b.farmer_id = u.user_id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (farmerId) {
        sql += ` AND b.farmer_id = $${paramCount}`;
        params.push(farmerId);
        paramCount++;
      }

      if (status) {
        sql += ` AND b.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      if (cropType) {
        sql += ` AND b.crop_type ILIKE $${paramCount}`;
        params.push(`%${cropType}%`);
        paramCount++;
      }

      sql += ` ORDER BY b.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding batches:', error);
      throw error;
    }
  }

  // Update batch status
  static async updateStatus(batchId, status, blockchainTxHash = null) {
    try {
      const sql = `
        UPDATE batches
        SET status = $1, 
            blockchain_hash = COALESCE($2, blockchain_hash),
            updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = $3
        RETURNING *
      `;

      const result = await query(sql, [status, blockchainTxHash, batchId]);
      logger.info(`Batch ${batchId} status updated to ${status}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating batch status:', error);
      throw error;
    }
  }

  // Update batch details
  static async update(batchId, updates) {
    try {
      const allowedFields = ['quality_grade', 'status', 'location', 'blockchain_hash'];
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

      values.push(batchId);
      const sql = `
        UPDATE batches
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = $${paramCount}
        RETURNING *
      `;

      const result = await query(sql, values);
      logger.info(`Batch updated: ${batchId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating batch:', error);
      throw error;
    }
  }

  // Delete batch
  static async delete(batchId) {
    try {
      const sql = `
        DELETE FROM batches
        WHERE batch_id = $1
        RETURNING batch_id
      `;

      const result = await query(sql, [batchId]);
      logger.info(`Batch deleted: ${batchId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting batch:', error);
      throw error;
    }
  }

  // Get batch statistics for a farmer
  static async getFarmerStats(farmerId) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_batches,
          SUM(quantity) as total_quantity,
          COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_batches,
          COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit_batches,
          COUNT(DISTINCT crop_type) as crop_varieties
        FROM batches
        WHERE farmer_id = $1
      `;

      const result = await query(sql, [farmerId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting farmer stats:', error);
      throw error;
    }
  }

  // Get batch count by status
  static async countByStatus() {
    try {
      const sql = `
        SELECT status, COUNT(*) as count
        FROM batches
        GROUP BY status
        ORDER BY count DESC
      `;

      const result = await query(sql);
      return result.rows;
    } catch (error) {
      logger.error('Error counting batches by status:', error);
      throw error;
    }
  }

  // Get recent batches
  static async getRecent(limit = 10) {
    try {
      const sql = `
        SELECT 
          b.*,
          u.name as farmer_name,
          u.location as farmer_location
        FROM batches b
        JOIN users u ON b.farmer_id = u.user_id
        ORDER BY b.created_at DESC
        LIMIT $1
      `;

      const result = await query(sql, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting recent batches:', error);
      throw error;
    }
  }

  // Search batches
  static async search(searchTerm, limit = 20) {
    try {
      const sql = `
        SELECT 
          b.*,
          u.name as farmer_name,
          u.location as farmer_location
        FROM batches b
        JOIN users u ON b.farmer_id = u.user_id
        WHERE 
          b.batch_id ILIKE $1 OR
          b.crop_type ILIKE $1 OR
          u.name ILIKE $1
        ORDER BY b.created_at DESC
        LIMIT $2
      `;

      const result = await query(sql, [`%${searchTerm}%`, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error searching batches:', error);
      throw error;
    }
  }

  // Get batches by crop type
  static async findByCropType(cropType, limit = 50) {
    try {
      const sql = `
        SELECT 
          b.*,
          u.name as farmer_name,
          u.location as farmer_location
        FROM batches b
        JOIN users u ON b.farmer_id = u.user_id
        WHERE b.crop_type ILIKE $1
        ORDER BY b.created_at DESC
        LIMIT $2
      `;

      const result = await query(sql, [`%${cropType}%`, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding batches by crop type:', error);
      throw error;
    }
  }

  // Check if batch exists
  static async exists(batchId) {
    try {
      const sql = `SELECT batch_id FROM batches WHERE batch_id = $1`;
      const result = await query(sql, [batchId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking batch existence:', error);
      throw error;
    }
  }
}

module.exports = Batch;
