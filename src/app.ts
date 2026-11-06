import express, { Express } from 'express';
import {
  correlationIdMiddleware,
  securityHeadersMiddleware,
  corsMiddleware,
  jsonBodyLimitMiddleware,
  urlencodedBodyLimitMiddleware,
  requestLoggerMiddleware,
  maintenanceMiddleware,
  globalRateLimitMiddleware,
  notFoundHandler,
  errorHandlerMiddleware
} from './middleware';
import { sendSuccess } from './core/response';
import { checkDatabaseHealth } from './database/prisma';
import { cacheService } from './database/redis';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi';
import authRouter from './modules/auth/auth.routes';
import subscriberRouter from './modules/subscriber/subscriber.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import catalogueRouter from './modules/catalogue/catalogue.routes';
import reservationRouter from './modules/reservation/reservation.routes';
import simRouter from './modules/sim/sim.routes';
import mnpRouter from './modules/mnp/mnp.routes';
import paymentRouter from './modules/payment/payment.routes';
import ordersRouter from './modules/orders/orders.routes';
import notificationRouter from './modules/notifications/notification.routes';
import servicesRouter from './modules/additional/services.routes';

export function createApp(): Express {
  const app = express();

  // 1. Correlation ID & request tracing (must run first to wrap all downstream handlers)
  app.use(correlationIdMiddleware);

  // 2. Security Headers (Helmet)
  app.use(securityHeadersMiddleware);

  // 3. CORS
  app.use(corsMiddleware);

  // 4. Request Body Parsers & Size Limits
  app.use(jsonBodyLimitMiddleware);
  app.use(urlencodedBodyLimitMiddleware);

  // 5. Structured Request Logging (Pino)
  app.use(requestLoggerMiddleware);

  // 6. Maintenance Mode Check
  app.use(maintenanceMiddleware);

  // 7. Global Rate Limiter
  app.use(globalRateLimitMiddleware);

  // Health-check endpoints (public, exempt from maintenance)
  const healthHandler = async (_req: express.Request, res: express.Response) => {
    const isDbAlive = await checkDatabaseHealth();
    const isCacheAlive = cacheService.isConnected;

    sendSuccess(res, {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        database: isDbAlive ? 'UP' : 'DOWN',
        cache: isCacheAlive ? 'UP' : 'IN_MEMORY_FALLBACK'
      }
    }, 'TeleWyz E-Care service is healthy');
  };

  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // Interactive Swagger / OpenAPI Documentation
  app.get('/api/v1/docs.json', (_req, res) => res.json(openApiSpec));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // Mount API v1 Core Modules
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/subscriber', subscriberRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/catalogue', catalogueRouter);
  app.use('/api/v1/numbers', reservationRouter);
  app.use('/api/v1/sim', simRouter);
  app.use('/api/v1/mnp', mnpRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/services', servicesRouter);

  return app;
}
