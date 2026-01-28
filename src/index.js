import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';
import { initializeDatabase, closeDatabase } from './db/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

console.log('Starting server...');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Initialize database
try {
  initializeDatabase();
  console.log('Database initialized');
} catch (err) {
  console.error('Database initialization failed:', err);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(join(__dirname, '../public')));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Mount routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(config.server.port, () => {
  logger.info(`Server started`, {
    port: config.server.port,
    environment: config.server.nodeEnv,
    company: config.business.companyName,
  });

  if (config.server.isDevelopment) {
    logger.info('Endpoints available:');
    logger.info(`  Health check: http://localhost:${config.server.port}/health`);
    logger.info(`  Admin panel: http://localhost:${config.server.port}/admin`);
    logger.info(`  Vapi webhooks: http://localhost:${config.server.port}/webhooks/vapi/*`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    closeDatabase();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    closeDatabase();
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
