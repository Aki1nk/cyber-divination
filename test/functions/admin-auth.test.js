import test from 'node:test';
import assert from 'node:assert/strict';
import { hashAdminPassword, verifyAdminPassword, createAdminSession, verifyAdminSession, adminCookie } from '../../functions/_lib/admin-auth.js';

test('admin password uses PBKDF2 and verifies without storing plaintext', async () => {
  const hash = await hashAdminPassword('correct horse battery staple', { iterations: 1000, salt: new Uint8Array(16).fill(7) });
  assert.match(hash, /^pbkdf2\$1000\$/);
  assert.equal(hash.includes('correct horse'), false);
  assert.equal(await verifyAdminPassword('correct horse battery staple', hash), true);
  assert.equal(await verifyAdminPassword('wrong', hash), false);
});

test('signed admin session expires and cookie is hardened', async () => {
  const token = await createAdminSession('session-secret', { now: new Date('2026-07-25T00:00:00.000Z'), ttlSeconds: 60 });
  assert.equal(await verifyAdminSession(token, 'session-secret', new Date('2026-07-25T00:00:30.000Z')), true);
  assert.equal(await verifyAdminSession(token, 'session-secret', new Date('2026-07-25T00:02:00.000Z')), false);
  assert.match(adminCookie(token), /HttpOnly/);
  assert.match(adminCookie(token), /Secure/);
  assert.match(adminCookie(token), /SameSite=Strict/);
});
