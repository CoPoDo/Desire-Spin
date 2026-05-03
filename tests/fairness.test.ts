import { describe, expect, it } from 'vitest';
import { createRng, generateClientSeed, generateServerSeed, sha256Hex } from '../src/lib/fairness';

describe('Provably-fair RNG', () => {
  it('is deterministic for fixed (server, client, nonce)', () => {
    const a = createRng('a-server-seed', 'client-seed', 7);
    const b = createRng('a-server-seed', 'client-seed', 7);
    for (let i = 0; i < 50; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('yields different streams for different nonces', () => {
    const a = createRng('s', 'c', 1);
    const b = createRng('s', 'c', 2);
    expect(a.next()).not.toBe(b.next());
  });

  it('yields different streams for different client seeds', () => {
    const a = createRng('s', 'c1', 1);
    const b = createRng('s', 'c2', 1);
    expect(a.next()).not.toBe(b.next());
  });

  it('floats are in [0, 1)', () => {
    const r = createRng('s', 'c', 1);
    for (let i = 0; i < 200; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('weighted picks roughly respect weights', () => {
    const counts = [0, 0, 0];
    const r = createRng('weight', 'test', 0);
    const N = 9000;
    for (let i = 0; i < N; i++) counts[r.weighted([1, 2, 3])]!++;
    // Expected ratios 1/6, 2/6, 3/6 — allow ±3% absolute slack.
    expect(counts[0]! / N).toBeGreaterThan(1 / 6 - 0.03);
    expect(counts[0]! / N).toBeLessThan(1 / 6 + 0.03);
    expect(counts[2]! / N).toBeGreaterThan(3 / 6 - 0.03);
    expect(counts[2]! / N).toBeLessThan(3 / 6 + 0.03);
  });

  it('generated seeds have expected lengths and are hex', () => {
    expect(generateServerSeed()).toMatch(/^[0-9a-f]{64}$/);
    expect(generateClientSeed()).toMatch(/^[0-9a-f]{16}$/);
  });

  it('sha256Hex matches known empty-string vector', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});
