const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const env = require('./src/config/env');
const app = require('./src/app');
const logger = require('./src/config/logger');

const server = app.listen(env.port, () => {
  logger.info('VendorBridge API Server started', {
    port: env.port,
    environment: env.nodeEnv,
    frontendUrl: env.frontendUrl,
  });
});

const shutdown = (signal) => {
  logger.info(`Received ${signal}, closing HTTP server`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', {
    message: error.message,
    stack: error.stack,
  });
});

// Trigger reload 2
