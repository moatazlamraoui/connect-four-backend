import { isValidPeriod, isWithinRange, resolveDateRange } from '../src/utils/dateRange';

describe('history date range helpers', () => {
  const now = new Date('2026-06-10T12:00:00Z');

  test('validates period syntax', () => {
    expect(isValidPeriod('24h')).toBe(true);
    expect(isValidPeriod('7d')).toBe(true);
    expect(isValidPeriod('2w')).toBe(true);
    expect(isValidPeriod('0d')).toBe(false);
    expect(isValidPeriod('7days')).toBe(false);
  });

  test('a period is resolved to "last N units until now"', () => {
    const range = resolveDateRange({ period: '24h' }, now);
    expect(range.from?.toISOString()).toBe('2026-06-09T12:00:00.000Z');
    expect(range.to?.toISOString()).toBe(now.toISOString());
  });

  test('explicit lower and upper bounds are inclusive', () => {
    const range = resolveDateRange({ from: '2026-06-01T00:00:00Z', to: '2026-06-02T00:00:00Z' }, now);
    expect(isWithinRange(new Date('2026-06-01T00:00:00Z'), range)).toBe(true);
    expect(isWithinRange(new Date('2026-06-02T00:00:00Z'), range)).toBe(true);
    expect(isWithinRange(new Date('2026-06-02T00:00:01Z'), range)).toBe(false);
  });

  test('no filter keeps everything', () => {
    expect(isWithinRange(new Date('2000-01-01'), resolveDateRange({}, now))).toBe(true);
  });
});
