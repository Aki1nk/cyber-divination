import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RELATION_TEXT, RISK_BOUNDARIES, STRENGTH_TEXT } from '../../src/data/interpretation-rules.js';
import { classifyRisk } from '../../src/domain/risk.js';
import { interpret } from '../../src/domain/interpretation.js';
import { createClassicsIndex } from '../../src/data/classics.js';

function interpretationInput(overrides = {}) {
  return {
    category: 'career',
    relation: 'body_overcomes_use',
    bodyStrength: 'prosperous',
    useStrength: 'resting',
    originalName: '家人',
    mutualName: '未济',
    changedName: '贲',
    movingLineText: '九三：家人嗃嗃。',
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

test('interpretation exposes reasons and avoids forbidden certainty', () => {
  const output = interpret(interpretationInput());
  assert.deepEqual(output.sections.map((section) => section.id), ['summary', 'favorable', 'obstacles', 'timing', 'action']);
  assert.ok(output.sections.every((section) => section.reasonKeys.length > 0));
  assert.doesNotMatch(JSON.stringify(output), /必然|稳赚|包治|一定分手/);
});

test('interpretation explains obstacles, timing and action in everyday language', () => {
  const output = interpret(interpretationInput());
  const sections = Object.fromEntries(output.sections.map((section) => [section.id, section]));

  assert.match(sections.summary.text, /体克用（你目前仍有主动权）/);
  assert.equal(sections.obstacles.text, '信息与执行仍有缺口（容易卡在前提不清或落实偏差）：先核对关键条件，再决定下一步。');
  assert.equal(sections.timing.text, '动爻所示为“九三：家人嗃嗃。”。动爻（事情正在变化的位置）提示你留意当前阶段的转折；这是阶段提醒，不是具体日期或结果保证。');
  assert.equal(sections.action.text, '行动宜从小处验证（先做一个能撤回、损失可控的步骤）：根据现实反馈再调整，不把卦象当作唯一决策依据。');
});

test('strong use conditions receive a plain-language obstacle explanation', () => {
  const output = interpret(interpretationInput({ useStrength: 'prosperous' }));
  const obstacles = output.sections.find((section) => section.id === 'obstacles');

  assert.equal(obstacles.text, '用势较强（外部条件对事情的影响更大）：你的安排可能受到牵制，宜提前准备协商方案。');
});

test('high-risk advice still replaces the ordinary action suggestion', () => {
  const output = interpret(interpretationInput({
    risk: { level: 'high', categories: ['medical'] }
  }));
  const action = output.sections.find((section) => section.id === 'action');

  assert.equal(action.text, RISK_BOUNDARIES.medical);
  assert.deepEqual(action.reasonKeys, ['risk:high', 'risk_category:medical']);
});

test('classics index normalizes judgments, lines and special lines', async () => {
  const records = JSON.parse(await readFile('src/vendor/64gua.json', 'utf8'));
  const classics = createClassicsIndex(records);
  assert.equal(classics.get('111111').name, '乾');
  assert.equal(classics.get('111111').lineTexts.length, 6);
  assert.equal(classics.get('111111').specialLines.length, 1);
  assert.equal(classics.get('100010').name, '屯');
});
