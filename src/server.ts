import { createApp } from './app';
import { notFoundHandler, errorHandlerMiddleware } from './middleware';
import { config } from './config';
import { logger } from './core/logger';
import { prisma } from './database/prisma';

const app = createApp();

// Add 404 handler and error handler
app.use(notFoundHandler);
app.use(errorHandlerMiddleware);

const server = app.listen(config.PORT, () => {
  console.log(`
=============================================================
  TeleWyz E-Care Backend Server is Running!
=============================================================
  Local URL:        http://localhost:${config.PORT}
  Health Check:     http://localhost:${config.PORT}/api/v1/health
  Swagger API Docs: http://localhost:${config.PORT}/api-docs
  Environment:      ${config.NODE_ENV}
=============================================================
  Server listening for incoming API requests... (Press Ctrl+C to stop)
  `);
  logger.info({ port: config.PORT, env: config.NODE_ENV }, `TeleWyz E-Care Backend listening on port ${config.PORT}`);
});

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Graceful shutdown initiated');
  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await prisma.$disconnect();
      logger.info('Database disconnected');
    } catch (err) {
      logger.error({ err }, 'Error during database disconnection');
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forceful shutdown triggered after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, server };
