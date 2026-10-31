const config = require('./config');
const app = require('./app');
const { closePool } = require('./config/db');
const logger = require('./utils/logger');

const PORT = config.server.port;
const NODE_ENV = config.env;

const server = app.listen(PORT, () => {
  logger.info(`Fertilizer Management API server running on port ${PORT} [${NODE_ENV}]`);
});

// Graceful shutdown handling
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await closePool();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
