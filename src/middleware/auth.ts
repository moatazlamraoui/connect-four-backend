import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: 'user' | 'admin';
}

function readKeyFromEnvironment(name: 'JWT_PRIVATE_KEY' | 'JWT_PUBLIC_KEY'): string {
  const envPath = path.resolve(process.cwd(), '.env');
  const fileValue = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath))[name] : undefined;
  const value = process.env[name] || fileValue;
  if (!value) throw new AppError(500, `${name} is missing from .env. Run npm run generate:keys.`);
  // dotenv commonly reads escaped newlines as real newlines; this also supports raw escaped values.
  return value.replace(/\\n/g, '\n');
}

export function readPublicKey(): string {
  return readKeyFromEnvironment('JWT_PUBLIC_KEY');
}

export function readPrivateKey(): string {
  return readKeyFromEnvironment('JWT_PRIVATE_KEY');
}

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new AppError(401, 'Authorization Bearer token is required.');
    const token = header.slice(7).trim();
    if (!token) throw new AppError(401, 'JWT token is missing.');

    const payload = jwt.verify(token, readPublicKey(), { algorithms: ['RS256'] }) as AccessTokenPayload;
    if (!payload.sub) throw new AppError(401, 'Invalid JWT payload.');

    const user = await User.findByPk(Number(payload.sub));
    if (!user) throw new AppError(401, 'The user associated with this token no longer exists.');
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'Invalid or expired JWT token.'));
    }
    next(error);
  }
};

/**
 * Requests that are not needed to finish an already active match require
 * a strictly positive credit balance. Active-game move/state/abandon routes
 * intentionally do not use this middleware (see the assignment's exception).
 */
export const requirePositiveCredits: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new AppError(401, 'Authentication is required.'));
  if (Number(req.user.credits) <= 0) return next(new AppError(401, 'No credits remaining. Ask an administrator to recharge your account.'));
  next();
};

export function requireRole(role: 'admin' | 'user'): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentication is required.'));
    if (req.user.role !== role) return next(new AppError(403, 'You do not have permission to perform this operation.'));
    next();
  };
}

export const requireAdmin = requireRole('admin');
