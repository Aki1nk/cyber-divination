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

test('prompt requires four-part comprehensive interpretation for every question type', () => {
  assert.match(SYSTEM_PROMPT, /卦局基础/);
  assert.match(SYSTEM_PROMPT, /体用与问题核心/);
  assert.match(SYSTEM_PROMPT, /变卦整体走势/);
  assert.match(SYSTEM_PROMPT, /综合结论/);
  assert.match(SYSTEM_PROMPT, /不得虚构概率/);
  assert.match(SYSTEM_PROMPT, /体育/);
  assert.match(SYSTEM_PROMPT, /每一卦.*当前问题/);
  assert.match(SYSTEM_PROMPT, /不得把三卦合并成一句/);
  assert.match(SYSTEM_PROMPT, /有利条件、不足限制和关键隐患/);
  assert.match(SYSTEM_PROMPT, /至少两个条件分支/);
  assert.match(SYSTEM_PROMPT, /三至五条/);
  assert.match(SYSTEM_PROMPT, /体育为胜负核心/);
  assert.match(SYSTEM_PROMPT, /温馨提示.*问题类型/);
});
