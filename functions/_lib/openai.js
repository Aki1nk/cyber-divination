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

function responsesUrl(value) {
  const raw = String(value || DEFAULT_BASE_URL).trim();
  let url;
  try { url = new URL(raw); } catch { throw new OpenAIRequestError('provider_not_configured'); }
  if (url.protocol !== 'https:') throw new OpenAIRequestError('provider_not_configured');
  url.hash = '';
  url.search = '';
  const pathname = url.pathname.replace(/\/+$/, '');
  url.pathname = pathname.endsWith('/responses') ? pathname : `${pathname}/responses`;
  return url.toString();
}

function parseOutput(response) {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'refusal') return { refused: true };
      if (content.type === 'output_text' && typeof content.text === 'string') {
        let reading;
        try { reading = JSON.parse(content.text); } catch { throw new OpenAIRequestError('provider_invalid_output'); }
        if (!reading || REQUIRED_FIELDS.some((field) => !(field in reading))) throw new OpenAIRequestError('provider_invalid_output');
        return { reading };
      }
    }
  }
  throw new OpenAIRequestError('provider_invalid_output');
}

export async function requestAiReading({ apiKey, baseUrl, model, payload, risk, fetchImpl = fetch, timeoutMs = 45_000 }) {
  if (!apiKey) throw new OpenAIRequestError('provider_not_configured');
  const requestUrl = responsesUrl(baseUrl);
  const requestModel = String(model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetchImpl(requestUrl, {
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
    if (!response.ok) throw new OpenAIRequestError(providerCode(response.status));
    let data;
    try { data = await response.json(); } catch { throw new OpenAIRequestError('provider_invalid_output'); }
    const parsed = parseOutput(data);
    if (parsed.refused) return { status: 'refused', responseId: data.id };
    return { status: 'completed', responseId: data.id, model: data.model, reading: parsed.reading };
  } finally {
    clearTimeout(timer);
  }
}
