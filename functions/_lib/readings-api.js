import { validateReadingRequest } from './validation.js';
import { classifyServerRisk } from './risk.js';
import { requestAiReading, OpenAIRequestError } from './openai.js';
import { createReadingsRepository } from './readings-repository.js';
import { json, publicReading, readJson } from './http.js';

function providerFromEnv(env) {
  return { apiKey: env.OPENAI_API_KEY, baseUrl: env.OPENAI_BASE_URL, model: env.OPENAI_MODEL };
}

async function runAi({ repository, ai, provider, row, payload, risk }) {
  await repository.markProcessing(row.id);
  try {
    const result = await ai({ ...provider, payload, risk });
    if (result.status === 'refused') {
      await repository.refuse(row.id, result.responseId);
      await repository.addAttempt(row.id, 'refused', { responseId: result.responseId });
      return json({ id: row.id, status: 'refused', aiReading: null, errorCode: 'provider_refused' });
    }
    await repository.complete(row.id, result);
    await repository.addAttempt(row.id, 'completed', { responseId: result.responseId });
    return json({ id: row.id, status: 'completed', aiReading: result.reading, errorCode: null });
  } catch (error) {
    const code = error instanceof OpenAIRequestError ? error.code : 'server_error';
    await repository.fail(row.id, code);
    await repository.addAttempt(row.id, 'failed', { errorCode: code });
    return json({ id: row.id, status: 'failed', aiReading: null, errorCode: code }, { status: 202 });
  }
}

export async function handleCreateReading(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ errorCode: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
  let body;
  try { body = await readJson(request); } catch (error) { return json({ errorCode: error.code }, { status: 400 }); }
  const validated = validateReadingRequest(body);
  if (!validated.ok) return json({ errorCode: 'invalid_request', fields: validated.errors }, { status: 400 });
  const payload = validated.value;
  const repository = context.repository ?? createReadingsRepository(env.DB);
  const existing = await repository.findByIdempotency(payload.deviceId, payload.idempotencyKey);
  if (existing) return json(publicReading(existing));
  const risk = classifyServerRisk(payload.question.text, payload.question.background);
  let row;
  try {
    row = await repository.create(payload, risk);
  } catch (error) {
    const raced = await repository.findByIdempotency(payload.deviceId, payload.idempotencyKey);
    if (raced) return json(publicReading(raced));
    throw error;
  }
  return runAi({ repository, ai: context.ai ?? requestAiReading, provider: providerFromEnv(env), row, payload, risk });
}

export async function handleRetryReading(context) {
  const { request, env, readingId } = context;
  if (request.method !== 'POST') return json({ errorCode: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
  let body;
  try { body = await readJson(request); } catch (error) { return json({ errorCode: error.code }, { status: 400 }); }
  if (typeof body.deviceId !== 'string') return json({ errorCode: 'invalid_request' }, { status: 400 });
  const repository = context.repository ?? createReadingsRepository(env.DB);
  const row = await repository.getForDevice(readingId, body.deviceId);
  if (!row) return json({ errorCode: 'not_found' }, { status: 404 });
  if (row.status === 'completed') return json(publicReading(row));
  const risk = { level: row.risk_level ?? 'normal', categories: row.riskCategories ?? [] };
  return runAi({ repository, ai: context.ai ?? requestAiReading, provider: providerFromEnv(env), row, payload: row.payload, risk });
}
