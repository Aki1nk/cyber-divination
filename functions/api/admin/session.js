import { adminCookie, clearAdminCookie, createAdminSession, verifyAdminPassword } from '../../_lib/admin-auth.js';
import { json, readJson } from '../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET) return json({ errorCode: 'admin_not_configured' }, { status: 503 });
  let body;
  try { body = await readJson(request); } catch (error) { return json({ errorCode: error.code }, { status: 400 }); }
  if (!await verifyAdminPassword(String(body.password ?? ''), env.ADMIN_PASSWORD_HASH)) return json({ errorCode: 'invalid_credentials' }, { status: 401 });
  const token = await createAdminSession(env.ADMIN_SESSION_SECRET);
  return json({ authenticated: true }, { headers: { 'Set-Cookie': adminCookie(token) } });
}

export function onRequestDelete() {
  return json({ authenticated: false }, { headers: { 'Set-Cookie': clearAdminCookie() } });
}

export function onRequest() {
  return json({ errorCode: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST, DELETE' } });
}
