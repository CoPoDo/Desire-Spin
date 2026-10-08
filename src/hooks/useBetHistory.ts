import { useCallback, useMemo } from 'react';
import { useStoredState } from './useStoredState';
import { isCount, isNonNegativeNumber, isRecord, moneyCents } from '../lib/accounting';

export type BetRecord = {
  id: string;
  game: string;
  bet: number;
  payout: number;
  multiplier: number;
  ts: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  /** Engine/rule revision used when this result was committed. */
  rulesVersion?: string;
};
export type BetEntry = Omit<BetRecord, 'id' | 'ts'>;
const KEY = 'bet-history';
export const CURRENT_RULES_VERSION = '2026-10-08.2';
export const MAX_HISTORY = 50;
let nextId = 0;

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 1024;
}

function normalizeEntry(value: unknown): BetEntry | null {
  if (!isRecord(value)) return null;
  const bet = moneyCents(value.bet);
  const payout = moneyCents(value.payout);
  if (bet === null || payout === null || !validText(value.game) ||
      !validText(value.serverSeedHash) || !validText(value.clientSeed) ||
      !isCount(value.nonce) || !isNonNegativeNumber(value.multiplier)) return null;
  return {
    game: value.game,
    bet: bet / 100,
    payout: payout / 100,
    multiplier: value.multiplier,
    serverSeedHash: value.serverSeedHash,
    clientSeed: value.clientSeed,
    nonce: value.nonce,
    ...(validText(value.rulesVersion) ? { rulesVersion: value.rulesVersion } : {}),
  };
}

export function normalizeHistory(value: unknown): BetRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: BetRecord[] = [];
  for (const raw of value) {
    const entry = normalizeEntry(raw);
    if (!entry || !isRecord(raw) || !validText(raw.id) || !isCount(raw.ts) ||
        raw.ts <= 0 || raw.ts > 8_640_000_000_000_000 || seen.has(raw.id)) continue;
    seen.add(raw.id);
    items.push({ ...entry, id: raw.id, ts: raw.ts });
  }
  return items.sort((a, b) => b.ts - a.ts).slice(0, MAX_HISTORY);
}

export function useBetHistory() {
  const [history, read, commit] = useStoredState(KEY, normalizeHistory);

  const record = useCallback((entry: BetEntry): BetRecord | null => {
    const normalized = normalizeEntry(entry);
    if (!normalized) return null;
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${(++nextId).toString(36)}`;
    const item: BetRecord = { ...normalized, rulesVersion: normalized.rulesVersion ?? CURRENT_RULES_VERSION, id, ts: Date.now() };
    commit([item, ...read()].slice(0, MAX_HISTORY));
    return item;
  }, [commit, read]);

  const clear = useCallback(() => commit([]), [commit]);

  return useMemo(() => ({ history, record, clear }), [history, record, clear]);
}
