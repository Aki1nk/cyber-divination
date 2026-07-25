# AI Comprehensive Hexagram Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured four-part comprehensive hexagram interpretation to every newly generated AI reading.

**Architecture:** Extend the existing strict JSON Schema with one nested object, teach the prompt how each field must use immutable casting facts, and render the object as a dedicated section at the top of the completed AI tab. Preserve every existing field and tolerate older completed readings without the nested object.

**Tech Stack:** JavaScript ES modules, Node test runner, Cloudflare Pages Functions, OpenAI-compatible Responses API structured outputs, server-rendered HTML strings.

---

### Task 1: Lock the structured output contract

**Files:**
- Modify: `test/functions/openai.test.js`
- Modify: `functions/_lib/ai-schema.js`

- [ ] **Step 1: Write a failing schema assertion**

Assert that `comprehensive_hexagram_reading` is required, is an object with `additionalProperties: false`, and requires all ten approved fields.

- [ ] **Step 2: Run the focused schema test**

Run: `node --test test/functions/openai.test.js`

Expected: FAIL because the nested property does not exist.

- [ ] **Step 3: Add the nested strict JSON Schema**

Define bounded string and list fields for `foundation_summary`, `foundation_points`, `core_summary`, `strengths`, `weaknesses`, `key_risks`, `trend_summary`, `trend_branches`, `conclusions`, and `disclaimer`.

- [ ] **Step 4: Re-run the focused schema test**

Run: `node --test test/functions/openai.test.js`

Expected: PASS.

### Task 2: Require question-bound four-part content

**Files:**
- Modify: `test/functions/prompt.test.js`
- Modify: `functions/_lib/prompt.js`

- [ ] **Step 1: Write failing prompt assertions**

Require the prompt to name all four sections, use all three hexagrams plus body/use facts, adapt wording to every question category, and prohibit fabricated probabilities or guaranteed outcomes.

- [ ] **Step 2: Run the focused prompt test**

Run: `node --test test/functions/prompt.test.js`

Expected: FAIL because the new content contract is absent.

- [ ] **Step 3: Extend the system prompt**

Add explicit instructions for the nested object, conditional conclusions, sports anti-betting boundaries, and professional-risk precedence.

- [ ] **Step 4: Re-run the focused prompt test**

Run: `node --test test/functions/prompt.test.js`

Expected: PASS.

### Task 3: Render the comprehensive interpretation

**Files:**
- Modify: `test/app/result-model.test.js`
- Modify: `src/ui/views/result.js`
- Modify: `src/styles/result.css`

- [ ] **Step 1: Write a failing rendering test**

Create a completed AI fixture containing the nested object and assert the HTML includes “综合卦象解读”, the four numbered headings, representative list items, and the disclaimer.

- [ ] **Step 2: Run the focused result test**

Run: `node --test test/app/result-model.test.js`

Expected: FAIL because no comprehensive block is rendered.

- [ ] **Step 3: Add a defensive renderer**

Render the block before existing AI cards only when the nested object exists. Use escaped paragraphs and lists rather than raw Markdown or HTML.

- [ ] **Step 4: Add focused styles**

Reuse the existing AI card visual language while adding spacing and hierarchy for numbered subsections and the disclaimer.

- [ ] **Step 5: Re-run the focused result test**

Run: `node --test test/app/result-model.test.js`

Expected: PASS, including legacy completed readings without the new object.

### Task 4: Verify the complete application

**Files:**
- Verify: `functions/_lib/ai-schema.js`
- Verify: `functions/_lib/prompt.js`
- Verify: `src/ui/views/result.js`
- Verify: `src/styles/result.css`

- [ ] **Step 1: Run all tests**

Run: `node --test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Build production assets**

Run: `node tools/build.mjs`

Expected: exit code 0 and a refreshed `dist` output.

- [ ] **Step 3: Validate the rendered result page**

Open the local result fixture in the in-app browser and verify the four headings, lists, disclaimer, desktop layout, and console health.

