import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { authenticate, requireAdmin, requirePositiveCredits } from '../src/middleware/auth';
import { User } from '../src/models/User';

jest.mock('../src/models/User', () => ({ User: { findByPk: jest.fn() } }));

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'connect4-jwt-tests-'));
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});
process.env.JWT_PRIVATE_KEY = privateKey;
process.env.JWT_PUBLIC_KEY = publicKey;

const mockUser = (overrides: Record<string, unknown> = {}) => ({
  id: 42,
  username: 'tester',
  email: 'tester@example.com',
  role: 'user',
  credits: 5,
  ...overrides
});

function makeRequest(token?: string): Request {
  return {
    header: jest.fn().mockReturnValue(token ? `Bearer ${token}` : undefined)
  } as unknown as Request;
}

const makeResponse = () => ({} as Response);

describe('authentication and authorization middleware', () => {
  afterAll(() => fs.rmSync(tempDirectory, { recursive: true, force: true }));

  test('authenticate rejects a request without a bearer token', async () => {
    const req = makeRequest();
    const next = jest.fn() as unknown as NextFunction;
    await (authenticate as any)(req, makeResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  test('authenticate verifies RS256 and attaches the database user', async () => {
    const token = jwt.sign({ role: 'user' }, privateKey, { algorithm: 'RS256', subject: '42', expiresIn: '5m' });
    (User.findByPk as jest.Mock).mockResolvedValue(mockUser());
    const req = makeRequest(token);
    const next = jest.fn() as unknown as NextFunction;
    await (authenticate as any)(req, makeResponse(), next);
    expect(req.user?.id).toBe(42);
    expect(next).toHaveBeenCalledWith();
  });

  test('requireAdmin denies a normal user', () => {
    const req = { user: mockUser() } as unknown as Request;
    const next = jest.fn() as unknown as NextFunction;
    requireAdmin(req, makeResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test('requirePositiveCredits rejects a zero-credit account with 401', () => {
    const req = { user: mockUser({ credits: 0 }) } as unknown as Request;
    const next = jest.fn() as unknown as NextFunction;
    requirePositiveCredits(req, makeResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
