import { Request, Response, NextFunction } from 'express';
import { AppError } from '../core/errors';
import { sendError } from '../core/response';
import { logger } from '../core/logger';
import { correlationContext } from '../core/correlation';

export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const correlationId = correlationContext.getCorrelationId();

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, correlationId }, `Operational error: ${err.message}`);
    } else {
      logger.warn({
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        details: err.details,
        correlationId
      }, `Client error: ${err.message}`);
    }

    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // Handle unexpected syntax errors (e.g. malformed JSON in request body)
  if ('type' in err && (err as any).type === 'entity.parse.failed') {
    sendError(res, 'Malformed JSON in request body', 400, 'MALFORMED_JSON');
    return;
  }

  // Unexpected unhandled system errors
  logger.error({ err, correlationId }, `Unhandled system error: ${err.message}`);
  sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'An unexpected internal server error occurred' : err.message,
    500,
    'INTERNAL_SERVER_ERROR'
  );
}
