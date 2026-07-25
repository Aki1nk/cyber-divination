import { AI_READING_JSON_SCHEMA } from './ai-schema.js';
import { buildOpenAIInput } from './prompt.js';

const REQUIRED_FIELDS = AI_READING_JSON_SCHEMA.required;
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-5.4-mini';

export class OpenAIRequestError extends Error {
  constructor(code) {
    super(`OpenAI request failed: ${code}`);
    this.name = 'OpenAIRequestError';
    this.code = code;
  }
}

function providerCode(status) {
  if (status === 401 || status === 403) return 'provider_auth_failed';
  if (status === 429) return 'provider_rate_limited';
  if (status >= 500) return 'provider_unavailable';
  return 'provider_rejected_request';
}

function providerUrls(value) {
  const raw = String(value || DEFAULT_BASE_URL).trim();
  let url;
  try { url = new URL(raw); } catch { throw new OpenAIRequestError('provider_not_configured'); }
  if (url.protocol !== 'https:') throw new OpenAIRequestError('provider_not_configured');
  url.hash = '';
  url.search = '';
  const pathname = url.pathname.replace(/\/+$/, '').replace(/\/(responses|chat\/completions)$/, '') || '/';
  url.pathname = pathname;
  const base = url.toString().replace(/\/$/, '');
  return Object.freeze({
    responses: `${base}/responses`,
    chatCompletions: `${base}/chat/completions`,
    isRelay: base !== DEFAULT_BASE_URL
  });
}

function parseReading(text) {
  let reading;
  try { reading = JSON.parse(text); } catch { throw new OpenAIRequestError('provider_invalid_output'); }
  if (!reading || REQUIRED_FIELDS.some((field) => !(field in reading))) throw new OpenAIRequestError('provider_invalid_output');
  return reading;
}

function parseResponsesOutput(response) {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'refusal') return { refused: true };
      if (content.type === 'output_text' && typeof content.text === 'string') {
        return { reading: parseReading(content.text) };
      }
    }
  }
  throw new OpenAIRequestError('provider_invalid_output');
}

function parseChatCompletionsOutput(response) {
  const message = response.choices?.[0]?.message;
  if (message?.refusal) return { refused: true };
  if (typeof message?.content !== 'string') throw new OpenAIRequestError('provider_invalid_output');
  return { reading: parseReading(message.content) };
}

function canFallbackToChatCompletions(status, isRelay) {
  return isRelay && status !== 401 && status !== 403 && status !== 429 && status >= 400;
}

function chatMessages(payload, risk) {
  return buildOpenAIInput(payload, risk).map(({ role, content }) => ({
    role,
    content: content.map((item) => item.text).join('\n')
  }));
}

async function requestChatCompletions({ requestUrl, apiKey, model, payload, risk, fetchImpl, signal }) {
  let response;
  try {
    response = await fetchImpl(requestUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        reasoning_effort: 'medium',
        store: false,
        tools: [],
        messages: chatMessages(payload, risk),
        response_format: { type: 'json_schema', json_schema: { name: 'cloud_divination_reading', strict: true, schema: AI_READING_JSON_SCHEMA } }
      })
    });
  } catch (error) {
    throw new OpenAIRequestError(error?.name === 'AbortError' ? 'provider_timeout' : 'provider_network_error');
  }
  if (!response.ok) throw new OpenAIRequestError(providerCode(response.status));
  let data;
  try { data = await response.json(); } catch { throw new OpenAIRequestError('provider_invalid_output'); }
  const parsed = parseChatCompletionsOutput(data);
  if (parsed.refused) return { status: 'refused', responseId: data.id };
  return { status: 'completed', responseId: data.id, model: data.model, reading: parsed.reading };
}

export async function requestAiReading({ apiKey, baseUrl, model, payload, risk, fetchImpl = fetch, timeoutMs = 45_000 }) {
  if (!apiKey) throw new OpenAIRequestError('provider_not_configured');
  const urls = providerUrls(baseUrl);
  const requestModel = String(model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetchImpl(urls.responses, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: requestModel,
          reasoning: { effort: 'medium' },
          store: false,
          tools: [],
          input: buildOpenAIInput(payload, risk),
          text: { format: { type: 'json_schema', name: 'cloud_divination_reading', strict: true, schema: AI_READING_JSON_SCHEMA } }
        })
      });
    } catch (error) {
      throw new OpenAIRequestError(error?.name === 'AbortError' ? 'provider_timeout' : 'provider_network_error');
    }
    if (!response.ok) {
      if (canFallbackToChatCompletions(response.status, urls.isRelay)) {
        return await requestChatCompletions({ requestUrl: urls.chatCompletions, apiKey, model: requestModel, payload, risk, fetchImpl, signal: controller.signal });
      }
      throw new OpenAIRequestError(providerCode(response.status));
    }
    let data;
    try { data = await response.json(); } catch { throw new OpenAIRequestError('provider_invalid_output'); }
    const parsed = parseResponsesOutput(data);
    if (parsed.refused) return { status: 'refused', responseId: data.id };
    return { status: 'completed', responseId: data.id, model: data.model, reading: parsed.reading };
  } finally {
    clearTimeout(timer);
  }
}
