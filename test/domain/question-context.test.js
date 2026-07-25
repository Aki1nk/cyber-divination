import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuestion } from '../../src/domain/question-context.js';

test('selected category stays authoritative while intent and focuses come from the question', () => {
  const context = analyzeQuestion({
    question: '如何安排项目下周的推进顺序，并协调团队资源？',
    background: '需要先确认外部接口',
    category: 'career'
  });

  assert.equal(context.category, 'career');
  assert.equal(context.intent, 'action_planning');
  assert.deepEqual(context.focuses, ['timing', 'collaboration', 'resources']);
  assert.deepEqual(context.subjects, ['项目', '团队']);
  assert.deepEqual(context.timeSignals, ['下周']);
  assert.equal(context.confidence, 'matched');
  assert.deepEqual(context.reasonKeys, [
    'category:career',
    'intent:action_planning',
    'focus:timing',
    'focus:collaboration',
    'focus:resources'
  ]);
});

test('comparison outranks decision and keeps stable subject order', () => {
  const context = analyzeQuestion({
    question: '这两个工作机会哪个更适合我，还是继续当前项目？',
    category: 'career'
  });

  assert.equal(context.intent, 'comparison');
  assert.deepEqual(context.subjects, ['工作', '项目']);
});

test('relationship and timing language are recognized without changing category', () => {
  const context = analyzeQuestion({
    question: '近期是否适合与对方沟通复合？',
    category: 'relationship'
  });

  assert.equal(context.category, 'relationship');
  assert.equal(context.intent, 'timing');
  assert.deepEqual(context.focuses, ['timing', 'communication']);
  assert.deepEqual(context.subjects, ['对方']);
  assert.deepEqual(context.timeSignals, ['近期']);
});

test('unknown input falls back without inventing subjects or dates', () => {
  const context = analyzeQuestion({ question: '这件事怎么看？', category: 'unknown' });

  assert.equal(context.category, 'general');
  assert.equal(context.intent, 'general');
  assert.deepEqual(context.focuses, []);
  assert.deepEqual(context.subjects, []);
  assert.deepEqual(context.timeSignals, []);
  assert.equal(context.confidence, 'category-only');
  assert.deepEqual(context.reasonKeys, ['category:general', 'intent:general']);
});

test('parser outputs are deeply frozen', () => {
  const context = analyzeQuestion({ question: '要不要推进申请？', category: 'study' });
  assert.ok(Object.isFrozen(context));
  assert.ok(Object.isFrozen(context.focuses));
  assert.ok(Object.isFrozen(context.subjects));
  assert.ok(Object.isFrozen(context.timeSignals));
  assert.ok(Object.isFrozen(context.reasonKeys));
});
