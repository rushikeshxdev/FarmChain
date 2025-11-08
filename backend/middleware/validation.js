const { body, param, query, validationResult } = require('express-validator');

// Validation Result Handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// User Registration Validation
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['farmer', 'distributor', 'retailer', 'admin']).withMessage('Invalid role'),
  
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be less than 200 characters'),
  
  validate
];

// Login Validation
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  validate
];

// Batch Creation Validation
const validateBatchCreation = [
  body('cropType')
    .trim()
    .notEmpty().withMessage('Crop type is required')
    .isLength({ min: 2, max: 100 }).withMessage('Crop type must be between 2-100 characters'),
  
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  
  body('unit')
    .trim()
    .notEmpty().withMessage('Unit is required')
    .isIn(['kg', 'ton', 'quintal', 'pieces']).withMessage('Invalid unit'),
  
  body('harvestDate')
    .notEmpty().withMessage('Harvest date is required')
    .isISO8601().withMessage('Invalid date format'),
  
  body('qualityGrade')
    .trim()
    .notEmpty().withMessage('Quality grade is required')
    .isIn(['A+', 'A', 'B+', 'B', 'C']).withMessage('Invalid quality grade'),
  
  body('pesticideUsed')
    .optional()
    .isBoolean().withMessage('Pesticide used must be boolean'),
  
  body('organicCertified')
    .optional()
    .isBoolean().withMessage('Organic certified must be boolean'),
  
  validate
];

// Batch Update Validation
const validateBatchUpdate = [
  body('status')
    .optional()
    .isIn(['harvested', 'in_transit', 'delivered', 'processed', 'sold', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('qualityGrade')
    .optional()
    .isIn(['A+', 'A', 'B+', 'B', 'C']).withMessage('Invalid quality grade'),
  
  validate
];

// Transaction Creation Validation
const validateTransaction = [
  body('batchId')
    .trim()
    .notEmpty().withMessage('Batch ID is required'),
  
  body('toUserId')
    .notEmpty().withMessage('Recipient user ID is required')
    .isInt({ min: 1 }).withMessage('Invalid user ID'),
  
  body('transactionType')
    .trim()
    .notEmpty().withMessage('Transaction type is required')
    .isIn(['transfer', 'pickup', 'delivery', 'inspection', 'sale'])
    .withMessage('Invalid transaction type'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be less than 200 characters'),
  
  body('temperature')
    .optional()
    .isFloat().withMessage('Temperature must be a number'),
  
  body('humidity')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Humidity must be between 0-100'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  
  validate
];

// Quality Report Validation
const validateQualityReport = [
  body('batchId')
    .trim()
    .notEmpty().withMessage('Batch ID is required'),
  
  body('inspectionDate')
    .notEmpty().withMessage('Inspection date is required')
    .isISO8601().withMessage('Invalid date format'),
  
  body('pesticideUsed')
    .isBoolean().withMessage('Pesticide used must be boolean'),
  
  body('organicCertified')
    .isBoolean().withMessage('Organic certified must be boolean'),
  
  body('grade')
    .trim()
    .notEmpty().withMessage('Grade is required')
    .isIn(['A+', 'A', 'B+', 'B', 'C']).withMessage('Invalid grade'),
  
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Remarks must be less than 1000 characters'),
  
  validate
];

// ID Parameter Validation
const validateId = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  
  validate
];

// Batch ID Parameter Validation
const validateBatchId = [
  param('batchId')
    .trim()
    .notEmpty().withMessage('Batch ID is required')
    .matches(/^[A-Z]{2}-\d{4}-\d{3,6}$/).withMessage('Invalid batch ID format'),
  
  validate
];

// Additional validation functions for routes
const profileUpdate = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().matches(/^[0-9]{10}$/),
  body('location').optional().trim().isLength({ max: 200 }),
  validate
];

const refreshToken = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  validate
];

const createBatch = validateBatchCreation;
const listBatches = [validate];
const updateBatch = validateBatchUpdate;
const qualityInspection = validateQualityReport;

const createTransaction = validateTransaction;
const listTransactions = [validate];
const transferOwnership = [
  body('toUserId').isInt({ min: 1 }).withMessage('Invalid user ID'),
  validate
];
const transactionId = [
  param('transactionId').isInt({ min: 1 }).withMessage('Invalid transaction ID'),
  validate
];

const createQualityReport = validateQualityReport;
const updateQualityReport = validateQualityReport;

const dateRangeQuery = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate
];

const farmerMetrics = [
  param('farmerId').optional().isInt({ min: 1 }),
  validate
];

const supplyChainMetrics = [validate];
const exportReport = [
  query('reportType').optional().isIn(['batches', 'transactions', 'quality']),
  validate
];

const blockchainSync = [
  body('batchIds').isArray().withMessage('Batch IDs must be an array'),
  validate
];

const verifyMultipleBatches = [
  body('batchIds').isArray().withMessage('Batch IDs must be an array'),
  validate
];

const listUsers = [
  query('role').optional().isIn(['farmer', 'distributor', 'retailer', 'inspector', 'manufacturer', 'admin']),
  validate
];

const userId = [
  param('userId').isInt({ min: 1 }).withMessage('Invalid user ID'),
  validate
];

const updateUser = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['farmer', 'distributor', 'retailer', 'inspector', 'manufacturer', 'admin']),
  validate
];

const batchId = validateBatchId;

module.exports = {
  validate,
  validateRegistration,
  validateLogin,
  validateBatchCreation,
  validateBatchUpdate,
  validateTransaction,
  validateQualityReport,
  validateId,
  validateBatchId,
  // Aliases for routes
  registration: validateRegistration,
  login: validateLogin,
  profileUpdate,
  refreshToken,
  createBatch,
  listBatches,
  updateBatch,
  qualityInspection,
  createTransaction,
  listTransactions,
  transferOwnership,
  transactionId,
  createQualityReport,
  updateQualityReport,
  dateRangeQuery,
  farmerMetrics,
  supplyChainMetrics,
  exportReport,
  blockchainSync,
  verifyMultipleBatches,
  listUsers,
  userId,
  updateUser,
  batchId
};
