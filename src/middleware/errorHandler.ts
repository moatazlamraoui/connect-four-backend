import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/AppError';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in (error as object)) {
    res.status(400).json({ error: 'Bad Request', message: 'Malformed JSON body.' });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.name,
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
    res.status(400).json({ error: 'Bad Request', message: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'InternalServerError', message: 'An unexpected server error occurred.' });
};
