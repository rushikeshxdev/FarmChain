// Export all models from a single entry point
const User = require('./User');
const Batch = require('./Batch');
const Transaction = require('./Transaction');
const QualityReport = require('./QualityReport');

module.exports = {
  User,
  Batch,
  Transaction,
  QualityReport
};
