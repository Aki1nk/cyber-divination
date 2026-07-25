import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCreateReading, handleRetryReading } from '../../functions/_lib/readings-api.js';

const payload = {
  idempotencyKey: 'gua-1', deviceId: '11111111-2222-4333-8444-555555555555', createdAt: '2026-07-25T00:00:00.000Z',
  question: { text: '项目是否适合排期？', background: '测试环境权限未开通。', category: 'career' },
  casting: { method: 'number-pair', algorithm: { id: 'number-pair-v1', version: 1 }, rawInputs: {}, hexagram: { originalId: '101111', mutualId: '011110', changedId: '101011', movingLine: 3, originalLines: [1,1,1,1,0,1], mutualLines: [0,1,1,1,1,0], changedLines: [1,1,0,1,0,1] }, fiveElements: {}, classics: {}, calculationLog: [] },
  localReading: { profileId: 'local-deterministic-v2', questionContext: {}, sections: [{}] }, clientRisk: { level: 'normal', categories: [] }
};

function request(body = payload) {
  return new Request('https://example.com/api/readings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

test('create handler stores server risk and completed structured reading', async () => {
  const calls = [];
  const repository = { findByIdempotency: async () => null, create: async (_payload, risk) => { calls.push(risk); return { id: 'reading-1' }; }, markProcessing: async () => {}, complete: async () => {}, addAttempt: async () => {} };
  const ai = async () => ({ status: 'completed', responseId: 'resp-1', model: 'gpt-5.4-mini', reading: { overall_judgment: '宜先联调。' } });
  const response = await handleCreateReading({ request: request(), env: { OPENAI_API_KEY: 'key' }, repository, ai });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 'reading-1', status: 'completed', aiReading: { overall_judgment: '宜先联调。' }, errorCode: null });
  assert.equal(calls[0].level, 'normal');
});

test('create handler ignores client risk and reclassifies professional questions', async () => {
  let serverRisk;
  const repository = { findByIdempotency: async () => null, create: async (_payload, risk) => { serverRisk = risk; return { id: 'reading-2' }; }, markProcessing: async () => {}, complete: async () => {}, addAttempt: async () => {} };
  await handleCreateReading({ request: request({ ...payload, question: { ...payload.question, text: '这笔股票投资要不要全部买入？' } }), env: { OPENAI_API_KEY: 'key' }, repository, ai: async () => ({ status: 'completed', reading: {} }) });
  assert.equal(serverRisk.level, 'high');
  assert.ok(serverRisk.categories.includes('investment'));
});

test('retry requires the same anonymous device', async () => {
  const repository = { getForDevice: async (_id, deviceId) => deviceId === payload.deviceId ? { id: 'reading-1', payload, risk_level: 'normal', riskCategories: [], status: 'failed' } : null, markProcessing: async () => {}, complete: async () => {}, addAttempt: async () => {} };
  const response = await handleRetryReading({ request: new Request('https://example.com/retry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: payload.deviceId }) }), env: { OPENAI_API_KEY: 'key' }, readingId: 'reading-1', repository, ai: async () => ({ status: 'completed', reading: { overall_judgment: '完成' } }) });
  assert.equal((await response.json()).status, 'completed');
});

test('concurrent idempotent create returns the row inserted by another request', async () => {
  let lookups = 0;
  const repository = {
    findByIdempotency: async () => (++lookups === 1 ? null : { id: 'reading-race', status: 'completed', aiReading: { overall_judgment: '已有结果' }, error_code: null }),
    create: async () => { throw new Error('unique constraint'); }
  };
  const response = await handleCreateReading({ request: request(), env: { OPENAI_API_KEY: 'key' }, repository, ai: async () => { throw new Error('should not call'); } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, 'reading-race');
});
