import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminSecret, createAdminSession, verifyAdminSession, adminCookie } from '../../functions/_lib/admin-auth.js';

test('admin plaintext secret is compared without direct string equality', async () => {
  assert.equal(await verifyAdminSecret('correct horse battery staple', 'correct horse battery staple'), true);
  assert.equal(await verifyAdminSecret('wrong', 'correct horse battery staple'), false);
  assert.equal(await verifyAdminSecret('密碼一二三', '密碼一二三'), true);
  assert.equal(await verifyAdminSecret('', ''), false);
  assert.equal(await verifyAdminSecret('short', 'a much longer password'), false);
});

test('signed admin session expires and cookie is hardened', async () => {
  const token = await createAdminSession('session-secret', { now: new Date('2026-07-25T00:00:00.000Z'), ttlSeconds: 60 });
  assert.equal(await verifyAdminSession(token, 'session-secret', new Date('2026-07-25T00:00:30.000Z')), true);
  assert.equal(await verifyAdminSession(token, 'session-secret', new Date('2026-07-25T00:02:00.000Z')), false);
  assert.match(adminCookie(token), /HttpOnly/);
  assert.match(adminCookie(token), /Secure/);
  assert.match(adminCookie(token), /SameSite=Strict/);
});
