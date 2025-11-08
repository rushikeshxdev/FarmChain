const Batch = require('../models/Batch');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/batches
 * @desc    Create a new batch
 * @access  Private (Farmer only)
 */
const createBatch = asyncHandler(async (req, res) => {
  const {
    cropType,
    quantity,
    unit,
    harvestDate,
    qualityGrade,
    location,
    pesticideUsed,
    organicCertified
  } = req.body;

  const farmerId = req.user.userId;

  // Generate batch ID
  const batchId = await Batch.generateBatchId();

  const batchData = {
    batch_id: batchId,
    farmer_id: farmerId,
    crop_type: cropType,
    quantity,
    unit: unit || 'kg',
    harvest_date: harvestDate,
    quality_grade: qualityGrade,
    location,
    pesticide_used: pesticideUsed || false,
    organic_certified: organicCertified || false,
    status: 'harvested'
  };

  const newBatch = await Batch.create(batchData);

  logger.info(`New batch created: ${batchId} by farmer ${farmerId}`);

  res.status(201).json({
    status: 'success',
    message: 'Batch created successfully',
    data: {
      batch: newBatch
    }
  });
});

/**
 * @route   GET /api/batches
 * @desc    List batches with pagination and filters
 * @access  Private
 */
const listBatches = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    startDate,
    endDate,
    farmerId,
    location
  } = req.query;

  const offset = (page - 1) * limit;

  // Build filters based on user role
  const filters = {};
  if (status) filters.status = status;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;
  if (location) filters.location = location;

  // Farmers can only see their own batches
  if (req.user.role === 'farmer') {
    filters.farmerId = req.user.userId;
  } else if (farmerId) {
    filters.farmerId = farmerId;
  }

  const { batches, total } = await Batch.findAll(filters, limit, offset);

  res.status(200).json({
    status: 'success',
    data: {
      batches,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

/**
 * @route   GET /api/batches/:id
 * @desc    Get batch details
 * @access  Private
 */
const getBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const batch = await Batch.findById(id);

  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found'
    });
  }

  // Get complete history
  const history = await Batch.getHistory(id);

  res.status(200).json({
    status: 'success',
    data: {
      batch,
      history
    }
  });
});

/**
 * @route   PUT /api/batches/:id
 * @desc    Update batch information
 * @access  Private (Farmer/Distributor/Retailer)
 */
const updateBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, location, qualityGrade } = req.body;

  // Check if batch exists
  const batch = await Batch.findById(id);
  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found'
    });
  }

  // Farmers can only update their own batches
  if (req.user.role === 'farmer' && batch.farmer_id !== req.user.userId) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only update your own batches'
    });
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (location) updateData.location = location;
  if (qualityGrade) updateData.quality_grade = qualityGrade;

  const updatedBatch = await Batch.update(id, updateData);

  logger.info(`Batch updated: ${id} by user ${req.user.userId}`);

  res.status(200).json({
    status: 'success',
    message: 'Batch updated successfully',
    data: {
      batch: updatedBatch
    }
  });
});

/**
 * @route   DELETE /api/batches/:id
 * @desc    Delete batch (soft delete)
 * @access  Private (Admin only)
 */
const deleteBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const batch = await Batch.findById(id);
  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found'
    });
  }

  await Batch.delete(id);

  logger.info(`Batch deleted: ${id} by admin ${req.user.userId}`);

  res.status(200).json({
    status: 'success',
    message: 'Batch deleted successfully'
  });
});

/**
 * @route   POST /api/batches/:id/verify
 * @desc    Verify batch quality
 * @access  Private (Inspector/Manufacturer)
 */
const verifyBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { verified, notes } = req.body;

  const batch = await Batch.findById(id);
  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found'
    });
  }

  // Update verification status
  const updateData = {
    verified: verified !== undefined ? verified : true,
    verified_by: req.user.userId,
    verification_notes: notes,
    verified_at: new Date()
  };

  const updatedBatch = await Batch.update(id, updateData);

  logger.info(`Batch verified: ${id} by ${req.user.role} ${req.user.userId}`);

  res.status(200).json({
    status: 'success',
    message: 'Batch verification completed',
    data: {
      batch: updatedBatch
    }
  });
});

module.exports = {
  createBatch,
  listBatches,
  getBatch,
  updateBatch,
  deleteBatch,
  verifyBatch
};
