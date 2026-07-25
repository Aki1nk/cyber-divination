import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadingUpload } from '../../src/cloud/reading-contract.js';

test('reading upload includes immutable facts and local interpretation', () => {
  const payload = buildReadingUpload({
    id: 'gua-1', createdAt: '2026-07-25T00:00:00.000Z', question: '这个项目下周适合进入正式排期吗？', background: '接口文档完成，但测试环境权限未开通。', category: 'career', method: 'number-pair',
    rawInputs: { first: '9', second: '16' }, algorithm: { id: 'number-pair-v1', version: 1 },
    hexagram: { originalId: '101111', mutualId: '011110', changedId: '101011', movingLine: 3, originalLines: [1, 1, 1, 1, 0, 1], mutualLines: [0, 1, 1, 1, 1, 0], changedLines: [1, 1, 0, 1, 0, 1], body: { element: 'wood' }, use: { element: 'earth' } },
    fiveElements: { relation: 'body_overcomes_use', bodyElement: 'wood', useElement: 'earth', bodyStrength: 'prosperous', useStrength: 'resting' },
    classics: { original: { name: '家人', guaCi: '利女贞。' }, mutual: { name: '未济', guaCi: '亨。' }, changed: { name: '贲', guaCi: '亨。' }, movingLine: '九三：家人嗃嗃。' },
    interpretation: { profileId: 'local-deterministic-v2', questionContext: { intent: 'action_planning', focuses: ['timing'] }, sections: [{ id: 'verdict', title: '宜 / 不宜', text: '宜先完成最小联调。', reasonKeys: ['relation:body_overcomes_use'] }] },
    risk: { level: 'normal', categories: [] }, calculationLog: [{ label: '动爻数', value: '3' }]
  }, '11111111-2222-4333-8444-555555555555');

  assert.equal(payload.idempotencyKey, 'gua-1');
  assert.equal(payload.deviceId, '11111111-2222-4333-8444-555555555555');
  assert.equal(payload.question.text, '这个项目下周适合进入正式排期吗？');
  assert.equal(payload.casting.hexagram.movingLine, 3);
  assert.equal(payload.localReading.sections[0].text, '宜先完成最小联调。');
});
