const { query } = require('../config/database');
const logger = require('../config/logger');

class QualityReport {
  // Create new quality report
  static async create({
    batchId,
    inspectorId,
    inspectionDate,
    pesticideUsed,
    organicCertified,
    grade,
    moistureContent,
    contamination,
    remarks,
    reportUrl
  }) {
    try {
      const sql = `
        INSERT INTO quality_reports (
          batch_id, inspector_id, inspection_date, pesticide_used,
          organic_certified, grade, moisture_content, contamination,
          remarks, report_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await query(sql, [
        batchId,
        inspectorId,
        inspectionDate,
        pesticideUsed || false,
        organicCertified || false,
        grade,
        moistureContent || null,
        contamination || null,
        remarks || null,
        reportUrl || null
      ]);

      logger.info(`Quality report created for batch: ${batchId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating quality report:', error);
      throw error;
    }
  }

  // Find report by ID
  static async findById(reportId) {
    try {
      const sql = `
        SELECT 
          qr.*,
          b.batch_id,
          b.crop_type,
          b.quantity,
          b.farmer_id,
          u.name as inspector_name,
          u.email as inspector_email,
          u.role as inspector_role,
          farmer.name as farmer_name
        FROM quality_reports qr
        JOIN batches b ON qr.batch_id = b.batch_id
        JOIN users u ON qr.inspector_id = u.user_id
        JOIN users farmer ON b.farmer_id = farmer.user_id
        WHERE qr.report_id = $1
      `;

      const result = await query(sql, [reportId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding report by ID:', error);
      throw error;
    }
  }

  // Get all reports for a batch
  static async findByBatchId(batchId) {
    try {
      const sql = `
        SELECT 
          qr.*,
          u.name as inspector_name,
          u.email as inspector_email,
          u.role as inspector_role,
          u.phone as inspector_phone
        FROM quality_reports qr
        JOIN users u ON qr.inspector_id = u.user_id
        WHERE qr.batch_id = $1
        ORDER BY qr.inspection_date DESC
      `;

      const result = await query(sql, [batchId]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding reports by batch ID:', error);
      throw error;
    }
  }

  // Get all reports by inspector
  static async findByInspectorId(inspectorId, limit = 50, offset = 0) {
    try {
      const sql = `
        SELECT 
          qr.*,
          b.batch_id,
          b.crop_type,
          b.quantity,
          b.status,
          farmer.name as farmer_name,
          farmer.location as farmer_location
        FROM quality_reports qr
        JOIN batches b ON qr.batch_id = b.batch_id
        JOIN users farmer ON b.farmer_id = farmer.user_id
        WHERE qr.inspector_id = $1
        ORDER BY qr.inspection_date DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await query(sql, [inspectorId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding reports by inspector ID:', error);
      throw error;
    }
  }

  // Get all reports with filters
  static async findAll({ grade, organicCertified, limit = 100, offset = 0 }) {
    try {
      let sql = `
        SELECT 
          qr.*,
          b.batch_id,
          b.crop_type,
          b.farmer_id,
          u.name as inspector_name,
          farmer.name as farmer_name
        FROM quality_reports qr
        JOIN batches b ON qr.batch_id = b.batch_id
        JOIN users u ON qr.inspector_id = u.user_id
        JOIN users farmer ON b.farmer_id = farmer.user_id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (grade) {
        sql += ` AND qr.grade = $${paramCount}`;
        params.push(grade);
        paramCount++;
      }

      if (organicCertified !== undefined) {
        sql += ` AND qr.organic_certified = $${paramCount}`;
        params.push(organicCertified);
        paramCount++;
      }

      sql += ` ORDER BY qr.inspection_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding all reports:', error);
      throw error;
    }
  }

  // Update report
  static async update(reportId, updates) {
    try {
      const allowedFields = [
        'pesticide_used',
        'organic_certified',
        'grade',
        'moisture_content',
        'contamination',
        'remarks',
        'report_url'
      ];

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

      values.push(reportId);
      const sql = `
        UPDATE quality_reports
        SET ${fields.join(', ')}
        WHERE report_id = $${paramCount}
        RETURNING *
      `;

      const result = await query(sql, values);
      logger.info(`Quality report updated: ${reportId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating quality report:', error);
      throw error;
    }
  }

  // Delete report
  static async delete(reportId) {
    try {
      const sql = `
        DELETE FROM quality_reports
        WHERE report_id = $1
        RETURNING report_id
      `;

      const result = await query(sql, [reportId]);
      logger.info(`Quality report deleted: ${reportId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting quality report:', error);
      throw error;
    }
  }

  // Get report statistics
  static async getStats() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_reports,
          COUNT(CASE WHEN organic_certified = true THEN 1 END) as organic_reports,
          COUNT(CASE WHEN pesticide_used = true THEN 1 END) as pesticide_reports,
          COUNT(CASE WHEN grade IN ('A+', 'A') THEN 1 END) as premium_grade_reports,
          AVG(moisture_content) as avg_moisture_content
        FROM quality_reports
      `;

      const result = await query(sql);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting report stats:', error);
      throw error;
    }
  }

  // Get report count by grade
  static async countByGrade() {
    try {
      const sql = `
        SELECT grade, COUNT(*) as count
        FROM quality_reports
        GROUP BY grade
        ORDER BY count DESC
      `;

      const result = await query(sql);
      return result.rows;
    } catch (error) {
      logger.error('Error counting reports by grade:', error);
      throw error;
    }
  }

  // Get recent reports
  static async getRecent(limit = 10) {
    try {
      const sql = `
        SELECT 
          qr.*,
          b.batch_id,
          b.crop_type,
          u.name as inspector_name,
          farmer.name as farmer_name
        FROM quality_reports qr
        JOIN batches b ON qr.batch_id = b.batch_id
        JOIN users u ON qr.inspector_id = u.user_id
        JOIN users farmer ON b.farmer_id = farmer.user_id
        ORDER BY qr.inspection_date DESC
        LIMIT $1
      `;

      const result = await query(sql, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting recent reports:', error);
      throw error;
    }
  }

  // Get inspector statistics
  static async getInspectorStats(inspectorId) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_inspections,
          COUNT(CASE WHEN organic_certified = true THEN 1 END) as organic_certified_count,
          COUNT(DISTINCT batch_id) as unique_batches,
          AVG(CASE 
            WHEN grade = 'A+' THEN 5
            WHEN grade = 'A' THEN 4
            WHEN grade = 'B+' THEN 3
            WHEN grade = 'B' THEN 2
            WHEN grade = 'C' THEN 1
          END) as avg_grade_score
        FROM quality_reports
        WHERE inspector_id = $1
      `;

      const result = await query(sql, [inspectorId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting inspector stats:', error);
      throw error;
    }
  }

  // Check if batch has quality report
  static async batchHasReport(batchId) {
    try {
      const sql = `SELECT report_id FROM quality_reports WHERE batch_id = $1 LIMIT 1`;
      const result = await query(sql, [batchId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking batch report existence:', error);
      throw error;
    }
  }
}

module.exports = QualityReport;
