const encoder = new TextEncoder();
const decoder = new TextDecoder();
const WEAK_PASSWORDS = new Set(['12345678', '123456789', '1234567890', 'password', 'password1', 'qwerty123', '11111111', '00000000', 'admin123', 'abc12345']);

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function secureRandom(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function sha256Bytes(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value));
}

export function normalizePhone(value) {
  const phone = String(value ?? '').trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new Error('请输入有效的中国大陆手机号');
  return phone;
}

export function validatePassword(value) {
  const password = String(value ?? '');
  if (password.length < 8 || password.length > 64) throw new Error('密码长度需为 8–64 位');
  if (WEAK_PASSWORDS.has(password.toLowerCase())) throw new Error('请勿使用常见弱密码');
  return password;
}

export function normalizeInviteCode(value) {
  const code = String(value ?? '').trim().toLowerCase();
  if (code.length < 4 || code.length > 64 || !/^[\p{Script=Han}a-z0-9]+$/u.test(code)) throw new Error('邀请码需为 4–64 位中文、字母或数字');
  return code;
}

export function normalizeNickname(value) {
  const nickname = String(value ?? '').trim();
  if (nickname.length > 40) throw new Error('昵称不能超过 40 个字符');
  return nickname;
}

export function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export async function hashPassword(password, { iterations = 1_000, randomBytes = secureRandom } = {}) {
  validatePassword(password);
  const salt = randomBytes(16);
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
  return { algorithm: 'pbkdf2-sha256', iterations, salt: bytesToBase64Url(salt), hash: bytesToBase64Url(hash), version: 1 };
}

export async function verifyPassword(password, stored) {
  if (!stored || stored.algorithm !== 'pbkdf2-sha256') return false;
  try {
    const key = await crypto.subtle.importKey('raw', encoder.encode(String(password ?? '')), 'PBKDF2', false, ['deriveBits']);
    const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: base64UrlToBytes(stored.salt), iterations: stored.iterations }, key, 256));
    return equalBytes(actual, base64UrlToBytes(stored.hash));
  } catch { return false; }
}

export function createSessionToken(randomBytes = secureRandom) {
  return bytesToBase64Url(randomBytes(32));
}

export async function hashToken(token) {
  return [...await sha256Bytes(String(token ?? ''))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function userSessionCookie(token, maxAge = 30 * 24 * 60 * 60) {
  return `user_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearUserSessionCookie() {
  return 'user_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export function sessionTokenFromRequest(request) {
  return request.headers.get('cookie')?.match(/(?:^|;\s*)user_session=([^;]+)/)?.[1] ?? '';
}

async function encryptionKey(secret, usage) {
  const material = await sha256Bytes(secret);
  const algorithm = usage === 'AES-GCM' ? { name: 'AES-GCM' } : { name: 'HMAC', hash: 'SHA-256' };
  return crypto.subtle.importKey('raw', material, algorithm, false, usage === 'AES-GCM' ? ['encrypt', 'decrypt'] : ['sign']);
}

export async function inviteLookupHash(code, secret) {
  if (!secret) throw new Error('缺少邀请码加密密钥');
  const key = await encryptionKey(secret, 'HMAC');
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(normalizeInviteCode(code))));
  return bytesToBase64Url(signature);
}

export async function encryptInviteCode(code, secret, randomBytes = secureRandom) {
  const iv = randomBytes(12);
  const key = await encryptionKey(secret, 'AES-GCM');
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(String(code).trim())));
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(encrypted)}`;
}

export async function decryptInviteCode(value, secret) {
  const [iv, encrypted] = String(value ?? '').split('.');
  const key = await encryptionKey(secret, 'AES-GCM');
  return decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlToBytes(iv) }, key, base64UrlToBytes(encrypted)));
}
