import { createGameSchema, historyQuerySchema, rechargeSchema, registerSchema } from '../src/schemas';

describe('request validation schemas', () => {
  test('human vs human requires the opponent e-mail', () => {
    expect(createGameSchema.safeParse({ mode: 'HUMAN_VS_HUMAN' }).success).toBe(false);
    expect(createGameSchema.safeParse({ mode: 'HUMAN_VS_HUMAN', opponentEmail: 'Bob@Example.com' }).success).toBe(true);
  });

  test('human vs AI must not carry an opponent e-mail; no time limit is allowed', () => {
    expect(createGameSchema.safeParse({ mode: 'HUMAN_VS_AI', opponentEmail: 'bob@example.com' }).success).toBe(false);
    expect(createGameSchema.safeParse({ mode: 'HUMAN_VS_AI', turnTimeSeconds: null }).success).toBe(true);
  });

  test('password policy for registration', () => {
    const base = { username: 'carlo', email: 'carlo@example.com' };
    expect(registerSchema.safeParse({ ...base, password: 'short1' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'onlyletters' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'Valid-pass-1' }).success).toBe(true);
  });

  test('admin recharge defaults to "add" and rejects a zero top-up', () => {
    const ok = rechargeSchema.safeParse({ email: 'a@b.it', credits: 5 });
    expect(ok.success && ok.data.mode).toBe('add');
    expect(rechargeSchema.safeParse({ email: 'a@b.it', credits: 0 }).success).toBe(false);
    expect(rechargeSchema.safeParse({ email: 'a@b.it', credits: 0, mode: 'set' }).success).toBe(true);
  });

  test('history query: period excludes from/to and defaults to json', () => {
    expect(historyQuerySchema.safeParse({ period: '7d', from: '2026-01-01T00:00:00Z' }).success).toBe(false);
    const parsed = historyQuerySchema.safeParse({ period: '7d' });
    expect(parsed.success && parsed.data.format).toBe('json');
  });
});
