import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAuth } from '../../src/ui/views/auth.js';
import { renderAccount } from '../../src/ui/views/account.js';
import { parseRoute, routeForSession } from '../../src/app/router.js';

test('auth view offers login and invitation-only registration', () => {
  const html = renderAuth({ mode: 'register' });
  assert.match(html, /data-auth-mode="login"/);
  assert.match(html, /data-auth-mode="register"/);
  assert.match(html, /name="inviteCode"/);
  assert.match(html, /name="phone"/);
});

test('account view supports password change, logout and self deletion', () => {
  const html = renderAccount({ phoneMasked: '138****8000', nickname: '小林', mustChangePassword: true });
  assert.match(html, /必须先修改密码/);
  assert.match(html, /data-change-password/);
  assert.match(html, /data-user-logout/);
  assert.match(html, /data-delete-account/);
});

test('router gates the application by user session', () => {
  assert.equal(parseRoute('#/login').name, 'login');
  assert.equal(parseRoute('#/account').name, 'account');
  assert.equal(routeForSession({ name: 'ask' }, null).name, 'login');
  assert.equal(routeForSession({ name: 'privacy' }, null).name, 'privacy');
  assert.equal(routeForSession({ name: 'ask' }, { mustChangePassword: true }).name, 'account');
});
