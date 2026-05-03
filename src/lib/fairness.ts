/**
 * Provably-fair RNG mirroring Stake's published algorithm.
 *
 *   bytes = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}:${cursor}`)
 *
 * Each HMAC produces 32 bytes → 8 floats (each 4 bytes / 2^32) in [0, 1).
 * When all 8 floats are consumed, cursor increments and a fresh HMAC is taken.
 *
 * This matches Stake / BC.Game / Roobet conventions and lets users verify any
 * past spin from (serverSeed, clientSeed, nonce).
 *
 * Implementation: WebCrypto + a sync HMAC fallback (sha256-hmac.ts) so the
 * engine can run synchronously inside React render cycles. Both produce
 * identical output.
 */

import { hmacSha256, sha256 } from './sha256';

export type Rng = {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [0, max). */
  nextInt(max: number): number;
  /** Index into a weights[] array, weighted by relative weights. */
  weighted(weights: number[]): number;
  /** Snapshot of internal cursor state, useful for re-derivation/tests. */
  state(): { nonce: number; cursor: number; floatIdx: number };
};

export type Seeds = {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
};

/** 32-hex-char random server seed, generated client side. */
export function generateServerSeed(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(bytes);
}

/** 16-hex-char client seed default; user can edit. */
export function generateClientSeed(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(bytes);
}

export function sha256Hex(input: string): string {
  return bytesToHex(sha256(utf8Bytes(input)));
}

function utf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Create a deterministic RNG bound to (serverSeed, clientSeed, nonce).
 * `nonce` is the bet number; `cursor` advances internally as floats are drawn.
 */
export function createRng(serverSeed: string, clientSeed: string, nonce: number): Rng {
  let cursor = 0;
  let floatIdx = 0;
  let buffer: Float64Array | null = null;

  const refill = () => {
    const message = `${clientSeed}:${nonce}:${cursor}`;
    const bytes = hmacSha256(utf8Bytes(serverSeed), utf8Bytes(message));
    const floats = new Float64Array(8);
    for (let i = 0; i < 8; i++) {
      const o = i * 4;
      // big-endian uint32 → divide by 2^32 → float in [0, 1)
      const u32 =
        (bytes[o] << 24) |
        (bytes[o + 1] << 16) |
        (bytes[o + 2] << 8) |
        bytes[o + 3];
      // shift right 0 to coerce unsigned, then divide
      floats[i] = (u32 >>> 0) / 0x1_0000_0000;
    }
    buffer = floats;
    floatIdx = 0;
    cursor++;
  };

  const next = (): number => {
    if (!buffer || floatIdx >= 8) refill();
    return buffer![floatIdx++]!;
  };

  return {
    next,
    nextInt(max: number) {
      if (max <= 0) return 0;
      return Math.floor(next() * max);
    },
    weighted(weights: number[]) {
      let total = 0;
      for (const w of weights) total += w;
      if (total <= 0) return 0;
      let r = next() * total;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i]!;
        if (r < 0) return i;
      }
      return weights.length - 1;
    },
    state() {
      return { nonce, cursor, floatIdx };
    },
  };
}
