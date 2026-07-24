import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyRisk } from '../../src/domain/risk.js';
import { interpret } from '../../src/domain/interpretation.js';
import { createClassicsIndex } from '../../src/data/classics.js';

test('medical, investment and urgent self-harm questions receive boundaries', () => {
  assert.equal(classifyRisk('这个药能不能治好我的病').level, 'high');
  assert.equal(classifyRisk('应该把全部积蓄买入哪只股票').level, 'high');
  assert.equal(classifyRisk('我现在想自杀').level, 'urgent');
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
