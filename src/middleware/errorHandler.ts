import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { ErrorFactory } from '../utils/ErrorFactory';

/** Unknown route -> 404 raised through the error pipeline. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ErrorFactory.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/** Last middleware of the chain: converts every error into a JSON response. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in (error as object)) {
    res.status(400).json({ error: 'BadRequest', message: 'Malformed JSON body.' });
    return;
  }
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ error: 'PayloadTooLarge', message: 'Request body is too large.' });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {})
    });
    return;
  }
  // Sequelize constraint and validation errors are client errors, not HTTP 500s.
  if (error?.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json({ error: 'Conflict', message: 'A user with this email or username already exists.' });
    return;
  }
  if (error?.name === 'SequelizeValidationError') {
    res.status(400).json({ error: 'BadRequest', message: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'InternalServerError', message: 'An unexpected server error occurred.' });
};
