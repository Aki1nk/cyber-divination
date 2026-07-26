import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone, validatePassword, normalizeInviteCode, hashPassword, verifyPassword,
  createSessionToken, hashToken, userSessionCookie, sessionTokenFromRequest,
  encryptInviteCode, decryptInviteCode, inviteLookupHash, maskPhone
} from '../../functions/_lib/user-auth.js';

test('normalizes supported account inputs and rejects invalid values', () => {
  assert.equal(normalizePhone(' 13800138000 '), '13800138000');
  assert.throws(() => normalizePhone('12800138000'), /手机号/);
  assert.equal(normalizeInviteCode('  天机Ab12  '), '天机ab12');
  assert.throws(() => normalizeInviteCode('ab-12'), /邀请码/);
  assert.equal(validatePassword('并不复杂1234'), '并不复杂1234');
  assert.throws(() => validatePassword('12345678'), /常见弱密码/);
  assert.equal(maskPhone('13800138000'), '138****8000');
});

test('hashes and verifies passwords with versioned PBKDF2 parameters', async () => {
  const stored = await hashPassword('安全密码1234', { iterations: 1000, randomBytes: () => new Uint8Array(16).fill(7) });
  assert.equal(stored.algorithm, 'pbkdf2-sha256');
  assert.equal(stored.iterations, 1000);
  assert.equal(await verifyPassword('安全密码1234', stored), true);
  assert.equal(await verifyPassword('错误密码123', stored), false);
});

test('uses the verified Pages Functions PBKDF2 cost by default', async () => {
  const stored = await hashPassword('安全密码1234', { randomBytes: () => new Uint8Array(16).fill(7) });
  assert.equal(stored.iterations, 100_000);
});

test('creates opaque session tokens and hardened cookies', async () => {
  const token = createSessionToken(() => new Uint8Array(32).fill(9));
  assert.match(token, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal((await hashToken(token)).length, 64);
  const cookie = userSessionCookie(token);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(sessionTokenFromRequest(new Request('https://example.com', { headers: { Cookie: cookie.split(';')[0] } })), token);
});

test('encrypts invite codes and derives a stable lookup hash', async () => {
  const key = 'test-only-invite-secret-that-is-long-enough';
  const encrypted = await encryptInviteCode('天机Ab12', key, () => new Uint8Array(12).fill(3));
  assert.notEqual(encrypted, '天机Ab12');
  assert.equal(await decryptInviteCode(encrypted, key), '天机Ab12');
  assert.equal(await inviteLookupHash(' 天机AB12 ', key), await inviteLookupHash('天机ab12', key));
});
