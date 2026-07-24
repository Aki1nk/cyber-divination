# 卦象解读白话辅助 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变卦象计算与风险边界的前提下，为体用、旺衰、阻碍和动爻解读增加紧随术语的白话括注与现实行动提醒。

**Architecture:** 保持 `interpret()` 返回的 `profileId`、五段 `sections`、`reasonKeys` 和 UI 数据契约不变。静态体用与旺衰文案继续集中在规则数据文件中；动态文案仍由领域解释函数组装，因此结果页无需结构改动。

**Tech Stack:** 原生 JavaScript ES modules、Node.js 内置测试运行器 `node:test`、Cloudflare Pages 静态构建脚本。

---

## File Map

- Modify: `src/data/interpretation-rules.js` — 五种体用关系、四种旺衰状态和既有风险边界文本。
- Modify: `src/domain/interpretation.js` — 局势、阻碍、时机和行动建议，保持输出结构不变。
- Modify: `test/domain/interpretation.test.js` — 固定文案、动态区块和风险边界测试。

### Task 1: 体用与旺衰白话规则

**Files:**
- Modify: `test/domain/interpretation.test.js`
- Modify: `src/data/interpretation-rules.js`

- [ ] **Step 1: Write the failing table-driven tests**

在 imports 中加入：

```js
import { RELATION_TEXT, RISK_BOUNDARIES, STRENGTH_TEXT } from '../../src/data/interpretation-rules.js';
```

加入：

```js
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/domain/interpretation.test.js`

Expected: FAIL；两个新增测试显示固定规则尚未包含指定白话括注。

- [ ] **Step 3: Replace only the fixed relation and strength text**

将 `RELATION_TEXT` 与 `STRENGTH_TEXT` 替换为：

```js
export const RELATION_TEXT = Object.freeze({
  same_element: '体用比和（内外条件较容易配合）：保持现有节奏，先推进已经达成共识的事项，再核对细节。',
  body_generates_use: '体生用（你正在投入较多精力支持外部事项）：设好时间、成本和承诺上限，避免一味消耗。',
  use_generates_body: '用生体（外部条件能为你提供帮助）：主动承接明确资源，但仍要核实关键前提。',
  body_overcomes_use: '体克用（你目前仍有主动权）：先把自己能决定的事做扎实，再处理外部变化。',
  use_overcomes_body: '用克体（外部压力或条件更强）：放慢节奏，补齐信息，并为协商或调整预留空间。'
});

export const STRENGTH_TEXT = Object.freeze({
  prosperous: '体势当令（当前可用资源和执行力相对充足）：可以推进关键步骤，但仍要核对事实与承受范围。',
  supported: '体势得助（当前有人、资源或既有基础可以借力）：优先使用已经确认的支持条件。',
  resting: '体势平缓（当前更适合观察和整理）：先小步验证，再根据现实反馈决定是否扩大行动。',
  weakened: '体势偏弱（当前余量可能不足）：先保留时间、资金和精力，避免一次承担过多。'
});
```

保持 `RISK_BOUNDARIES` 原样。

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test test/domain/interpretation.test.js`

Expected: PASS，包含新增的体用和旺衰文本契约测试。

- [ ] **Step 5: Commit the fixed-rule change**

```powershell
git add -- src/data/interpretation-rules.js test/domain/interpretation.test.js
git commit -m "feat: explain body-use terms plainly"
```

### Task 2: 动态区块白话模板

**Files:**
- Modify: `test/domain/interpretation.test.js`
- Modify: `src/domain/interpretation.js`

- [ ] **Step 1: Add a reusable interpretation fixture**

在 imports 后加入：

```js
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
```

将现有解读测试中的内联输入替换为 `interpret(interpretationInput())`。

- [ ] **Step 2: Write failing tests for the dynamic messages**

加入：

```js
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
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `node --test test/domain/interpretation.test.js`

Expected: FAIL；动态区块仍返回旧版阻碍、时机和行动文案。风险优先测试应继续通过，证明安全边界未被新需求取代。

- [ ] **Step 4: Implement the minimal dynamic wording changes**

在 `interpret()` 中使用以下文本，其他数据结构与 `reasonKeys` 不变：

