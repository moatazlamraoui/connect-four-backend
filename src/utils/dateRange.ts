/** Pure helpers used by the history route to filter moves by time. */
export interface DateRangeFilter {
  from?: string;
  to?: string;
  /** Relative period: <n>h, <n>d or <n>w (e.g. 24h, 7d, 2w). */
  period?: string;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

const PERIOD_PATTERN = /^(\d{1,4})([hdw])$/;
const UNIT_MS = { h: 3_600_000, d: 86_400_000, w: 604_800_000 } as const;

export function isValidPeriod(period: string): boolean {
  const match = PERIOD_PATTERN.exec(period);
  return !!match && Number(match[1]) > 0;
}

export function periodToMilliseconds(period: string): number {
  const match = PERIOD_PATTERN.exec(period);
  if (!match || Number(match[1]) <= 0) throw new Error(`Invalid period: ${period}`);
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
}

/** A period means "from now-period until now"; otherwise explicit lower/upper bounds are used. */
export function resolveDateRange(filter: DateRangeFilter, now: Date = new Date()): DateRange {
  if (filter.period) {
    return { from: new Date(now.getTime() - periodToMilliseconds(filter.period)), to: now };
  }
  return {
    ...(filter.from ? { from: new Date(filter.from) } : {}),
    ...(filter.to ? { to: new Date(filter.to) } : {})
  };
}

/** Bounds are inclusive. */
export function isWithinRange(date: Date, range: DateRange): boolean {
  if (range.from && date.getTime() < range.from.getTime()) return false;
  if (range.to && date.getTime() > range.to.getTime()) return false;
  return true;
}
