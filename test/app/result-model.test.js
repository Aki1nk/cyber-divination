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

test('result markup exposes an accessible five-tab contract', () => {
  const html = renderResult(record);
  assert.equal((html.match(/role="tab"/g) || []).length, 5);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /计算依据/);
  assert.match(html, /AI 深解/);
});

test('completed AI reading renders every structured field and concrete actions', () => {
  const html = renderResult({ ...record, ai: { status: 'completed', readingId: 'cloud-1', reading: {
    overall_judgment: '宜先完成最小联调，不宜直接锁定正式排期。',
    question_connection: '你问的是项目排期，关键事实是测试环境权限尚未开通。',
    hexagram_synthesis: '体克用（你能推动局面），但动爻提示先处理阻塞。',
    current_situation: '接口文档已有，测试入口未就绪。', development_path: '先开权限，再跑最小链路。', future_tendency: '验收通过后再进入正式排期。',
    favorable_factors: ['接口文档已完成'], obstacles: ['测试环境权限未开通'],
    action_steps: ['找测试环境管理员开通权限，由接口负责人跑通一次核心请求；以返回字段通过校验为完成标准。'],
    avoid_actions: ['不要在最小联调前承诺上线日期。'], verification_signals: ['测试账号可以访问环境并返回预期字段。'],
    limitations: '这是传统文化辅助分析，不替代项目负责人判断。'
  } } });
  assert.match(html, /体克用（你能推动局面）/);
  assert.match(html, /找测试环境管理员/);
  assert.match(html, /完成标准/);
  assert.match(html, /不宜直接锁定正式排期/);
});

test('completed legacy AI reading exposes a comprehensive upgrade action', () => {
  const html = renderResult({ ...record, id: 'gua-old-ai', ai: { status: 'completed', readingId: 'cloud-old', reading: {
    overall_judgment: '旧版结论', question_connection: '旧版关联', hexagram_synthesis: '旧版综合', current_situation: '旧版局势', development_path: '旧版路径', future_tendency: '旧版倾向', favorable_factors: ['旧版有利'], obstacles: ['旧版阻碍'], action_steps: ['旧版行动'], avoid_actions: ['旧版不宜'], verification_signals: ['旧版验证'], limitations: '旧版边界'
  } } });
  assert.match(html, /生成新版综合卦象解读/);
  assert.match(html, /data-ai-retry='gua-old-ai'/);
});

test('failed AI state keeps local result and exposes retry', () => {
  const html = renderResult({ ...record, id: 'gua-1', ai: { status: 'failed', errorCode: 'provider_unavailable' } });
  assert.match(html, /本地解读仍然有效/);
  assert.match(html, /data-ai-retry="gua-1"/);
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
test('legacy result without AI state exposes an explicit generation action', () => {
  const html = renderResult({ ...record, id: 'gua-legacy' });
  assert.match(html, /生成 AI 深解/);
  assert.match(html, /data-ai-retry/);
});

test('completed AI reading renders the comprehensive hexagram interpretation', () => {
  const html = renderResult({ ...record, id: 'gua-comprehensive', ai: { status: 'completed', readingId: 'cloud-comprehensive', reading: {
    comprehensive_hexagram_reading: {
      foundation_summary: '本卦巽为风，互卦火泽睽，变卦风山渐；体用比和。',
      foundation_points: ['本卦主相持。', '互卦提示分歧。', '变卦代表渐进。'],
      core_summary: '体用同气，双方力量接近。',
      strengths: ['根基平稳'],
      weaknesses: ['进攻爆发力不足'],
      key_risks: ['中段出现配合断层'],
      trend_summary: '局势循序推进，结果不会一边倒。',
      trend_branches: ['若主动修正失误，则逐步改善。', '若继续维持当前节奏，则仍会反复拉扯。'],
      conclusions: ['宜稳步推进。', '不宜追求一次性定论。', '需以现实反馈复核。'],
      disclaimer: '卦象仅作趋势参考，请以现实信息和专业建议为准。'
    },
    overall_judgment: '宜先观察。', question_connection: '紧扣所问。', hexagram_synthesis: '综合三卦。', current_situation: '当前局势。', development_path: '发展路径。', future_tendency: '后续倾向。', favorable_factors: ['基础稳定'], obstacles: ['存在阻碍'], action_steps: ['先核验事实'], avoid_actions: ['不宜冲动'], verification_signals: ['现实反馈明确'], limitations: '文化辅助分析。'
  } } });
  assert.match(html, /综合卦象解读/);
  assert.match(html, /一、卦局基础/);
  assert.match(html, /二、体用与问题核心/);
  assert.match(html, /三、变卦整体走势/);
  assert.match(html, /四、综合结论/);
  assert.match(html, /根基平稳/);
  assert.match(html, /进攻爆发力不足/);
  assert.match(html, /中段出现配合断层/);
  assert.match(html, /若主动修正失误/);
  assert.match(html, /若继续维持当前节奏/);
  assert.match(html, /宜稳步推进/);
  assert.match(html, /不宜追求一次性定论/);
  assert.match(html, /卦象仅作趋势参考/);
});
