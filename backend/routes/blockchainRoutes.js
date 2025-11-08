const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validation');
const blockchainController = require('../controllers/blockchainController');
const cache = require('../middleware/cache');

/**
 * @route   GET /api/blockchain/verify/:batchId
 * @desc    Verify batch data integrity
 * @access  Public
 * @param   batchId: string
 * @returns {
 *           verified: boolean,
 *           blockchainHash: string,
 *           databaseHash: string,
 *           timestamp: date
 *         }
 */
router.get('/verify/:batchId',
    validate.batchId,
    cache.checkVerificationCache,
    blockchainController.verifyBatchIntegrity,
    cache.storeVerificationResult
);

/**
 * @route   GET /api/blockchain/history/:batchId
 * @desc    Get complete blockchain history
 * @access  Private
 * @param   batchId: string
 * @returns {
 *           history: Array,
 *           transactions: Array
 *         }
 */
router.get('/history/:batchId',
    auth.protect,
    validate.batchId,
    blockchainController.getBatchHistory
);

/**
 * @route   POST /api/blockchain/sync
 * @desc    Manually sync data to blockchain
 * @access  Private (Admin only)
 * @body    {batchIds?: Array<string>}
 * @returns {
 *           synced: number,
 *           failed: number,
 *           details: Array
 *         }
 */
router.post('/sync',
    auth.protect,
    auth.restrictTo('admin'),
    validate.blockchainSync,
    blockchainController.syncToBlockchain
);

module.exports = router;