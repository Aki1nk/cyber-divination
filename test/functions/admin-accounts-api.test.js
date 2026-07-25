import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminSession, adminCookie } from '../../functions/_lib/admin-auth.js';
import { handleAdminUsers, handleAdminUser, handleTemporaryPassword, handleAdminInvites, handleAdminInvite } from '../../functions/_lib/admin-accounts-api.js';

async function request(path, method = 'GET', body) {
  const token = await createAdminSession('secret', { now: new Date('2026-07-25T00:00:00Z') });
  return new Request(`https://example.com${path}`, { method, headers: { Cookie: adminCookie(token).split(';')[0], ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

test('admin manages users and private notes', async () => {
  const list = await handleAdminUsers({ request: await request('/api/admin/users'), env: { ADMIN_SESSION_SECRET: 'secret' }, accounts: { list: async () => ({ items: [], total: 0, page: 1, pageSize: 25 }) }, now: new Date('2026-07-25T00:00:00Z') });
  assert.equal(list.status, 200);
  let update;
  const patched = await handleAdminUser({ request: await request('/api/admin/users/u1', 'PATCH', { phone: '13800138000', nickname: '林', status: 'disabled', adminNote: '内部备注' }), env: { ADMIN_SESSION_SECRET: 'secret' }, accounts: { get: async () => ({ id: 'u1' }), updateAdmin: async (_id, value) => { update = value; } }, userId: 'u1', now: new Date('2026-07-25T00:00:00Z') });
  assert.equal(patched.status, 204);
  assert.equal(update.adminNote, '内部备注');
});

test('admin creates, views and revokes encrypted invites', async () => {
  let created;
  const context = { env: { ADMIN_SESSION_SECRET: 'secret', INVITE_CODE_ENCRYPTION_KEY: 'invite-secret' }, now: new Date('2026-07-25T00:00:00Z') };
  const response = await handleAdminInvites({ ...context, request: await request('/api/admin/invites', 'POST', { code: '天机AB12' }), invites: { findUsable: async () => null, create: async (value) => { created = value; return { id: 'i1', createdAt: context.now.toISOString() }; } } });
  assert.equal(response.status, 201);
  assert.notEqual(created.encryptedCode, '天机AB12');
  let revoked = false;
  const deleted = await handleAdminInvite({ ...context, request: await request('/api/admin/invites/i1', 'DELETE'), inviteId: 'i1', invites: { revoke: async () => { revoked = true; } } });
  assert.equal(deleted.status, 204);
  assert.equal(revoked, true);
});

test('admin can assign a temporary password that forces change', async () => {
  let mustChange;
  const response = await handleTemporaryPassword({ request: await request('/api/admin/users/u1/temporary-password', 'POST', { password: '临时安全1234' }), env: { ADMIN_SESSION_SECRET: 'secret' }, accounts: { updatePassword: async (_id, _password, value) => { mustChange = value; } }, passwordHasher: async () => ({}), userId: 'u1', now: new Date('2026-07-25T00:00:00Z') });
  assert.equal(response.status, 204);
  assert.equal(mustChange, true);
});
