// Test file to identify which module is causing the crash
console.log('Starting tests...');

try {
  console.log('1. Testing logger...');
  const logger = require('./config/logger');
  console.log('✅ Logger loaded');

  console.log('2. Testing database...');
  const db = require('./config/database');
  console.log('✅ Database config loaded');

  console.log('3. Testing models...');
  const models = require('./models');
  console.log('✅ Models loaded');

  console.log('4. Testing controllers...');
  const authController = require('./controllers/authController');
  console.log('✅ Auth controller loaded');

  console.log('5. Testing routes...');
  const authRoutes = require('./routes/authRoutes');
  console.log('✅ Auth routes loaded');

  console.log('\n✅ All modules loaded successfully!');
} catch (error) {
  console.error('\n❌ Error loading module:', error.message);
  console.error(error.stack);
  process.exit(1);
}
