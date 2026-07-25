import test from 'node:test';
import assert from 'node:assert/strict';
import { requestAiReading, OpenAIRequestError } from '../../functions/_lib/openai.js';

const reading = {
  overall_judgment: '宜先小范围联调，不宜直接锁定正式排期。', question_connection: '问题的关键是测试环境权限。', hexagram_synthesis: '体克用（你能推动局面），但仍需先消除权限阻碍。', current_situation: '接口文档已完成。', development_path: '先开权限，再跑最小链路。', future_tendency: '条件完成后可进入排期。', favorable_factors: ['接口文档已有'], obstacles: ['测试环境未开通'], action_steps: ['找测试环境管理员开通权限，并由接口负责人完成一次最小联调；以请求成功且返回字段通过校验为完成标准。'], avoid_actions: ['不要在联调完成前承诺上线日期。'], verification_signals: ['测试账号能访问环境并跑通核心接口。'], limitations: '这是传统文化辅助分析，不替代项目负责人判断。'
};

test('OpenAI request uses approved model and structured output settings', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ id: 'resp_1', model: 'gpt-5.4-mini-2026-03-17', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reading) }] }] }), { status: 200 });
  };
  const result = await requestAiReading({ apiKey: 'test-key', payload: { question: { text: '项目能否排期？', background: '' }, casting: {}, localReading: {} }, risk: { level: 'normal', categories: [] }, fetchImpl });
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.body.model, 'gpt-5.4-mini');
  assert.deepEqual(request.body.reasoning, { effort: 'medium' });
  assert.equal(request.body.store, false);
  assert.deepEqual(request.body.tools, []);
  assert.equal(request.body.text.format.type, 'json_schema');
  assert.equal(request.body.text.format.strict, true);
  assert.equal(result.status, 'completed');
  assert.equal(result.reading.action_steps.length, 1);
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
