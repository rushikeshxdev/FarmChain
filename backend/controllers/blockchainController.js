const { ethers } = require('ethers');
const Batch = require('../models/Batch');
const Transaction = require('../models/Transaction');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../config/blockchain');

/**
 * @route   GET /api/blockchain/verify/:batchId
 * @desc    Verify batch data integrity against blockchain
 * @access  Public
 */
const verifyBatchIntegrity = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  // Get batch from database
  const batch = await Batch.findById(batchId);
  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found'
    });
  }

  try {
    // Get batch data from smart contract
    const contract = await blockchainService.getContract();
    const [exists, currentOwner, status] = await contract.verifyBatch(batchId);

    if (!exists) {
      return res.status(200).json({
        status: 'success',
        data: {
          verified: false,
          message: 'Batch not found on blockchain',
          batchId,
          onBlockchain: false
        }
      });
    }

    // Compare data
    const isVerified = exists && batch.blockchain_hash !== null;

    res.status(200).json({
      status: 'success',
      data: {
        verified: isVerified,
        batchId,
        onBlockchain: true,
        blockchain: {
          exists,
          currentOwner,
          status
        },
        database: {
          status: batch.status,
          blockchainHash: batch.blockchain_hash
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Blockchain verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify batch on blockchain',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/blockchain/history/:batchId
 * @desc    Get complete blockchain history for a batch
 * @access  Private
 */
const getBatchHistory = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  // Get batch from database
  const batch = await Batch.findById(batchId);
  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found'
    });
  }

  try {
    // Get blockchain history
    const contract = await blockchainService.getContract();
    const ownershipHistory = await contract.getBatchHistory(batchId);
    const statusHistory = await contract.getBatchStatusHistory(batchId);

    // Get database transactions
    const transactions = await Transaction.findByBatchId(batchId);

    res.status(200).json({
      status: 'success',
      data: {
        batchId,
        blockchain: {
          ownershipHistory: ownershipHistory.map(addr => addr.toString()),
          statusHistory,
          blockchainHash: batch.blockchain_hash
        },
        database: {
          transactions,
          currentStatus: batch.status
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get blockchain history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve blockchain history',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/blockchain/sync
 * @desc    Manually sync batch data to blockchain
 * @access  Private (Admin only)
 */
const syncToBlockchain = asyncHandler(async (req, res) => {
  const { batchIds } = req.body;

  let synced = 0;
  let failed = 0;
  const results = [];

  try {
    const contract = await blockchainService.getContract();
    const signer = await blockchainService.getSigner();

    // Get batches to sync
    const batches = batchIds 
      ? await Promise.all(batchIds.map(id => Batch.findById(id)))
      : await Batch.findUnsyncedBatches();

    for (const batch of batches.filter(b => b !== null)) {
      try {
        // Check if already on blockchain
        const [exists] = await contract.verifyBatch(batch.batch_id);

        if (!exists) {
          // Add batch to blockchain
          const tx = await contract.connect(signer).addBatch(
            batch.batch_id,
            batch.crop_type,
            batch.quantity,
            batch.quality_grade
          );

          const receipt = await tx.wait();

          // Update database with blockchain hash
          await Batch.update(batch.batch_id, {
            blockchain_hash: receipt.hash
          });

          synced++;
          results.push({
            batchId: batch.batch_id,
            status: 'success',
            txHash: receipt.hash
          });

          logger.info(`Batch synced to blockchain: ${batch.batch_id}`);
        } else {
          results.push({
            batchId: batch.batch_id,
            status: 'skipped',
            message: 'Already on blockchain'
          });
        }
      } catch (error) {
        failed++;
        results.push({
          batchId: batch.batch_id,
          status: 'failed',
          error: error.message
        });
        logger.error(`Failed to sync batch ${batch.batch_id}:`, error);
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Blockchain sync completed',
      data: {
        synced,
        failed,
        total: batches.length,
        results
      }
    });
  } catch (error) {
    logger.error('Blockchain sync error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to sync to blockchain',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/blockchain/gas-price
 * @desc    Get current gas price for transactions
 * @access  Private (Admin only)
 */
const getGasPrice = asyncHandler(async (req, res) => {
  try {
    const provider = await blockchainService.getProvider();
    const feeData = await provider.getFeeData();

    res.status(200).json({
      status: 'success',
      data: {
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : null,
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : null,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get gas price:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve gas price',
      error: error.message
    });
  }
});

module.exports = {
  verifyBatchIntegrity,
  getBatchHistory,
  syncToBlockchain,
  getGasPrice
};
