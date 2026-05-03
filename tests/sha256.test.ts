import { describe, expect, it } from 'vitest';
import { hmacSha256, sha256 } from '../src/lib/sha256';

const utf8 = (s: string) => new TextEncoder().encode(s);
const hex = (b: Uint8Array) =>
  Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');

describe('SHA-256', () => {
  it('matches FIPS 180-2 vector for empty string', () => {
    expect(hex(sha256(utf8('')))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
  it('matches FIPS 180-2 vector for "abc"', () => {
    expect(hex(sha256(utf8('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
  it('handles a longer string', () => {
    expect(
      hex(sha256(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))),
    ).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });
});

describe('HMAC-SHA256', () => {
  it('matches RFC 4231 test case 1', () => {
    const key = new Uint8Array(20).fill(0x0b);
    const msg = utf8('Hi There');
    expect(hex(hmacSha256(key, msg))).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    );
  });
  it('matches RFC 4231 test case 2', () => {
    const key = utf8('Jefe');
    const msg = utf8('what do ya want for nothing?');
    expect(hex(hmacSha256(key, msg))).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });
});
