import { describe, expect, it } from 'vitest';
import { decodeTokenClaims } from './decodeTokenClaims';

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const makeToken = (payload: unknown) => `header.${encodePayload(payload)}.signature`;

describe('decodeTokenClaims', () => {
  it('reads valid role and auth source claims from the JWT payload only', () => {
    expect(decodeTokenClaims(makeToken({ sub: 'alice', role: 'admin', auth_source: 'database' }))).toEqual({
      sub: 'alice',
      role: 'admin',
      auth_source: 'database',
    });
  });

  it('returns empty claims for malformed token shapes and invalid payloads without throwing', () => {
    expect(decodeTokenClaims('not-a-jwt')).toEqual({});
    expect(decodeTokenClaims('header.not valid base64.signature')).toEqual({});
    expect(decodeTokenClaims(`header.${btoa('not-json')}.signature`)).toEqual({});
  });

  it('omits missing or non-string role and auth source claims', () => {
    expect(decodeTokenClaims(makeToken({ sub: 'alice', role: 1 }))).toEqual({ sub: 'alice' });
    expect(decodeTokenClaims(makeToken({ auth_source: null }))).toEqual({});
  });
});
