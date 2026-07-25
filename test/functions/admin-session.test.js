import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../../functions/api/admin/session.js';

function loginRequest(password) {
  return new Request('https://example.com/api/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
}

test('admin session authenticates with ADMIN_PASSWORD', async () => {
  const response = await onRequestPost({
    request: loginRequest('密碼一二三'),
    env: { ADMIN_PASSWORD: '密碼一二三', ADMIN_SESSION_SECRET: 'session-secret' }
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: true });
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=Strict/);
});

test('admin session rejects an incorrect plaintext password', async () => {
  const response = await onRequestPost({
    request: loginRequest('wrong'),
    env: { ADMIN_PASSWORD: 'expected', ADMIN_SESSION_SECRET: 'session-secret' }
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { errorCode: 'invalid_credentials' });
});

test('admin session requires both plaintext password and session secret', async () => {
  const missingPassword = await onRequestPost({ request: loginRequest('expected'), env: { ADMIN_SESSION_SECRET: 'session-secret' } });
  assert.equal(missingPassword.status, 503);
  assert.deepEqual(await missingPassword.json(), { errorCode: 'admin_not_configured' });

  const missingSession = await onRequestPost({ request: loginRequest('expected'), env: { ADMIN_PASSWORD: 'expected' } });
  assert.equal(missingSession.status, 503);
  assert.deepEqual(await missingSession.json(), { errorCode: 'admin_not_configured' });
});
