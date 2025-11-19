import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal server error';
  let details;
  let isNoisy = false;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    details = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    isNoisy = true;
  } else if (err.isOperational) {
    statusCode = err.statusCode || 400;
    message = err.message;
    details = err.meta;
    isNoisy = true;
  } else {
    message = err.message || message;
  }

  if (isNoisy) {
    logger.warn(`${statusCode} ${message}`, details ? { details } : undefined);
  } else {
    logger.error(message, {
      statusCode,
      details,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { errors: details }),
  });
}
