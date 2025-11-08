#!/usr/bin/env node

// Capture all errors before they're handled
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

console.log('Starting server with error capture...');
require('./server.js');
