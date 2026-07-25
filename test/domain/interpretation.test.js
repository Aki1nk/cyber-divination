import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CATEGORY_GUIDANCE, FOCUS_ACTIONS, RELATION_TEXT, RISK_BOUNDARIES, STRENGTH_ADJUSTMENTS, STRENGTH_TEXT, VERDICT_RULES } from '../../src/data/interpretation-rules.js';
import { classifyRisk } from '../../src/domain/risk.js';
import { interpret } from '../../src/domain/interpretation.js';
import { createClassicsIndex } from '../../src/data/classics.js';

function interpretationInput(overrides = {}) {
  return {
    question: '如何安排项目下一阶段的推进顺序？',
    background: '需要协调团队资源并确认外部接口',
    category: 'career',
    relation: 'body_overcomes_use',
    bodyStrength: 'prosperous',
    useStrength: 'resting',
    originalId: '000111',
    mutualId: '001011',
    changedId: '100111',
    originalName: '否',
    mutualName: '渐',
    changedName: '无妄',
    movingLine: 1,
    movingLineText: '初六：拔茅茹，以其汇，贞吉亨。',
    risk: { level: 'normal', categories: [] },
    ...overrides
  };
}

test('medical, investment and urgent self-harm questions receive boundaries', () => {
  assert.equal(classifyRisk('这个药能不能治好我的病').level, 'high');
  assert.equal(classifyRisk('应该把全部积蓄买入哪只股票').level, 'high');
  assert.equal(classifyRisk('我现在想自杀').level, 'urgent');
});

test('body-use relations retain terms and add plain-language guidance', () => {
  assert.deepEqual(RELATION_TEXT, {
    same_element: '体用比和（内外条件较容易配合）：保持现有节奏，先推进已经达成共识的事项，再核对细节。',
    body_generates_use: '体生用（你正在投入较多精力支持外部事项）：设好时间、成本和承诺上限，避免一味消耗。',
    use_generates_body: '用生体（外部条件能为你提供帮助）：主动承接明确资源，但仍要核实关键前提。',
    body_overcomes_use: '体克用（你目前仍有主动权）：先把自己能决定的事做扎实，再处理外部变化。',
    use_overcomes_body: '用克体（外部压力或条件更强）：放慢节奏，补齐信息，并为协商或调整预留空间。'
  });
});

test('body strength retains terms and explains practical meaning', () => {
  assert.deepEqual(STRENGTH_TEXT, {
    prosperous: '体势当令（当前可用资源和执行力相对充足）：可以推进关键步骤，但仍要核对事实与承受范围。',
    supported: '体势得助（当前有人、资源或既有基础可以借力）：优先使用已经确认的支持条件。',
    resting: '体势平缓（当前更适合观察和整理）：先小步验证，再根据现实反馈决定是否扩大行动。',
    weakened: '体势偏弱（当前余量可能不足）：先保留时间、资金和精力，避免一次承担过多。'
  });
});

test('v2 interpretation directly answers the question with nine auditable sections', () => {
  const output = interpret(interpretationInput());
  const sections = Object.fromEntries(output.sections.map((section) => [section.id, section]));

  assert.equal(output.profileId, 'local-deterministic-v2');
  assert.equal(output.questionContext.intent, 'action_planning');
  assert.deepEqual(output.sections.map((section) => section.id), [
    'verdict',
    'direct_answer',
    'current_situation',
    'development_process',
    'future_tendency',
    'favorable',
    'obstacles',
    'action_order',
    'avoid_and_verify'
  ]);
  assert.match(sections.verdict.text, /^宜主动推进/);
  assert.match(sections.direct_answer.text, /如何安排项目下一阶段的推进顺序/);
  assert.match(sections.current_situation.text, /项目|阻塞/);
  assert.match(sections.development_process.text, /早期阶段|循序渐进/);
  assert.match(sections.future_tendency.text, /无妄|事实/);
  assert.match(sections.action_order.text, /第一步：.*第二步：.*第三步：/);
  assert.match(sections.avoid_and_verify.text, /暂不宜：.*验证标准：/);
  assert.ok(output.sections.every((section) => section.reasonKeys.length > 0));
});

