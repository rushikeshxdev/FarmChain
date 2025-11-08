const QualityReport = require('../models/QualityReport');
const Batch = require('../models/Batch');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/reports
 * @desc    Submit quality inspection report
 * @access  Private (Inspector/Manufacturer)
 */
const createReport = asyncHandler(async (req, res) => {
  const {
    batchId,
    inspectionDate,
    pesticideUsed,
    organicCertified,
    grade,
    remarks,
    reportUrl
  } = req.body;

  const inspectorId = req.user.userId;

  // Verify batch exists
  const batch = await Batch.findById(batchId);
  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found'
    });
  }

  const reportData = {
    batch_id: batchId,
    inspector_id: inspectorId,
    inspection_date: inspectionDate || new Date(),
    pesticide_used: pesticideUsed,
    organic_certified: organicCertified,
    grade,
    remarks,
    report_url: reportUrl
  };

  const newReport = await QualityReport.create(reportData);

  // Update batch quality grade
  await Batch.update(batchId, { quality_grade: grade });

  logger.info(`Quality report created: ${newReport.report_id} for batch ${batchId}`);

  res.status(201).json({
    status: 'success',
    message: 'Quality report submitted successfully',
    data: {
      report: newReport
    }
  });
});

/**
 * @route   GET /api/reports/batch/:batchId
 * @desc    Get all quality reports for a batch
 * @access  Private
 */
const getBatchReports = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  // Verify batch exists
  const batch = await Batch.findById(batchId);
  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found'
    });
  }

  const reports = await QualityReport.findByBatchId(batchId);

  res.status(200).json({
    status: 'success',
    data: {
      batchId,
      reports,
      count: reports.length
    }
  });
});

/**
 * @route   PUT /api/reports/:id
 * @desc    Update quality report (within 24 hours)
 * @access  Private (Inspector only)
 */
const updateReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { grade, remarks, pesticideUsed, organicCertified, reportUrl } = req.body;

  const report = await QualityReport.findById(id);
  if (!report) {
    return res.status(404).json({
      status: 'error',
      message: 'Report not found'
    });
  }

  // Only the report creator can update
  if (report.inspector_id !== req.user.userId) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only update your own reports'
    });
  }

  // Check if report is within 24 hours
  const reportAge = Date.now() - new Date(report.inspection_date).getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (reportAge > twentyFourHours && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Reports can only be updated within 24 hours of creation'
    });
  }

  const updateData = {};
  if (grade) updateData.grade = grade;
  if (remarks) updateData.remarks = remarks;
  if (pesticideUsed !== undefined) updateData.pesticide_used = pesticideUsed;
  if (organicCertified !== undefined) updateData.organic_certified = organicCertified;
  if (reportUrl) updateData.report_url = reportUrl;

  const updatedReport = await QualityReport.update(id, updateData);

  // Update batch quality grade if changed
  if (grade) {
    await Batch.update(report.batch_id, { quality_grade: grade });
  }

  logger.info(`Quality report updated: ${id} by inspector ${req.user.userId}`);

  res.status(200).json({
    status: 'success',
    message: 'Report updated successfully',
    data: {
      report: updatedReport
    }
  });
});

/**
 * @route   DELETE /api/reports/:id
 * @desc    Delete quality report
 * @access  Private (Admin only)
 */
const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await QualityReport.findById(id);
  if (!report) {
    return res.status(404).json({
      status: 'error',
      message: 'Report not found'
    });
  }

  await QualityReport.delete(id);

  logger.info(`Quality report deleted: ${id} by admin ${req.user.userId}`);

  res.status(200).json({
    status: 'success',
    message: 'Report deleted successfully'
  });
});

module.exports = {
  createReport,
  getBatchReports,
  updateReport,
  deleteReport
};
