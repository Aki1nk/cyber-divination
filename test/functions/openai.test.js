import test from 'node:test';
import assert from 'node:assert/strict';
import { requestAiReading, OpenAIRequestError, DEFAULT_AI_TIMEOUT_MS } from '../../functions/_lib/openai.js';
import { AI_READING_JSON_SCHEMA } from '../../functions/_lib/ai-schema.js';

const reading = {
  overall_judgment: '宜先小范围联调，不宜直接锁定正式排期。', question_connection: '问题的关键是测试环境权限。', hexagram_synthesis: '体克用（你能推动局面），但仍需先消除权限阻碍。', comprehensive_hexagram_reading: { foundation_summary: '本卦、互卦、变卦与体用关系共同描述当前局势。', foundation_points: ['本卦显示当前状态。', '互卦提示过程中的变化。', '变卦描述后续趋势。'], core_summary: '体用关系对应问题中的核心矛盾。', strengths: ['接口文档已有'], weaknesses: ['测试环境未开通'], key_risks: ['权限阻碍导致判断失真'], trend_summary: '先解决基础条件，再观察后续发展。', trend_branches: ['条件满足后再推进下一阶段。'], conclusions: ['宜先核验权限。', '不宜直接锁定排期。', '以现实验收结果复核。'], disclaimer: '这是传统文化辅助分析，不替代专业判断。' }, current_situation: '接口文档已完成。', development_path: '先开权限，再跑最小链路。', future_tendency: '条件完成后可进入排期。', favorable_factors: ['接口文档已有'], obstacles: ['测试环境未开通'], action_steps: ['找测试环境管理员开通权限，并由接口负责人完成一次最小联调；以请求成功且返回字段通过校验为完成标准。'], avoid_actions: ['不要在联调完成前承诺上线日期。'], verification_signals: ['测试账号能访问环境并跑通核心接口。'], limitations: '这是传统文化辅助分析，不替代项目负责人判断。'
};

test('AI requests allow up to 180 seconds by default', () => {
  assert.equal(DEFAULT_AI_TIMEOUT_MS, 180_000);
});

test('AI schema requires the comprehensive hexagram reading structure', () => {
  const schema = AI_READING_JSON_SCHEMA.properties.comprehensive_hexagram_reading;
  assert.ok(schema);
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, [
    'foundation_summary', 'foundation_points', 'core_summary', 'strengths', 'weaknesses',
    'key_risks', 'trend_summary', 'trend_branches', 'conclusions', 'disclaimer'
  ]);
  assert.equal(schema.properties.foundation_points.minItems, 3);
  assert.equal(schema.properties.foundation_points.maxItems, 6);
  assert.equal(schema.properties.trend_branches.minItems, 2);
  assert.equal(schema.properties.trend_branches.maxItems, 6);
  assert.equal(schema.properties.conclusions.minItems, 3);
  assert.equal(schema.properties.conclusions.maxItems, 5);
  assert.ok(AI_READING_JSON_SCHEMA.required.includes('comprehensive_hexagram_reading'));
});

test('OpenAI request uses approved model and structured output settings', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ id: 'resp_1', model: 'gpt-5.4-mini-2026-03-17', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reading) }] }] }), { status: 200 });
  };
  const result = await requestAiReading({ apiKey: 'test-key', payload: { question: { text: '项目能否排期？', background: '' }, casting: {}, localReading: {} }, risk: { level: 'normal', categories: [] }, fetchImpl });
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.body.model, 'gpt-5.5');
  assert.deepEqual(request.body.reasoning, { effort: 'medium' });
  assert.equal(request.body.store, false);
  assert.deepEqual(request.body.tools, []);
  assert.equal(request.body.text.format.type, 'json_schema');
  assert.equal(request.body.text.format.strict, true);
  assert.equal(result.status, 'completed');
  assert.equal(result.reading.action_steps.length, 1);
});

test('relay uses Chat Completions directly with configured model', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({
      id: 'chatcmpl_relay',
      model: 'gpt-5.4-mini',
      choices: [{ message: { content: JSON.stringify(reading) } }]
    }), { status: 200 });
  };
  const result = await requestAiReading({
    apiKey: 'relay-key',
    baseUrl: 'https://tokunex.com/v1/',
    model: 'gpt-5.4-mini',
    payload: { question: { text: 'x', background: '' }, casting: {}, localReading: {} },
    risk: { level: 'normal', categories: [] },
    fetchImpl
  });

  assert.deepEqual(requests.map((request) => request.url), ['https://tokunex.com/v1/chat/completions']);
  assert.equal(requests[0].body.model, 'gpt-5.4-mini');
  assert.equal(requests[0].body.reasoning_effort, 'medium');
  assert.equal(requests[0].body.store, false);
  assert.equal(requests[0].body.response_format.type, 'json_schema');
  assert.equal(requests[0].body.response_format.json_schema.strict, true);
  assert.equal(result.status, 'completed');
  assert.equal(result.reading.action_steps.length, 1);
});

test('relay endpoint URL is normalized and insecure providers are rejected', async () => {
  let requestUrl;
  const fetchImpl = async (url) => {
    requestUrl = url;
    return new Response(JSON.stringify({ id: 'chatcmpl_complete', choices: [{ message: { refusal: 'cannot comply' } }] }), { status: 200 });
  };
  await requestAiReading({ apiKey: 'relay-key', baseUrl: 'https://tokunex.com/v1/responses', payload: { question: { text: 'x', background: '' }, casting: {}, localReading: {} }, risk: { level: 'normal', categories: [] }, fetchImpl });
  assert.equal(requestUrl, 'https://tokunex.com/v1/chat/completions');
  await assert.rejects(() => requestAiReading({ apiKey: 'relay-key', baseUrl: 'http://tokunex.com/v1', payload: { question: { text: 'x', background: '' }, casting: {}, localReading: {} }, risk: { level: 'normal', categories: [] }, fetchImpl }), (error) => error instanceof OpenAIRequestError && error.code === 'provider_not_configured');
});

test('OpenAI refusal is returned without parsing invented output', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ id: 'resp_2', status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'cannot comply' }] }] }), { status: 200 });
  const result = await requestAiReading({ apiKey: 'key', payload: { question: { text: 'x', background: '' }, casting: {}, localReading: {} }, risk: { level: 'normal', categories: [] }, fetchImpl });
  assert.deepEqual(result, { status: 'refused', responseId: 'resp_2' });
});

test('provider failures expose only stable safe codes', async () => {
  const fetchImpl = async () => new Response('secret provider body', { status: 429 });
  await assert.rejects(() => requestAiReading({ apiKey: 'key', payload: { question: { text: 'x', background: '' }, casting: {}, localReading: {} }, risk: { level: 'normal', categories: [] }, fetchImpl }), (error) => error instanceof OpenAIRequestError && error.code === 'provider_rate_limited' && !error.message.includes('secret'));
});