test('all body-use relations produce the approved explicit verdict labels', () => {
  const cases = {
    body_overcomes_use: '宜主动推进',
    use_generates_body: '宜借力推进',
    same_element: '宜稳步推进',
    body_generates_use: '宜控制投入后推进',
    use_overcomes_body: '暂不宜强行推进'
  };

  for (const [relation, label] of Object.entries(cases)) {
    const output = interpret(interpretationInput({ relation }));
    assert.match(output.sections[0].text, new RegExp(`^${label}`));
  }
});

test('moving line positions map to early middle and late stages without dates', () => {
  const cases = [[1, 'early'], [2, 'early'], [3, 'middle'], [4, 'middle'], [5, 'late'], [6, 'late']];

  for (const [movingLine, stage] of cases) {
    const output = interpret(interpretationInput({ movingLine }));
    const process = output.sections.find((section) => section.id === 'development_process');
    assert.ok(process.reasonKeys.includes(`moving_stage:${stage}`));
    assert.doesNotMatch(process.text, /\d{4}年|\d+月\d+日|保证在/);
  }
});

test('high-risk advice replaces ordinary decision and action guidance', () => {
  const output = interpret(interpretationInput({
    question: '这个药能不能治好我的病？',
    risk: { level: 'high', categories: ['medical'] }
  }));
  const sections = Object.fromEntries(output.sections.map((section) => [section.id, section]));

  assert.equal(sections.verdict.text, '此事不宜仅凭卦象决定。');
  assert.equal(sections.direct_answer.text, RISK_BOUNDARIES.medical);
  assert.equal(sections.action_order.text, RISK_BOUNDARIES.medical);
  assert.doesNotMatch(JSON.stringify(output), /宜主动推进|宜借力推进/);
});

test('urgent self-harm interpretation stops divination framing and prioritizes help', () => {
  const output = interpret(interpretationInput({
    question: '我现在想自杀',
    risk: { level: 'urgent', categories: ['self_harm'] }
  }));

  assert.equal(output.sections[0].text, '当前不宜继续进行宿命式判断。');
  assert.ok(output.sections.every((section) => section.reasonKeys.includes('risk:urgent')));
  assert.match(output.sections[1].text, /立即联系当地急救服务/);
});

test('v2 output avoids forbidden certainty and fabricated promises', () => {
  const output = interpret(interpretationInput());
  assert.doesNotMatch(JSON.stringify(output), /必然|注定|一定成功|一定失败|稳赚|包治|治愈|必有灾祸/);
});

test('classics index normalizes judgments, lines and special lines', async () => {
  const records = JSON.parse(await readFile('src/vendor/64gua.json', 'utf8'));
  const classics = createClassicsIndex(records);
  assert.equal(classics.get('111111').name, '乾');
  assert.equal(classics.get('111111').lineTexts.length, 6);
  assert.equal(classics.get('111111').specialLines.length, 1);
  assert.equal(classics.get('100010').name, '屯');
});

test('v2 verdict rules explicitly cover all five body-use relations', () => {
  assert.deepEqual(Object.keys(VERDICT_RULES).sort(), [
    'body_generates_use',
    'body_overcomes_use',
    'same_element',
    'use_generates_body',
    'use_overcomes_body'
  ]);
  assert.equal(VERDICT_RULES.body_overcomes_use.label, '宜主动推进');
  assert.equal(VERDICT_RULES.use_generates_body.label, '宜借力推进');
  assert.equal(VERDICT_RULES.same_element.label, '宜稳步推进');
  assert.equal(VERDICT_RULES.body_generates_use.label, '宜控制投入后推进');
  assert.equal(VERDICT_RULES.use_overcomes_body.label, '暂不宜强行推进');
});

test('v2 category and focus rules cover every selectable category', () => {
  assert.deepEqual(Object.keys(CATEGORY_GUIDANCE).sort(), ['career', 'general', 'relationship', 'study', 'travel']);
  assert.ok(Object.values(CATEGORY_GUIDANCE).every((rule) => rule.subject && rule.verification));
  assert.ok(FOCUS_ACTIONS.timing.includes('启动条件'));
  assert.ok(FOCUS_ACTIONS.collaboration.includes('责任'));
  assert.ok(STRENGTH_ADJUSTMENTS.weakened.includes('暂不宜扩大'));
});
