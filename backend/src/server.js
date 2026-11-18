const config = require('./config');
const app = require('./app');
const { closePool } = require('./config/db');
const logger = require('./utils/logger');

const PORT = config.server.port;
const NODE_ENV = config.env;

const server = app.listen(PORT, () => {
  logger.info(`Fertilizer Management API server running on port ${PORT} [${NODE_ENV}]`);
});

// Dual-port listener: also listen on port 5001 so any client or deployed preview calling localhost:5001 works immediately
let server5001;
if (PORT !== 5001) {
  server5001 = app.listen(5001, () => {
    logger.info(`Fertilizer Management API fallback server also running on port 5001 [${NODE_ENV}]`);
  });
  server5001.on('error', (err) => {
    if (err.code !== 'EADDRINUSE') {
      logger.warn(`Port 5001 listener error: ${err.message}`);
    }
  });
}

// Graceful shutdown handling
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    if (server5001) server5001.close();
    logger.info('HTTP server closed.');
    await closePool();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
