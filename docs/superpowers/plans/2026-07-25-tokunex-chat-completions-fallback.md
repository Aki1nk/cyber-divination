# Tokunex Chat Completions Compatibility Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve Responses API as primary while allowing Tokunex to complete readings through its OpenAI-compatible Chat Completions route when `/responses` is unavailable.

**Architecture:** Extend the existing provider adapter in `functions/_lib/openai.js` with a single relay-only fallback. Reuse the approved prompt and JSON Schema, keep stable public error codes, and cover the production failure with a focused unit test before implementation.

**Tech Stack:** Cloudflare Pages Functions, JavaScript ES modules, Node.js test runner, OpenAI-compatible Responses and Chat Completions JSON contracts.

---

### Task 1: Reproduce relay fallback behavior

**Files:**
- Modify: `test/functions/openai.test.js`

- [ ] **Step 1: Write the failing fallback test**

Add a test whose injected fetch returns HTTP 500 for `https://tokunex.com/v1/responses`, then returns a valid Chat Completions structured message for `https://tokunex.com/v1/chat/completions`. Assert both URLs, `response_format.type === 'json_schema'`, `response_format.json_schema.strict === true`, `reasoning_effort === 'medium'`, `store === false`, and the completed reading.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/functions/openai.test.js`

Expected: FAIL because only one Responses request is currently made and `provider_unavailable` is thrown.

### Task 2: Implement one compatibility attempt

**Files:**
- Modify: `functions/_lib/openai.js`

- [ ] **Step 1: Add relay URL normalization**

Derive both `/responses` and `/chat/completions` from the configured HTTPS base URL without duplicating either complete path.

- [ ] **Step 2: Add Chat Completions request and parser**

Send the existing system and user messages under `messages`, map the approved schema to `response_format: { type: 'json_schema', json_schema: { name, strict, schema } }`, and parse `choices[0].message.content` with the same required-field validation.

- [ ] **Step 3: Limit fallback eligibility**

Attempt fallback only for a configured non-default relay after Responses returns HTTP 400-499 other than 401, 403, or 429, or after HTTP 5xx. Keep timeout and network errors stable and do not retry official OpenAI traffic through another transport.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test test/functions/openai.test.js`

Expected: all provider tests pass.

### Task 3: Verify and publish

**Files:**
- Verify: `functions/_lib/openai.js`
- Verify: `test/functions/openai.test.js`

- [ ] **Step 1: Run all tests**

Run: `node --test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Build and check source**

Run: `node tools/build.mjs`, `node --check functions/_lib/openai.js`, and `git diff --check`.

Expected: all commands exit successfully.

- [ ] **Step 3: Commit, push, and open a PR**

Commit the focused change, push `codex/tokunex-chat-fallback`, create a PR to `main`, and merge after checks pass.

- [ ] **Step 4: Perform production acceptance**

Wait for Cloudflare Pages production deployment, submit one non-sensitive reading, require `status: completed`, then verify the D1 record and administrator detail view without exposing credentials.
