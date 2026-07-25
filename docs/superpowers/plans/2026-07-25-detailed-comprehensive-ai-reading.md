# Detailed Comprehensive AI Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every new AI deep reading produce a detailed, question-specific four-part comprehensive hexagram interpretation with explicit conclusions and safe domain-specific boundaries.

**Architecture:** Retain the existing `comprehensive_hexagram_reading` object and renderer. Tighten JSON Schema cardinalities so the provider must return three hexagram foundation points, at least two conditional trend branches, and three to five conclusions. Strengthen the system prompt and prompt tests rather than adding a duplicate prose field.

**Tech Stack:** Cloudflare Pages Functions, OpenAI-compatible structured outputs, JSON Schema, Node test runner, vanilla JavaScript UI.

---

### Task 1: Specify Detailed Structured Output

**Files:**
- Modify: `test/functions/openai.test.js`
- Modify: `functions/_lib/ai-schema.js`

- [ ] **Step 1: Write failing schema cardinality assertions**

Extend the existing schema test:

```js
assert.equal(schema.properties.foundation_points.minItems, 3);
assert.equal(schema.properties.trend_branches.minItems, 2);
assert.equal(schema.properties.conclusions.minItems, 3);
assert.equal(schema.properties.conclusions.maxItems, 5);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run `node --test test/functions/openai.test.js`. Expected: cardinality assertions fail because all fields currently share the generic one-item list schema.

- [ ] **Step 3: Add field-specific list schemas**

In `functions/_lib/ai-schema.js`, keep the generic list for ordinary sections and introduce:

```js
const foundationPoints = { ...list, minItems: 3, maxItems: 6 };
const trendBranches = { ...list, minItems: 2, maxItems: 6 };
const conclusions = { ...list, minItems: 3, maxItems: 5 };
```

Assign these schemas to `foundation_points`, `trend_branches`, and `conclusions`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Expected: the schema and provider request tests pass.

- [ ] **Step 5: Commit the schema constraint**

```bash
git add test/functions/openai.test.js functions/_lib/ai-schema.js
git commit -m "feat: require detailed comprehensive readings"
```

### Task 2: Enforce Question-Specific Four-Part Reasoning

**Files:**
- Modify: `test/functions/prompt.test.js`
- Modify: `functions/_lib/prompt.js`

- [ ] **Step 1: Write failing prompt requirements**

Add assertions that `SYSTEM_PROMPT` requires all of the following:

```js
assert.match(SYSTEM_PROMPT, /每一卦.*当前问题/);
assert.match(SYSTEM_PROMPT, /至少两个条件分支/);
assert.match(SYSTEM_PROMPT, /三至五条/);
assert.match(SYSTEM_PROMPT, /有利条件、不足限制和关键隐患/);
assert.match(SYSTEM_PROMPT, /体育为胜负核心/);
assert.match(SYSTEM_PROMPT, /不得把三卦合并成一句/);
assert.match(SYSTEM_PROMPT, /温馨提示.*问题类型/);
```

- [ ] **Step 2: Run the prompt test and confirm RED**

Expected: the newly required detail and dynamic-domain phrases are absent.

- [ ] **Step 3: Strengthen rules 7 and 8**

Update the system prompt to require:

- separate question-specific explanations for original, mutual, and changed hexagrams;
- explicit body/use strengths, limitations, and risks tied to real actors or conditions;
- at least two conditional branches;
- three to five non-repetitive conclusions covering suitability, unsuitability, risk, priority action, and verification signal;
- dynamic domain meaning for sports, relationships, career, finance, and task completion;
- a problem-specific disclaimer;
- no fabricated probabilities, exact scores, dates, injuries, amounts, or guaranteed outcomes.

- [ ] **Step 4: Run prompt and OpenAI tests**

Expected: both focused files pass and request payloads still use strict structured output.

- [ ] **Step 5: Commit the prompt enhancement**

```bash
git add test/functions/prompt.test.js functions/_lib/prompt.js
git commit -m "feat: deepen question-specific hexagram synthesis"
```

### Task 3: Preserve Rendering and Legacy Upgrade Behavior

**Files:**
- Modify: `test/app/result-model.test.js`
- Verify: `src/ui/views/result.js`

- [ ] **Step 1: Add detailed rendering assertions**

Extend the comprehensive reading fixture to include at least two trend branches and assert the rendered HTML contains the four numbered sections, strengths, weaknesses, risks, multiple branches, conclusions, and the type-specific disclaimer.

- [ ] **Step 2: Run the result test**

If it passes immediately, record that no production renderer change is required because the existing renderer already satisfies the approved design. If it fails, make only the minimal renderer change needed for the missing content.

- [ ] **Step 3: Verify legacy upgrade behavior**

Run the existing test that renders a completed legacy reading without `comprehensive_hexagram_reading`. Expected: the regenerate action remains visible and no empty comprehensive card is rendered.

- [ ] **Step 4: Commit any test or renderer adjustments**

```bash
git add test/app/result-model.test.js src/ui/views/result.js
git commit -m "test: cover detailed comprehensive reading layout"
```

### Task 4: Full Verification and Production Deployment

**Files:**
- Generated: `dist/**`

- [ ] **Step 1: Run the complete test suite**

Run `npm test`. Expected: all tests pass with no warnings or skipped failures.

- [ ] **Step 2: Build production assets**

Run `npm run build`. Expected: build exits zero and `dist` contains the updated Function bundle and client assets.

- [ ] **Step 3: Deploy with the admin-secret migration**

Deploy the single tested build after `ADMIN_PASSWORD` exists in production.

- [ ] **Step 4: Generate a new reading and inspect all four sections**

Use a concrete non-sensitive question. Confirm every section references the actual question, all three hexagrams are explained separately, at least two conditional branches appear, and conclusions contain explicit `宜` and `不宜` guidance.

- [ ] **Step 5: Verify an old reading can be regenerated**

Open a legacy record, trigger “生成新版综合卦象解读”, and confirm the new structure appears without changing immutable casting facts.

