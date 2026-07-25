import { sessionFromRequest, verifyAdminSession } from './admin-auth.js';
import { createAccountRepository, createInvitesRepository } from './account-repository.js';
import { json, readJson } from './http.js';
import { decryptInviteCode, encryptInviteCode, hashPassword, inviteLookupHash, normalizeInviteCode, normalizeNickname, normalizePhone, validatePassword } from './user-auth.js';

async function authorized(context) {
  return verifyAdminSession(sessionFromRequest(context.request), context.env.ADMIN_SESSION_SECRET, context.now ?? new Date());
}
function accountsOf(context) { return context.accounts ?? createAccountRepository(context.env.DB); }
function invitesOf(context) { return context.invites ?? createInvitesRepository(context.env.DB); }

export async function handleAdminUsers(context) {
  if (!await authorized(context)) return json({ errorCode: 'unauthorized' }, { status: 401 });
  const url = new URL(context.request.url);
  return json(await accountsOf(context).list({ q: url.searchParams.get('q')?.slice(0, 100) ?? '', status: url.searchParams.get('status') ?? '', page: url.searchParams.get('page'), pageSize: url.searchParams.get('pageSize') }));
}

export async function handleAdminUser(context) {
  if (!await authorized(context)) return json({ errorCode: 'unauthorized' }, { status: 401 });
  const accounts = accountsOf(context);
  if (context.request.method === 'GET') {
    const item = await accounts.get(context.userId);
    return item ? json({ item }) : json({ errorCode: 'not_found' }, { status: 404 });
  }
  if (context.request.method === 'PATCH') {
    let body;
    try { body = await readJson(context.request); } catch (error) { return json({ errorCode: error.code }, { status: 400 }); }
    let fields;
    try {
      fields = { phone: normalizePhone(body.phone), nickname: normalizeNickname(body.nickname), status: ['active', 'disabled'].includes(body.status) ? body.status : 'active', adminNote: String(body.adminNote ?? '').trim().slice(0, 500) };
    } catch (error) { return json({ errorCode: 'invalid_request', message: error.message }, { status: 400 }); }
    await accounts.updateAdmin(context.userId, fields);
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }
  return json({ errorCode: 'method_not_allowed' }, { status: 405 });
}

export async function handleTemporaryPassword(context) {
  if (!await authorized(context)) return json({ errorCode: 'unauthorized' }, { status: 401 });
  let body;
  try { body = await readJson(context.request); } catch (error) { return json({ errorCode: error.code }, { status: 400 }); }
  let password;
  try { password = validatePassword(body.password); } catch (error) { return json({ errorCode: 'invalid_request', message: error.message }, { status: 400 }); }
  await accountsOf(context).updatePassword(context.userId, await (context.passwordHasher ?? hashPassword)(password), true);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export async function handleAdminInvites(context) {
  if (!await authorized(context)) return json({ errorCode: 'unauthorized' }, { status: 401 });
  const secret = context.env.INVITE_CODE_ENCRYPTION_KEY;
  if (!secret) return json({ errorCode: 'auth_not_configured' }, { status: 503 });
  const invites = invitesOf(context);
  if (context.request.method === 'GET') {
    const rows = await invites.list();
    const items = await Promise.all(rows.map(async (row) => ({ ...row, code: await decryptInviteCode(row.encrypted_code, secret), encrypted_code: undefined, lookup_hash: undefined })));
    return json({ items });
  }
  if (context.request.method === 'POST') {
    let body;
    try { body = await readJson(context.request); } catch (error) { return json({ errorCode: error.code }, { status: 400 }); }
    let code, lookupHash;
    try { code = String(body.code ?? '').trim(); normalizeInviteCode(code); lookupHash = await inviteLookupHash(code, secret); } catch (error) { return json({ errorCode: 'invalid_request', message: error.message }, { status: 400 }); }
    if (await (invites.findByLookup?.(lookupHash) ?? invites.findUsable(lookupHash, new Date().toISOString()))) return json({ errorCode: 'invite_exists' }, { status: 409 });
    let expiresAt = null;
    if (body.expiresAt) {
      const expires = new Date(body.expiresAt);
      if (Number.isNaN(expires.getTime()) || expires <= new Date()) return json({ errorCode: 'invalid_expiration' }, { status: 400 });
      expiresAt = expires.toISOString();
    }
    const item = await invites.create({ lookupHash, encryptedCode: await encryptInviteCode(code, secret), expiresAt });
    return json({ item: { ...item, code, status: 'active', expires_at: expiresAt } }, { status: 201 });
  }
  return json({ errorCode: 'method_not_allowed' }, { status: 405 });
}

export async function handleAdminInvite(context) {
  if (!await authorized(context)) return json({ errorCode: 'unauthorized' }, { status: 401 });
  if (context.request.method !== 'DELETE') return json({ errorCode: 'method_not_allowed' }, { status: 405 });
  await invitesOf(context).revoke(context.inviteId);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
