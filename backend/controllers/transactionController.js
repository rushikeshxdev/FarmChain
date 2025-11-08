const Transaction = require('../models/Transaction');
const Batch = require('../models/Batch');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/transactions
 * @desc    Record new transaction in supply chain
 * @access  Private (Farmer/Distributor/Retailer)
 */
const createTransaction = asyncHandler(async (req, res) => {
  const {
    batchId,
    toUserId,
    transactionType,
    location,
    temperature,
    humidity,
    notes
  } = req.body;

  const fromUserId = req.user.userId;

  // Verify batch exists
  const batch = await Batch.findById(batchId);
  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found'
    });
  }

  const transactionData = {
    batch_id: batchId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    transaction_type: transactionType,
    location,
    temperature,
    humidity,
    notes
  };

  const newTransaction = await Transaction.create(transactionData);

  logger.info(`New transaction created: ${newTransaction.transaction_id} for batch ${batchId}`);

  res.status(201).json({
    status: 'success',
    message: 'Transaction recorded successfully',
    data: {
      transaction: newTransaction
    }
  });
});

/**
 * @route   GET /api/transactions
 * @desc    List transactions with filters
 * @access  Private
 */
const listTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    startDate,
    endDate,
    type,
    userId,
    batchId
  } = req.query;

  const offset = (page - 1) * limit;

  const filters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;
  if (type) filters.type = type;
  if (batchId) filters.batchId = batchId;

  // Role-based filtering
  if (req.user.role !== 'admin' && !userId) {
    filters.userId = req.user.userId;
  } else if (userId) {
    filters.userId = userId;
  }

  const { transactions, total } = await Transaction.findAll(filters, limit, offset);

  res.status(200).json({
    status: 'success',
    data: {
      transactions,
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
 * @route   GET /api/transactions/:id
 * @desc    Get transaction details
 * @access  Private
 */
const getTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const transaction = await Transaction.findById(id);

  if (!transaction) {
    return res.status(404).json({
      status: 'error',
      message: 'Transaction not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      transaction
    }
  });
});

/**
 * @route   PUT /api/transactions/:id
 * @desc    Update transaction details
 * @access  Private
 */
const updateTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { location, temperature, humidity, notes, blockchainTxHash } = req.body;

  const transaction = await Transaction.findById(id);
  if (!transaction) {
    return res.status(404).json({
      status: 'error',
      message: 'Transaction not found'
    });
  }

  // Only the transaction creator or admin can update
  if (req.user.role !== 'admin' && transaction.from_user_id !== req.user.userId) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only update your own transactions'
    });
  }

  const updateData = {};
  if (location) updateData.location = location;
  if (temperature !== undefined) updateData.temperature = temperature;
  if (humidity !== undefined) updateData.humidity = humidity;
  if (notes) updateData.notes = notes;
  if (blockchainTxHash) updateData.blockchain_tx_hash = blockchainTxHash;

  const updatedTransaction = await Transaction.update(id, updateData);

  logger.info(`Transaction updated: ${id} by user ${req.user.userId}`);

  res.status(200).json({
    status: 'success',
    message: 'Transaction updated successfully',
    data: {
      transaction: updatedTransaction
    }
  });
});

/**
 * @route   GET /api/transactions/batch/:batchId
 * @desc    Get all transactions for a batch
 * @access  Private
 */
const getBatchTransactions = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  // Verify batch exists
  const batch = await Batch.findById(batchId);
  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found'
    });
  }

  const transactions = await Transaction.findByBatchId(batchId);

  res.status(200).json({
    status: 'success',
    data: {
      batchId,
      transactions,
      count: transactions.length
    }
  });
});

module.exports = {
  createTransaction,
  listTransactions,
  getTransaction,
  updateTransaction,
  getBatchTransactions
};
