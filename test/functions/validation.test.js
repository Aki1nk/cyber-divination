import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReadingRequest } from '../../functions/_lib/validation.js';

const valid = {
  idempotencyKey: 'gua-1', deviceId: '11111111-2222-4333-8444-555555555555', createdAt: '2026-07-25T00:00:00.000Z',
  question: { text: '项目是否适合排期？', background: '测试环境尚未开通。', category: 'career' },
  casting: { method: 'number-pair', algorithm: { id: 'number-pair-v1', version: 1 }, rawInputs: { first: '9' }, hexagram: { originalId: '101111', mutualId: '011110', changedId: '101011', movingLine: 3, originalLines: [1,1,1,1,0,1], mutualLines: [0,1,1,1,1,0], changedLines: [1,1,0,1,0,1], body: { element: 'wood' }, use: { element: 'earth' } }, fiveElements: { relation: 'body_overcomes_use', bodyElement: 'wood', useElement: 'earth', bodyStrength: 'prosperous', useStrength: 'resting' }, classics: { original: { name: '家人', guaCi: '利女贞。' }, mutual: { name: '未济', guaCi: '亨。' }, changed: { name: '贲', guaCi: '亨。' }, movingLine: '九三。' }, calculationLog: [] },
  localReading: { profileId: 'local-deterministic-v2', questionContext: {}, sections: [{ id: 'verdict', title: '宜 / 不宜', text: '宜先联调。', reasonKeys: [] }] },
  clientRisk: { level: 'normal', categories: [] }
};

test('valid reading request is normalized', () => {
  const result = validateReadingRequest(valid);
  assert.equal(result.ok, true);
  assert.equal(result.value.question.category, 'career');
});

test('unknown fields and malformed facts are rejected', () => {
  assert.equal(validateReadingRequest({ ...valid, secret: 'x' }).ok, false);
  assert.equal(validateReadingRequest({ ...valid, casting: { ...valid.casting, hexagram: { ...valid.casting.hexagram, movingLine: 7 } } }).ok, false);
  assert.equal(validateReadingRequest({ ...valid, question: { ...valid.question, text: 'x'.repeat(2001) } }).ok, false);
});
