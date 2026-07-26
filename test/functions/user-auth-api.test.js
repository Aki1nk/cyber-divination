import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRegister, handleLogin, handleSession, handlePassword, handleAccount } from '../../functions/_lib/user-auth-api.js';

function post(path, body, cookie = '') {
  return new Request(`https://example.com${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
}

test('register consumes a valid invite and starts a session', async () => {
  let registration;
  const response = await handleRegister({
    request: post('/api/auth/register', { phone: '13800138000', password: '安全密码1234', nickname: '小林', inviteCode: '天机AB12' }),
    env: { INVITE_CODE_ENCRYPTION_KEY: 'invite-secret' },
    invites: { findUsable: async () => ({ id: 'invite-1' }) },
    accounts: { findByPhone: async () => null, register: async (value) => { registration = value; } },
    passwordHasher: async () => ({ algorithm: 'pbkdf2-sha256', iterations: 1, salt: 's', hash: 'h', version: 1 }),
    tokenFactory: () => 'session-token', tokenHasher: async () => 'session-hash', idFactory: () => 'user-1', now: new Date('2026-07-25T00:00:00Z')
  });
  assert.equal(response.status, 201);
  assert.match(response.headers.get('set-cookie'), /user_session=session-token/);
  assert.equal(registration.inviteId, 'invite-1');
  assert.equal((await response.json()).user.phoneMasked, '138****8000');
});

test('register preserves the Web Crypto receiver when generating a user id', async () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const originalCrypto = globalThis.crypto;
  const brandedCrypto = {
    subtle: originalCrypto.subtle,
    getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
    randomUUID() {
      assert.equal(this, brandedCrypto);
      return 'user-1';
    }
  };
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: brandedCrypto });

  try {
    const response = await handleRegister({
      request: post('/api/auth/register', { phone: '13900000026', password: 'SafePass1234', inviteCode: 'FIXTEST2026' }),
      env: { INVITE_CODE_ENCRYPTION_KEY: 'invite-secret' },
      invites: { findUsable: async () => ({ id: 'invite-1' }) },
      accounts: { findByPhone: async () => null, register: async () => {} },
      passwordHasher: async () => ({ algorithm: 'pbkdf2-sha256', iterations: 1, salt: 's', hash: 'h', version: 1 }),
      tokenFactory: () => 'session-token',
      tokenHasher: async () => 'session-hash',
      now: new Date('2026-07-26T00:00:00Z')
    });
    assert.equal(response.status, 201);
  } finally {
    Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
  }
});

test('login uses generic errors and throttles blocked identities', async () => {
  const blocked = await handleLogin({ request: post('/api/auth/login', { phone: '13800138000', password: '错误密码1234' }), env: {}, attempts: { isBlocked: async () => true }, now: new Date() });
  assert.equal(blocked.status, 429);
  assert.deepEqual(await blocked.json(), { errorCode: 'too_many_attempts' });

  const attempts = [];
  const invalid = await handleLogin({
    request: post('/api/auth/login', { phone: '13800138000', password: '错误密码1234' }), env: {},
    accounts: { findByPhone: async () => null }, attempts: { isBlocked: async () => false, record: async (value) => attempts.push(value) },
    passwordVerifier: async () => false, now: new Date()
  });
  assert.equal(invalid.status, 401);
  assert.deepEqual(await invalid.json(), { errorCode: 'invalid_credentials' });
  assert.equal(attempts[0].succeeded, false);
});

test('session, password change and deletion require the current user', async () => {
  const user = { id: 'user-1', phone: '13800138000', nickname: '', must_change_password: 1 };
  const session = await handleSession({ request: new Request('https://example.com/api/auth/session'), user });
  assert.equal((await session.json()).user.mustChangePassword, true);

  let changed = false;
  const password = await handlePassword({ request: post('/api/auth/password', { currentPassword: '临时密码1234', newPassword: '全新密码1234' }), user, accounts: { updatePassword: async () => { changed = true; } }, passwordVerifier: async () => true, passwordHasher: async () => ({}) });
  assert.equal(password.status, 204);
  assert.equal(changed, true);

  let deleted = false;
  const account = await handleAccount({ request: new Request('https://example.com/api/auth/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: '全新密码1234', confirmation: '注销账户' }) }), user, accounts: { deleteAccount: async () => { deleted = true; } }, passwordVerifier: async () => true });
  assert.equal(account.status, 204);
  assert.equal(deleted, true);
});
