import { AppError } from './AppError';

/**
 * Factory Pattern: one place that knows which HTTP status / error code belongs
 * to each kind of failure. Services and middleware ask the factory for an error
 * and throw it; the central error-handling middleware turns it into a response.
 */
export class ErrorFactory {
  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, message, 'BadRequest', details);
  }
  static unauthorized(message: string): AppError {
    return new AppError(401, message, 'Unauthorized');
  }
  static paymentRequired(message: string): AppError {
    return new AppError(402, message, 'PaymentRequired');
  }
  static forbidden(message: string): AppError {
    return new AppError(403, message, 'Forbidden');
  }
  static notFound(message: string): AppError {
    return new AppError(404, message, 'NotFound');
  }
  static conflict(message: string): AppError {
    return new AppError(409, message, 'Conflict');
  }
  static internal(message: string): AppError {
    return new AppError(500, message, 'InternalServerError');
  }
}
