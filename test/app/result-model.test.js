import test from 'node:test';
import assert from 'node:assert/strict';
import { createResultModel, renderResult } from '../../src/ui/views/result.js';

const record = {
  question: '未来三个月是否适合推进当前职业选择？',
  createdAt: '2026-07-24T10:00:00.000Z',
  algorithm: { id: 'number-pair-v1', version: 1 },
  rawInputs: { first: '9', second: '16' },
  interpretation: { sections: [{ id: 'summary', title: '局势摘要', text: '宜先整顿基础。', reasonKeys: ['relation:body_overcomes_use'] }] },
  hexagram: { originalLines: [1, 0, 1, 1, 0, 1], changedLines: [1, 0, 0, 1, 0, 1], movingLine: 3 },
  fiveElements: { relation: 'body_overcomes_use', bodyElement: 'wood', useElement: 'earth', bodyStrength: 'prosperous', useStrength: 'resting' },
  classics: {
    original: { name: '家人', guaCi: '利女贞。' },
    mutual: { name: '未济', guaCi: '亨。' },
    changed: { name: '贲', guaCi: '亨。' },
    movingLine: '九三：家人嗃嗃。'
  },
  calculationLog: [{ label: '上卦总数', value: '28' }],
  risk: { level: 'normal', categories: [] }
};

test('result model separates summary, classics and calculation evidence', () => {
  const model = createResultModel(record);
  assert.equal(model.tabs.summary.sections.length, 1);
  assert.equal(model.tabs.classics.originalName, '家人');
  assert.equal(model.tabs.evidence.rows[0].value, '28');
});

test('result markup exposes an accessible four-tab contract', () => {
  const html = renderResult(record);
  assert.equal((html.match(/role="tab"/g) || []).length, 4);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /计算依据/);
});

test('high-risk results display a professional boundary', () => {
  const html = renderResult({ ...record, risk: { level: 'high', categories: ['medical'] } });
  assert.match(html, /重要边界提示/);
  assert.match(html, /合格专业人员/);
});
