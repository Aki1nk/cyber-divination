const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 6 * 60 * 60 * 1000;

export function nextRetryAt(now, attempts) {
  const exponent = Math.max(0, Number(attempts) - 1);
  const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * (2 ** exponent));
  return new Date(now.getTime() + delay).toISOString();
}

export function createUploadTask({ readingId, payload, createdAt = new Date().toISOString() }) {
  if (!readingId) throw new TypeError('上传任务缺少卦录编号');
  return Object.freeze({
    id: `upload:${readingId}`,
    readingId,
    payload,
    attempts: 0,
    createdAt,
    nextAttemptAt: createdAt,
    errorCode: null
  });
}