```js
export function interpret(input) {
  const relationText = RELATION_TEXT[input.relation] ?? '体用关系未落入既定规则（现有信息不足以作出这一项判断）：请结合事实继续核验。';
  const strengthText = STRENGTH_TEXT[input.bodyStrength] ?? '旺衰信息有限（当前条件不足以判断准备程度）：请采用保守、可调整的步骤。';
  const boundary = riskAdvice(input.risk);
  const actionText = boundary || '行动宜从小处验证（先做一个能撤回、损失可控的步骤）：根据现实反馈再调整，不把卦象当作唯一决策依据。';

  return Object.freeze({
    profileId: 'local-deterministic-v1',
    sections: Object.freeze([
      section('summary', '局势摘要', `本卦为${input.originalName}，互卦为${input.mutualName}，变卦为${input.changedName}。${relationText}`, ['original_hexagram', 'mutual_hexagram', 'changed_hexagram', `relation:${input.relation}`]),
      section('favorable', '有利因素', strengthText, [`body_strength:${input.bodyStrength}`, `relation:${input.relation}`]),
      section('obstacles', '阻碍因素', input.useStrength === 'prosperous' ? '用势较强（外部条件对事情的影响更大）：你的安排可能受到牵制，宜提前准备协商方案。' : '信息与执行仍有缺口（容易卡在前提不清或落实偏差）：先核对关键条件，再决定下一步。', [`use_strength:${input.useStrength}`, 'deterministic_caution']),
      section('timing', '时机倾向', `动爻所示为“${input.movingLineText}”。动爻（事情正在变化的位置）提示你留意当前阶段的转折；这是阶段提醒，不是具体日期或结果保证。`, ['moving_line', 'no_date_guarantee']),
      section('action', '行动建议', actionText, boundary ? [`risk:${input.risk.level}`, ...(input.risk.categories ?? []).map((category) => `risk_category:${category}`)] : ['reversible_action', 'human_judgment'])
    ])
  });
}
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test test/domain/interpretation.test.js`

Expected: PASS；五个区块、依据键、禁用确定性措辞和风险优先级均符合测试。

- [ ] **Step 6: Commit the dynamic-template change**

```powershell
git add -- src/domain/interpretation.js test/domain/interpretation.test.js
git commit -m "feat: clarify divination guidance"
```

### Task 3: 完整验证与浏览器验收

**Files:**
- Verify: `src/data/interpretation-rules.js`
- Verify: `src/domain/interpretation.js`
- Verify: `test/domain/interpretation.test.js`

- [ ] **Step 1: Scan changed text for forbidden certainty**

Run:

```powershell
rg -n "必然|一定|保证|注定|稳赚|治愈|包治" src/data/interpretation-rules.js src/domain/interpretation.js
```

Expected: 仅允许出现“不是具体日期或结果保证”中的否定性边界；不得出现承诺结果的肯定句。

- [ ] **Step 2: Run the complete automated test suite**

Run: `node --test`

Expected: 全部测试通过，失败数为 `0`。

- [ ] **Step 3: Build the production output**

Run: `node tools/build.mjs`

Expected: 退出码为 `0`；`dist/` 包含应用壳、静态资源、`_headers`、`robots.txt` 与版本化 Service Worker。

- [ ] **Step 4: Check patch hygiene**

```powershell
git diff --check HEAD~2..HEAD
git status -sb
```

Expected: `git diff --check` 无输出；工作树无未提交修改。

- [ ] **Step 5: Verify a representative result in the in-app browser**

Run: `node tools/dev-server.mjs --root . --port 4173`

使用 in-app Browser 打开 `http://localhost:4173/`，完成一次普通起卦并确认：

- “局势摘要”显示传统体用术语及紧随其后的括号白话。
- “有利因素”“阻碍因素”“时机倾向”“行动建议”均能直接理解。
- “推演依据”和经典原文仍与现代解读分层。
- 页面无控制台错误，390px 视口无横向溢出。

- [ ] **Step 6: Prepare the branch for review**

```powershell
git log --oneline --decorate -4
git status -sb
```

Expected: 分支包含设计提交、计划提交及两次功能提交，工作树干净；未经用户明确授权不得推送或创建 PR。
