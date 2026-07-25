const encoder = new TextEncoder();

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  return base64ToBytes(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export async function verifyAdminSecret(password, expected) {
  if (!password || !expected) return false;
  return equalBytes(await sha256(String(password)), await sha256(String(expected)));
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export async function createAdminSession(secret, { now = new Date(), ttlSeconds = 8 * 60 * 60 } = {}) {
  const payload = base64Url(encoder.encode(JSON.stringify({ exp: Math.floor(now.getTime() / 1000) + ttlSeconds })));
  return `${payload}.${base64Url(await sign(payload, secret))}`;
}

export async function verifyAdminSession(token, secret, now = new Date()) {
  const [payload, signature] = String(token ?? '').split('.');
  if (!payload || !signature || !secret) return false;
  try {
    if (!equalBytes(await sign(payload, secret), fromBase64Url(signature))) return false;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return Number.isFinite(data.exp) && data.exp > Math.floor(now.getTime() / 1000);
  } catch { return false; }
}

export function adminCookie(token, maxAge = 8 * 60 * 60) {
  return `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearAdminCookie() {
  return 'admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export function sessionFromRequest(request) {
  const match = request.headers.get('cookie')?.match(/(?:^|;\s*)admin_session=([^;]+)/);
  return match?.[1] ?? '';
}
