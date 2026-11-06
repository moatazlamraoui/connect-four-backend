import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { authenticate, requireAdmin, requirePositiveCredits } from '../src/middleware/auth';
import { User } from '../src/models/User';

// The database is not needed: User.findByPk is mocked.
jest.mock('../src/models/User', () => ({ User: { findByPk: jest.fn() } }));

const rsa = () => generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});
const { privateKey, publicKey } = rsa();
process.env.JWT_PRIVATE_KEY = privateKey;
process.env.JWT_PUBLIC_KEY = publicKey;

const mockUser = (overrides: Record<string, unknown> = {}) => ({
  id: 42, username: 'tester', email: 'tester@example.com', role: 'user', credits: 5, ...overrides
});

const makeRequest = (token?: string): Request =>
  ({ header: jest.fn().mockReturnValue(token ? `Bearer ${token}` : undefined) }) as unknown as Request;
const makeResponse = () => ({}) as Response;
const makeNext = () => jest.fn() as unknown as NextFunction & jest.Mock;

describe('authenticate middleware', () => {
  test('rejects a request without a bearer token (401)', async () => {
    const next = makeNext();
    await authenticate(makeRequest(), makeResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  test('accepts a valid RS256 token and attaches the database user', async () => {
    const token = jwt.sign({ role: 'user' }, privateKey, { algorithm: 'RS256', subject: '42', expiresIn: '5m' });
    (User.findByPk as jest.Mock).mockResolvedValue(mockUser());
    const req = makeRequest(token);
    const next = makeNext();
    await authenticate(req, makeResponse(), next);
    expect(req.user?.id).toBe(42);
    expect(next).toHaveBeenCalledWith();
  });

  test('rejects an expired token (401)', async () => {
    const token = jwt.sign({ role: 'user' }, privateKey, { algorithm: 'RS256', subject: '42', expiresIn: -10 });
    const next = makeNext();
    await authenticate(makeRequest(token), makeResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  test('rejects a token signed with a different private key (401)', async () => {
    const forged = jwt.sign({ role: 'admin' }, rsa().privateKey, { algorithm: 'RS256', subject: '1', expiresIn: '5m' });
    const next = makeNext();
    await authenticate(makeRequest(forged), makeResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  test('rejects a token whose user no longer exists (401)', async () => {
    const token = jwt.sign({ role: 'user' }, privateKey, { algorithm: 'RS256', subject: '99', expiresIn: '5m' });
    (User.findByPk as jest.Mock).mockResolvedValue(null);
    const next = makeNext();
    await authenticate(makeRequest(token), makeResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

describe('role and credit middleware', () => {
  test('requireAdmin denies a normal user (403)', () => {
    const next = makeNext();
    requireAdmin({ user: mockUser() } as unknown as Request, makeResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test('requireAdmin lets an admin through', () => {
    const next = makeNext();
    requireAdmin({ user: mockUser({ role: 'admin' }) } as unknown as Request, makeResponse(), next);
    expect(next).toHaveBeenCalledWith();
  });

  test('requirePositiveCredits rejects a zero-credit account with 401', () => {
    const next = makeNext();
    requirePositiveCredits({ user: mockUser({ credits: 0 }) } as unknown as Request, makeResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  test('requirePositiveCredits accepts DECIMAL values returned as strings', () => {
    const next = makeNext();
    requirePositiveCredits({ user: mockUser({ credits: '0.05' }) } as unknown as Request, makeResponse(), next);
    expect(next).toHaveBeenCalledWith();
  });
});
