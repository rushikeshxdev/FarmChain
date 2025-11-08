const { query } = require('../config/database');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/analytics/overview
 * @desc    Dashboard statistics (role-specific)
 * @access  Private
 */
const getOverview = asyncHandler(async (req, res) => {
  const { startDate, endDate, location } = req.query;
  const userId = req.user.userId;
  const role = req.user.role;

  let dateFilter = '';
  const params = [];
  let paramIndex = 1;

  if (startDate && endDate) {
    dateFilter = `AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    params.push(startDate, endDate);
    paramIndex += 2;
  }

  try {
    let batchStats, transactionStats, qualityStats;

    // Role-based queries
    if (role === 'farmer') {
      // Farmer-specific statistics
      const batchQuery = `
        SELECT 
          COUNT(*) as total_batches,
          SUM(quantity) as total_quantity,
          COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_batches,
          COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit
        FROM batches 
        WHERE farmer_id = $${paramIndex} ${dateFilter}
      `;
      params.push(userId);
      const batchResult = await query(batchQuery, params);
      batchStats = batchResult.rows[0];

      const transactionQuery = `
        SELECT COUNT(*) as total_transactions
        FROM transactions t
        JOIN batches b ON t.batch_id = b.batch_id
        WHERE b.farmer_id = $${paramIndex}
      `;
      const transactionResult = await query(transactionQuery, [userId]);
      transactionStats = transactionResult.rows[0];

    } else if (role === 'admin') {
      // Admin gets full statistics
      const batchQuery = `
        SELECT 
          COUNT(*) as total_batches,
          SUM(quantity) as total_quantity,
          COUNT(DISTINCT farmer_id) as total_farmers,
          COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_batches
        FROM batches 
        WHERE 1=1 ${dateFilter}
      `;
      const batchResult = await query(batchQuery, params);
      batchStats = batchResult.rows[0];

      const transactionQuery = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(DISTINCT batch_id) as batches_with_transactions
        FROM transactions
      `;
      const transactionResult = await query(transactionQuery);
      transactionStats = transactionResult.rows[0];

      const qualityQuery = `
        SELECT 
          COUNT(*) as total_reports,
          AVG(CASE grade 
            WHEN 'A+' THEN 5 
            WHEN 'A' THEN 4 
            WHEN 'B+' THEN 3 
            WHEN 'B' THEN 2 
            ELSE 1 
          END) as avg_quality_score
        FROM quality_reports
      `;
      const qualityResult = await query(qualityQuery);
      qualityStats = qualityResult.rows[0];
    } else {
      // Distributor/Retailer statistics
      const transactionQuery = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(DISTINCT batch_id) as unique_batches
        FROM transactions
        WHERE from_user_id = $1 OR to_user_id = $1
      `;
      const transactionResult = await query(transactionQuery, [userId]);
      transactionStats = transactionResult.rows[0];

      batchStats = { message: 'Limited access for this role' };
    }

    res.status(200).json({
      status: 'success',
      data: {
        batches: batchStats || {},
        transactions: transactionStats || {},
        quality: qualityStats || {},
        role,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    logger.error('Analytics overview error:', error);
    throw error;
  }
});

/**
 * @route   GET /api/analytics/farmers
 * @desc    Farmer performance metrics
 * @access  Private (Admin/Farmers)
 */
const getFarmerMetrics = asyncHandler(async (req, res) => {
  const { farmerId, startDate, endDate } = req.query;
  const userId = req.user.userId;
  const role = req.user.role;

  // Non-admins can only see their own metrics
  const targetFarmerId = role === 'admin' ? (farmerId || null) : userId;

  let dateFilter = '';
  const params = [];
  let paramIndex = 1;

  if (targetFarmerId) {
    params.push(targetFarmerId);
    paramIndex++;
  }

  if (startDate && endDate) {
    dateFilter = `AND b.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    params.push(startDate, endDate);
  }

  try {
    const metricsQuery = `
      SELECT 
        u.user_id,
        u.name as farmer_name,
        u.location,
        COUNT(DISTINCT b.batch_id) as total_batches,
        SUM(b.quantity) as total_quantity,
        COUNT(DISTINCT b.crop_type) as crop_varieties,
        AVG(CASE b.quality_grade 
          WHEN 'A+' THEN 5 
          WHEN 'A' THEN 4 
          WHEN 'B+' THEN 3 
          WHEN 'B' THEN 2 
          ELSE 1 
        END) as avg_quality_score,
        COUNT(CASE WHEN b.organic_certified = true THEN 1 END) as organic_batches,
        COUNT(t.transaction_id) as total_transactions
      FROM users u
      LEFT JOIN batches b ON u.user_id = b.farmer_id
      LEFT JOIN transactions t ON b.batch_id = t.batch_id
      WHERE u.role = 'farmer'
      ${targetFarmerId ? 'AND u.user_id = $1' : ''}
      ${dateFilter}
      GROUP BY u.user_id, u.name, u.location
      ORDER BY total_batches DESC
    `;

    const result = await query(metricsQuery, params);

    res.status(200).json({
      status: 'success',
      data: {
        metrics: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('Farmer metrics error:', error);
    throw error;
  }
});

/**
 * @route   GET /api/analytics/supply-chain
 * @desc    Supply chain flow metrics
 * @access  Private
 */
const getSupplyChainMetrics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE t.timestamp BETWEEN $1 AND $2';
    params.push(startDate, endDate);
  }

  try {
    // Transaction flow analysis
    const flowQuery = `
      SELECT 
        t.transaction_type,
        COUNT(*) as count,
        COUNT(DISTINCT t.batch_id) as unique_batches,
        AVG(t.temperature) as avg_temperature,
        AVG(t.humidity) as avg_humidity
      FROM transactions t
      ${dateFilter}
      GROUP BY t.transaction_type
      ORDER BY count DESC
    `;
    const flowResult = await query(flowQuery, params);

    // Batch status distribution
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM batches
      GROUP BY status
      ORDER BY count DESC
    `;
    const statusResult = await query(statusQuery);

    // Average transit time
    const transitQuery = `
      SELECT 
        b.batch_id,
        b.created_at as start_time,
        MAX(t.timestamp) as last_transaction,
        EXTRACT(EPOCH FROM (MAX(t.timestamp) - b.created_at))/3600 as hours_in_transit
      FROM batches b
      JOIN transactions t ON b.batch_id = t.batch_id
      WHERE b.status IN ('in_transit', 'delivered')
      GROUP BY b.batch_id, b.created_at
    `;
    const transitResult = await query(transitQuery);
    const avgTransitTime = transitResult.rows.length > 0
      ? transitResult.rows.reduce((sum, row) => sum + parseFloat(row.hours_in_transit), 0) / transitResult.rows.length
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        transactionFlow: flowResult.rows,
        batchStatus: statusResult.rows,
        averageTransitTimeHours: avgTransitTime.toFixed(2),
        totalBatchesInTransit: transitResult.rows.length
      }
    });
  } catch (error) {
    logger.error('Supply chain metrics error:', error);
    throw error;
  }
});

/**
 * @route   GET /api/analytics/quality
 * @desc    Quality trends over time
 * @access  Private
 */
const getQualityTrends = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE qr.inspection_date BETWEEN $1 AND $2';
    params.push(startDate, endDate);
  }

  try {
    // Quality grade distribution
    const gradeQuery = `
      SELECT 
        grade,
        COUNT(*) as count,
        COUNT(CASE WHEN organic_certified = true THEN 1 END) as organic_count,
        COUNT(CASE WHEN pesticide_used = false THEN 1 END) as pesticide_free_count
      FROM quality_reports
      ${dateFilter}
      GROUP BY grade
      ORDER BY grade DESC
    `;
    const gradeResult = await query(gradeQuery, params);

    // Quality trends by month
    const trendQuery = `
      SELECT 
        DATE_TRUNC('month', inspection_date) as month,
        AVG(CASE grade 
          WHEN 'A+' THEN 5 
          WHEN 'A' THEN 4 
          WHEN 'B+' THEN 3 
          WHEN 'B' THEN 2 
          ELSE 1 
        END) as avg_score,
        COUNT(*) as report_count
      FROM quality_reports
      ${dateFilter}
      GROUP BY DATE_TRUNC('month', inspection_date)
      ORDER BY month DESC
      LIMIT 12
    `;
    const trendResult = await query(trendQuery, params);

    // Top performing farmers by quality
    const topFarmersQuery = `
      SELECT 
        u.name as farmer_name,
        u.location,
        AVG(CASE qr.grade 
          WHEN 'A+' THEN 5 
          WHEN 'A' THEN 4 
          WHEN 'B+' THEN 3 
          WHEN 'B' THEN 2 
          ELSE 1 
        END) as avg_quality_score,
        COUNT(DISTINCT b.batch_id) as batches_inspected
      FROM quality_reports qr
      JOIN batches b ON qr.batch_id = b.batch_id
      JOIN users u ON b.farmer_id = u.user_id
      GROUP BY u.user_id, u.name, u.location
      HAVING COUNT(DISTINCT b.batch_id) >= 3
      ORDER BY avg_quality_score DESC
      LIMIT 10
    `;
    const topFarmersResult = await query(topFarmersQuery);

    res.status(200).json({
      status: 'success',
      data: {
        gradeDistribution: gradeResult.rows,
        monthlyTrends: trendResult.rows,
        topPerformingFarmers: topFarmersResult.rows
      }
    });
  } catch (error) {
    logger.error('Quality trends error:', error);
    throw error;
  }
});

/**
 * @route   POST /api/analytics/export
 * @desc    Export analytics report
 * @access  Private (Admin only)
 */
const exportReport = asyncHandler(async (req, res) => {
  const { reportType, format, startDate, endDate } = req.body;

  // This is a placeholder - in production, you'd generate CSV/PDF
  try {
    const reportData = {
      generated_at: new Date().toISOString(),
      generated_by: req.user.email,
      report_type: reportType,
      format: format || 'json',
      date_range: { startDate, endDate },
      message: 'Report generation feature - implement CSV/PDF export as needed'
    };

    logger.info(`Analytics report exported by ${req.user.email}: ${reportType}`);

    res.status(200).json({
      status: 'success',
      message: 'Report generated successfully',
      data: reportData
    });
  } catch (error) {
    logger.error('Export report error:', error);
    throw error;
  }
});

module.exports = {
  getOverview,
  getFarmerMetrics,
  getSupplyChainMetrics,
  getQualityTrends,
  exportReport
};
