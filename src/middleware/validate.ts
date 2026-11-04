import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

type RequestSource = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, source: RequestSource = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(400, 'Request validation failed.', result.error.flatten()));
    }
    if (source === 'body') req.validatedBody = result.data;
    if (source === 'query') req.validatedQuery = result.data;
    if (source === 'params') req.validatedParams = result.data;
    next();
  };
}
