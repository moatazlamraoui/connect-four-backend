import type { Request, RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { ErrorFactory } from '../utils/ErrorFactory';

type RequestSource = 'body' | 'query' | 'params';

/** Validates one part of the request with a Zod schema and stores the parsed (typed) result. */
export function validate(schema: ZodTypeAny, source: RequestSource = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(ErrorFactory.badRequest('Request validation failed.', result.error.flatten()));
    }
    if (source === 'body') req.validatedBody = result.data;
    if (source === 'query') req.validatedQuery = result.data;
    if (source === 'params') req.validatedParams = result.data;
    next();
  };
}

/**
 * Typed accessor for the data stored by validate(). The single cast lives here;
 * routes just state the type inferred from the Zod schema they used.
 */
export function getValidated<T>(req: Request, source: RequestSource): T {
  const value = source === 'body' ? req.validatedBody : source === 'query' ? req.validatedQuery : req.validatedParams;
  if (value === undefined) throw ErrorFactory.internal(`validate('${source}') middleware was not applied to this route.`);
  return value as T;
}
