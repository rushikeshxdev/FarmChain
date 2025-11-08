const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validation');
const qualityReportController = require('../controllers/qualityReportController');

/**
 * @route   POST /api/reports
 * @desc    Submit quality inspection report
 * @access  Private (Inspector/Manufacturer only)
 * @body    {
 *            batchId: string,
 *            inspectionDate: date,
 *            pesticideUsed: boolean,
 *            organicCertified: boolean,
 *            grade: string,
 *            remarks: string,
 *            reportUrl?: string
 *          }
 * @returns {report: Object}
 */
router.post('/',
    auth.protect,
    auth.restrictTo('inspector', 'manufacturer'),
    validate.createQualityReport,
    qualityReportController.createReport
);

/**
 * @route   GET /api/reports/batch/:batchId
 * @desc    Get all reports for a batch
 * @access  Private
 * @param   batchId: string
 * @returns {reports: Array}
 */
router.get('/batch/:batchId',
    auth.protect,
    validate.batchId,
    qualityReportController.getBatchReports
);

/**
 * @route   PUT /api/reports/:id
 * @desc    Update report (inspector only, within 24hrs)
 * @access  Private (Inspector only)
 * @param   id: string
 * @body    {
 *            grade?: string,
 *            remarks?: string,
 *            pesticideUsed?: boolean,
 *            organicCertified?: boolean
 *          }
 * @returns {report: Object}
 */
router.put('/:id',
    auth.protect,
    auth.restrictTo('inspector'),
    validate.updateQualityReport,
    qualityReportController.updateReport
);

/**
 * @route   DELETE /api/reports/:id
 * @desc    Delete quality report (Admin only)
 * @access  Private (Admin only)
 * @param   id: string
 * @returns {message: string}
 */
router.delete('/:id',
    auth.protect,
    auth.restrictTo('admin'),
    qualityReportController.deleteReport
);

module.exports = router;