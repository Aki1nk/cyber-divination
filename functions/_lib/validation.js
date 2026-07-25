const TOP_LEVEL_FIELDS = new Set(['idempotencyKey', 'deviceId', 'createdAt', 'question', 'casting', 'localReading', 'clientRisk']);
const CATEGORIES = new Set(['career', 'relationship', 'study', 'travel', 'general']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEXAGRAM_PATTERN = /^[01]{6}$/;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value, max, allowEmpty = false) {
  return typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0);
}

function validLines(lines) {
  return Array.isArray(lines) && lines.length === 6 && lines.every((line) => line === 0 || line === 1);
}

export function validateReadingRequest(input) {
  const errors = [];
  if (!isObject(input)) return { ok: false, errors: ['body'] };
  for (const field of Object.keys(input)) if (!TOP_LEVEL_FIELDS.has(field)) errors.push(`unknown:${field}`);
  if (!text(input.idempotencyKey, 160) || !/^[A-Za-z0-9:._-]+$/.test(input.idempotencyKey ?? '')) errors.push('idempotencyKey');
  if (!UUID_PATTERN.test(input.deviceId ?? '')) errors.push('deviceId');
  if (!Number.isFinite(Date.parse(input.createdAt))) errors.push('createdAt');

  const question = input.question;
  if (!isObject(question) || !text(question.text, 2000) || !text(question.background ?? '', 4000, true) || !CATEGORIES.has(question.category)) errors.push('question');

  const casting = input.casting;
  const hexagram = casting?.hexagram;
  if (!isObject(casting) || !text(casting.method, 80) || !isObject(casting.algorithm) || !isObject(casting.rawInputs)) errors.push('casting');
  if (!isObject(hexagram)
    || !HEXAGRAM_PATTERN.test(hexagram.originalId ?? '')
    || !HEXAGRAM_PATTERN.test(hexagram.mutualId ?? '')
    || !HEXAGRAM_PATTERN.test(hexagram.changedId ?? '')
    || !Number.isInteger(hexagram.movingLine) || hexagram.movingLine < 1 || hexagram.movingLine > 6
    || !validLines(hexagram.originalLines) || !validLines(hexagram.mutualLines) || !validLines(hexagram.changedLines)) errors.push('hexagram');
  if (!isObject(casting?.fiveElements) || !isObject(casting?.classics) || !Array.isArray(casting?.calculationLog)) errors.push('castingDetails');

  const local = input.localReading;
  if (!isObject(local) || !text(local.profileId, 100) || !isObject(local.questionContext) || !Array.isArray(local.sections) || local.sections.length === 0) errors.push('localReading');
  if (!isObject(input.clientRisk) || !text(input.clientRisk.level, 40) || !Array.isArray(input.clientRisk.categories)) errors.push('clientRisk');

  return errors.length ? { ok: false, errors } : { ok: true, value: structuredClone(input) };
}
