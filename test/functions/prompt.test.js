import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpenAIInput, SYSTEM_PROMPT } from '../../functions/_lib/prompt.js';

test('prompt requires concrete question-bound advice and protects casting facts', () => {
  assert.match(SYSTEM_PROMPT, /不得修改本卦、互卦、变卦、动爻/);
  assert.match(SYSTEM_PROMPT, /找谁/);
  assert.match(SYSTEM_PROMPT, /完成标准/);
  assert.match(SYSTEM_PROMPT, /术语后立即附上白话括注/);
  const input = buildOpenAIInput({ question: { text: '项目能否正式排期？', background: '测试环境权限未开通。' }, casting: { hexagram: { originalId: '101111' } } }, { level: 'normal', categories: [] });
  assert.match(input[1].content[0].text, /项目能否正式排期/);
  assert.match(input[1].content[0].text, /测试环境权限未开通/);
});
