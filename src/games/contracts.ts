/** Stable contracts shared by game math, playback, tests, and audit tooling. */

export type GameReferenceKind = 'provider' | 'stake-original' | 'canonical';
export type FidelityLevel = 'documented' | 'observable' | 'calibrated';

export type GameReferenceManifest = {
  id: string;
  route: string;
  title: string;
  kind: GameReferenceKind;
  referenceTitle: string;
  referenceVersion: string;
  auditedAt: string;
  sources: readonly string[];
  targetRtp?: number;
  mechanics: readonly string[];
  controls: readonly string[];
  fidelity: FidelityLevel;
  proprietaryGaps?: readonly string[];
  multiplayerMode?: 'none' | 'local-simulation';
};

export type GameEvent =
  | { type: 'roundStarted'; at: number; wager: number }
  | { type: 'reelsStarted'; at: number; reels: number }
  | { type: 'reelStopped'; at: number; reel: number }
  | { type: 'anticipationStarted'; at: number; reason: string }
  | { type: 'anticipationEnded'; at: number }
  | { type: 'winEvaluated'; at: number; amount: number; multiplier: number }
  | { type: 'cascadeStarted'; at: number; index: number }
  | { type: 'respinStarted'; at: number; remaining: number }
  | { type: 'featureTriggered'; at: number; feature: string }
  | { type: 'featureStep'; at: number; feature: string; step: number }
  | { type: 'payoutCommitted'; at: number; amount: number }
  | { type: 'roundEnded'; at: number; payout: number };

export type RoundOutcome<TState = unknown> = {
  gameId: string;
  wager: number;
  payout: number;
  multiplier: number;
  finalState: TState;
  events: readonly GameEvent[];
  replay: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  };
};

/** Event playback must be chronological and commit a payout exactly once. */
export function validateEventTimeline(events: readonly GameEvent[]): string[] {
  const errors: string[] = [];
  for (let i = 1; i < events.length; i++) {
    if (events[i]!.at < events[i - 1]!.at) errors.push(`event ${i} is out of order`);
  }
  const commits = events.filter((event) => event.type === 'payoutCommitted');
  if (commits.length !== 1) errors.push(`expected one payout commit, received ${commits.length}`);
  if (events[0]?.type !== 'roundStarted') errors.push('timeline must begin with roundStarted');
  if (events.at(-1)?.type !== 'roundEnded') errors.push('timeline must end with roundEnded');
  return errors;
}
