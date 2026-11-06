import { Response } from 'express';
import { correlationContext } from './correlation';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  details?: any;
  requestId: string;
}

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message: string = 'Request completed successfully',
  statusCode: number = 200
): Response {
  const requestId = correlationContext.getCorrelationId();
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    requestId
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR',
  details?: any
): Response {
  const requestId = correlationContext.getCorrelationId();
  const payload: ApiResponse = {
    success: false,
    message,
    code,
    details: details ?? null,
    requestId
  };
  return res.status(statusCode).json(payload);
}
