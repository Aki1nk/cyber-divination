export function normalizeQuestion(question) {
  return String(question)
    .normalize('NFKC')
    .replaceAll('。', '.')
    .replaceAll('、', ',')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([,;:])\s*/g, '$1 ')
    .trim();
}

export async function fingerprintQuestion(question, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.subtle) throw new Error('当前环境不支持本地安全摘要');
  const bytes = new TextEncoder().encode(normalizeQuestion(question));
  const digest = await cryptoProvider.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
