import { createPublicKey } from 'node:crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { User } from '../models/User';
import { ErrorFactory } from '../utils/ErrorFactory';

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: 'user' | 'admin';
}

/** Keys are read from the environment (populated from .env by config/env.ts). */
function readKey(name: 'JWT_PRIVATE_KEY' | 'JWT_PUBLIC_KEY'): string | undefined {
  // PEM keys stored on one line in .env use escaped newlines.
  return process.env[name]?.replace(/\\n/g, '\n') || undefined;
}

export function readPrivateKey(): string {
  const key = readKey('JWT_PRIVATE_KEY');
  if (!key) throw ErrorFactory.internal('JWT_PRIVATE_KEY is missing. Run "npm run generate:keys".');
  return key;
}

export function readPublicKey(): string {
  const key = readKey('JWT_PUBLIC_KEY');
  if (key) return key;
  // Fall back to deriving the public key from the private one.
  return createPublicKey(readPrivateKey()).export({ type: 'spki', format: 'pem' }).toString();
}

/**
 * Verifies the Bearer JWT (RS256), loads the user from the database and attaches it
 * to req.user. The role is taken from the DB, not from the token, so a demoted
 * admin loses privileges immediately.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw ErrorFactory.unauthorized('Authorization Bearer token is required.');
    const token = header.slice(7).trim();
    if (!token) throw ErrorFactory.unauthorized('JWT token is missing.');

    const payload = jwt.verify(token, readPublicKey(), { algorithms: ['RS256'] }) as AccessTokenPayload;
    if (!payload.sub) throw ErrorFactory.unauthorized('Invalid JWT payload.');

    const user = await User.findByPk(Number(payload.sub));
    if (!user) throw ErrorFactory.unauthorized('The user associated with this token no longer exists.');
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(ErrorFactory.unauthorized('Invalid or expired JWT token.'));
    }
    next(error);
  }
};

/** Out of credits => 401 Unauthorized, as required by the specification. */
export const requirePositiveCredits: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(ErrorFactory.unauthorized('Authentication is required.'));
  if (Number(req.user.credits) <= 0) {
    return next(ErrorFactory.unauthorized('No credits remaining. Ask an administrator to recharge your account.'));
  }
  next();
};

export function requireRole(role: 'admin' | 'user'): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(ErrorFactory.unauthorized('Authentication is required.'));
    if (req.user.role !== role) return next(ErrorFactory.forbidden('You do not have permission to perform this operation.'));
    next();
  };
}

export const requireAdmin = requireRole('admin');
