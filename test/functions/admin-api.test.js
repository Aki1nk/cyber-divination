import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAdminList, handleAdminDetail } from '../../functions/_lib/admin-api.js';
import { createAdminSession, adminCookie } from '../../functions/_lib/admin-auth.js';

async function authorizedRequest(url, method = 'GET') {
  const token = await createAdminSession('secret', { now: new Date('2026-07-25T00:00:00.000Z') });
  return new Request(url, { method, headers: { Cookie: adminCookie(token).split(';')[0] } });
}

test('admin list requires a valid session and forwards bounded filters', async () => {
  const unauthorized = await handleAdminList({ request: new Request('https://example.com/api/admin/readings'), env: { ADMIN_SESSION_SECRET: 'secret' }, repository: { list: async () => ({}) }, now: new Date('2026-07-25T00:00:00.000Z') });
  assert.equal(unauthorized.status, 401);
  let filters;
  const response = await handleAdminList({ request: await authorizedRequest('https://example.com/api/admin/readings?q=项目&status=completed&pageSize=500'), env: { ADMIN_SESSION_SECRET: 'secret' }, repository: { list: async (value) => { filters = value; return { items: [], total: 0, page: 1, pageSize: 100 }; } }, now: new Date('2026-07-25T00:00:00.000Z') });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(filters.pageSize, 500);
});

test('admin detail supports view and delete', async () => {
  let deleted = false;
  const repository = { get: async () => ({ id: 'reading-1', payload: { question: { text: '完整问题' } } }), delete: async () => { deleted = true; } };
  const getResponse = await handleAdminDetail({ request: await authorizedRequest('https://example.com/api/admin/readings/reading-1'), env: { ADMIN_SESSION_SECRET: 'secret' }, repository, readingId: 'reading-1', now: new Date('2026-07-25T00:00:00.000Z') });
  assert.equal((await getResponse.json()).item.payload.question.text, '完整问题');
  const deleteResponse = await handleAdminDetail({ request: await authorizedRequest('https://example.com/api/admin/readings/reading-1', 'DELETE'), env: { ADMIN_SESSION_SECRET: 'secret' }, repository, readingId: 'reading-1', now: new Date('2026-07-25T00:00:00.000Z') });
  assert.equal(deleteResponse.status, 204);
  assert.equal(deleted, true);
});
