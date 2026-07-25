import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RELATION_TEXT, STRENGTH_TEXT } from '../../src/data/interpretation-rules.js';
import { classifyRisk } from '../../src/domain/risk.js';
import { interpret } from '../../src/domain/interpretation.js';
import { createClassicsIndex } from '../../src/data/classics.js';

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
  const output = interpret({
    category: 'career',
    relation: 'body_overcomes_use',
    bodyStrength: 'prosperous',
    useStrength: 'resting',
    originalName: '家人',
    mutualName: '未济',
    changedName: '贲',
    movingLineText: '九三：家人嗃嗃。',
    risk: { level: 'normal', categories: [] }
  });
  assert.deepEqual(output.sections.map((section) => section.id), ['summary', 'favorable', 'obstacles', 'timing', 'action']);
  assert.ok(output.sections.every((section) => section.reasonKeys.length > 0));
  assert.doesNotMatch(JSON.stringify(output), /必然|稳赚|包治|一定分手/);
});

test('classics index normalizes judgments, lines and special lines', async () => {
  const records = JSON.parse(await readFile('src/vendor/64gua.json', 'utf8'));
  const classics = createClassicsIndex(records);
  assert.equal(classics.get('111111').name, '乾');
  assert.equal(classics.get('111111').lineTexts.length, 6);
  assert.equal(classics.get('111111').specialLines.length, 1);
  assert.equal(classics.get('100010').name, '屯');
});
