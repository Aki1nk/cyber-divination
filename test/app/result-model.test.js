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

const v2Record = {
  ...record,
  schemaVersion: 2,
  interpretation: {
    profileId: 'local-deterministic-v2',
    questionContext: {
      category: 'career',
      intent: 'action_planning',
      focuses: ['timing', 'collaboration'],
      subjects: ['项目', '团队'],
      timeSignals: ['下周'],
      confidence: 'matched',
      reasonKeys: ['category:career', 'intent:action_planning', 'focus:timing', 'focus:collaboration']
    },
    sections: [
      { id: 'verdict', title: '宜 / 不宜结论', text: '宜先准备后推进。', reasonKeys: ['relation:use_generates_body'] },
      { id: 'direct_answer', title: '直接回答', text: '针对项目安排，宜先确认依赖。', reasonKeys: ['intent:action_planning'] },
      { id: 'current_situation', title: '当前局势', text: '当前存在阻塞。', reasonKeys: ['modern_guidance:000111'] },
      { id: 'development_process', title: '发展过程', text: '宜循序渐进。', reasonKeys: ['modern_guidance:001011'] },
      { id: 'future_tendency', title: '后续倾向', text: '依据事实调整。', reasonKeys: ['modern_guidance:100111'] },
      { id: 'favorable', title: '有利条件', text: '外部资源可借助。', reasonKeys: ['relation:use_generates_body'] },
      { id: 'obstacles', title: '主要阻碍', text: '接口尚未确认。', reasonKeys: ['focus:collaboration'] },
      { id: 'action_order', title: '行动次序', text: '第一步确认接口；第二步小范围验证；第三步确定时间表。', reasonKeys: ['reversible_action'] },
      { id: 'avoid_and_verify', title: '暂不宜做与验证标准', text: '暂不宜一次承诺全部进度。', reasonKeys: ['human_judgment'] }
    ]
  }
};

test('v2 result model exposes nine sections and question analysis evidence', () => {
  const model = createResultModel(v2Record);
  assert.equal(model.tabs.summary.sections.length, 9);
  assert.equal(model.tabs.evidence.questionContext.intent, 'action_planning');
  assert.equal(model.tabs.evidence.interpretationProfile, 'local-deterministic-v2');
});

test('v2 result markup highlights the verdict and renders question analysis', () => {
  const html = renderResult(v2Record);
  assert.match(html, /interpretation-card--verdict/);
  assert.match(html, /问题解析/);
  assert.match(html, /action_planning/);
  assert.equal((html.match(/class="interpretation-card/g) || []).length, 9);
});

test('v1 records still render without question context', () => {
  const html = renderResult(record);
  assert.match(html, /宜先整顿基础/);
  assert.doesNotMatch(html, /问题解析/);
});
