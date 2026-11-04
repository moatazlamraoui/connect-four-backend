import type { User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      validatedBody?: unknown;
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}
export {};
