/** Keep play-money arithmetic in integer cents, including batched updates. */
export const MAX_STAKE = 10_000;
export const MAX_ROUND_MULTIPLIER = 10_000_000;
export const DEFAULT_BALANCE = 1000;
export const MAX_MONEY = Math.floor(Number.MAX_SAFE_INTEGER / 100) / 100;

export function moneyCents(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_MONEY) return null;
  const cents = Math.round((value + Number.EPSILON) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function normalizeMoney(value: unknown, fallback = 0): number {
  const cents = moneyCents(value);
  return cents === null ? fallback : cents / 100;
}

export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

export function isCount(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isSafeInteger(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
