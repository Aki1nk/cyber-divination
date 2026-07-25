import { json, readJson } from './http.js';
import { createAccountRepository, createInvitesRepository, createLoginAttemptsRepository } from './account-repository.js';
import { clearUserSessionCookie, createSessionToken, hashPassword, hashToken, inviteLookupHash, maskPhone, normalizeNickname, normalizePhone, sessionTokenFromRequest, userSessionCookie, validatePassword, verifyPassword } from './user-auth.js';

const DAY = 86_400_000;

function publicUser(user) {
  return { id: user.id, phoneMasked: maskPhone(user.phone), nickname: user.nickname ?? '', mustChangePassword: Boolean(user.must_change_password) };
}

function passwordRecord(user) {
  return { algorithm: user.password_algorithm, iterations: user.password_iterations, salt: user.password_salt, hash: user.password_hash, version: user.password_version };
}

function clientIp(request) { return request.headers.get('CF-Connecting-IP') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'; }
function nowOf(context) { return context.now instanceof Date ? context.now : new Date(); }
function accountsOf(context) { return context.accounts ?? createAccountRepository(context.env.DB); }

export async function getAuthenticatedUser(context) {
  if (context.user) return context.user;
  const token = sessionTokenFromRequest(context.request);
  if (!token) return null;
  return accountsOf(context).findSession(await hashToken(token), nowOf(context).toISOString());
}

export async function handleRegister(context) {
  if (context.request.method !== 'POST') return json({ errorCode: 'method_not_allowed' }, { status: 405 });
  if (!context.env.INVITE_CODE_ENCRYPTION_KEY) return json({ errorCode: 'auth_not_configured' }, { status: 503 });
  let body;
  try { body = await readJson(context.request); } catch (error) { return json({ errorCode: error.code }, { status: 400 }); }
  let phone, password, nickname, lookupHash;
  try {
    phone = normalizePhone(body.phone); password = validatePassword(body.password); nickname = normalizeNickname(body.nickname);
    lookupHash = await inviteLookupHash(body.inviteCode, context.env.INVITE_CODE_ENCRYPTION_KEY);
  } catch (error) { return json({ errorCode: 'invalid_request', message: error.message }, { status: 400 }); }
  const accounts = accountsOf(context);
  if (await accounts.findByPhone(phone)) return json({ errorCode: 'phone_in_use' }, { status: 409 });
  const invites = context.invites ?? createInvitesRepository(context.env.DB);
  const invite = await invites.findUsable(lookupHash, nowOf(context).toISOString());
  if (!invite) return json({ errorCode: 'invalid_invite' }, { status: 400 });
  const current = nowOf(context);
  const token = (context.tokenFactory ?? createSessionToken)();
  const user = { id: (context.idFactory ?? crypto.randomUUID)(), phone, nickname, createdAt: current.toISOString() };
  try {
    await accounts.register({ user, password: await (context.passwordHasher ?? hashPassword)(password), inviteId: invite.id, session: { tokenHash: await (context.tokenHasher ?? hashToken)(token), createdAt: current.toISOString(), expiresAt: new Date(current.getTime() + 30 * DAY).toISOString() } });
  } catch (error) { return json({ errorCode: error.code === 'invalid_invite' ? 'invalid_invite' : 'registration_failed' }, { status: error.code === 'invalid_invite' ? 400 : 500 }); }
  return json({ user: publicUser({ ...user, must_change_password: 0 }) }, { status: 201, headers: { 'Set-Cookie': userSessionCookie(token) } });
}

export async function handleLogin(context) {
  if (context.request.method !== 'POST') return json({ errorCode: 'method_not_allowed' }, { status: 405 });
  let body;
  try { body = await readJson(context.request); } catch (error) { return json({ errorCode: error.code }, { status: 400 }); }
  let phone;
  try { phone = normalizePhone(body.phone); } catch { phone = String(body.phone ?? '').trim(); }
  const phoneHash = await hashToken(phone.toLowerCase());
  const ipHash = await hashToken(clientIp(context.request));
  const current = nowOf(context);
  const attempts = context.attempts ?? createLoginAttemptsRepository(context.env.DB);
  if (await attempts.isBlocked({ phoneHash, ipHash, since: new Date(current.getTime() - 15 * 60_000).toISOString() })) return json({ errorCode: 'too_many_attempts' }, { status: 429 });
  const accounts = accountsOf(context);
  const user = /^1[3-9]\d{9}$/.test(phone) ? await accounts.findByPhone(phone) : null;
  const valid = user?.status === 'active' && await (context.passwordVerifier ?? verifyPassword)(String(body.password ?? ''), passwordRecord(user));
  await attempts.record({ phoneHash, ipHash, succeeded: Boolean(valid) });
  if (!valid) return json({ errorCode: 'invalid_credentials' }, { status: 401 });
  const token = (context.tokenFactory ?? createSessionToken)();
  await accounts.createSession({ tokenHash: await (context.tokenHasher ?? hashToken)(token), userId: user.id, createdAt: current.toISOString(), expiresAt: new Date(current.getTime() + 30 * DAY).toISOString() });
  return json({ user: publicUser(user) }, { headers: { 'Set-Cookie': userSessionCookie(token) } });
}

export async function handleSession(context) {
  if (context.request.method === 'GET') {
    const user = await getAuthenticatedUser(context);
    return user ? json({ user: publicUser(user) }) : json({ errorCode: 'unauthorized' }, { status: 401 });
  }
  if (context.request.method === 'DELETE') {
    const token = sessionTokenFromRequest(context.request);
    if (token) await accountsOf(context).deleteSession(await hashToken(token));
    return json({ authenticated: false }, { headers: { 'Set-Cookie': clearUserSessionCookie() } });
  }
  return json({ errorCode: 'method_not_allowed' }, { status: 405 });
}

export async function handlePassword(context) {
  const user = await getAuthenticatedUser(context);
  if (!user) return json({ errorCode: 'unauthorized' }, { status: 401 });
  let body;
  try { body = await readJson(context.request); } catch (error) { return json({ errorCode: error.code }, { status: 400 }); }
  if (!await (context.passwordVerifier ?? verifyPassword)(String(body.currentPassword ?? ''), passwordRecord(user))) return json({ errorCode: 'invalid_credentials' }, { status: 401 });
  let next;
  try { next = validatePassword(body.newPassword); } catch (error) { return json({ errorCode: 'invalid_request', message: error.message }, { status: 400 }); }
  await accountsOf(context).updatePassword(user.id, await (context.passwordHasher ?? hashPassword)(next), false);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export async function handleAccount(context) {
  const user = await getAuthenticatedUser(context);
  if (!user) return json({ errorCode: 'unauthorized' }, { status: 401 });
  let body;
  try { body = await readJson(context.request); } catch (error) { return json({ errorCode: error.code }, { status: 400 }); }
  if (body.confirmation !== '注销账户') return json({ errorCode: 'confirmation_required' }, { status: 400 });
  if (!await (context.passwordVerifier ?? verifyPassword)(String(body.currentPassword ?? ''), passwordRecord(user))) return json({ errorCode: 'invalid_credentials' }, { status: 401 });
  await accountsOf(context).deleteAccount(user.id);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'Set-Cookie': clearUserSessionCookie() } });
}

