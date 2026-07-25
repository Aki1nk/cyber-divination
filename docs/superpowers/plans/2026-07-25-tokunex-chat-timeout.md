# Tokunex Chat Timeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Tokunex 中转请求直接使用 Chat Completions，并把 AI 总超时提高到 180 秒。

**Architecture:** 保留官方 OpenAI 的 Responses API 路径；当 `providerUrls` 判定为中转站时，`requestAiReading` 在同一个 AbortController 下直接调用 Chat Completions。默认超时使用导出常量，测试同时验证路由和时限。

**Tech Stack:** Cloudflare Pages Functions、JavaScript、Node.js test runner、Fetch API

---

### Task 1: 锁定中转路由与超时

**Files:**
- Modify: `test/functions/openai.test.js`

- [ ] **Step 1: 写失败测试**

新增断言：Tokunex 请求只命中 `https://tokunex.com/v1/chat/completions`，并断言默认超时常量为 `180_000`。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/functions/openai.test.js`
Expected: FAIL，因为当前仍先请求 Responses，且默认超时仍为 45 秒。

### Task 2: 实现中转直连

**Files:**
- Modify: `functions/_lib/openai.js`

- [ ] **Step 1: 添加默认超时常量**

导出 `DEFAULT_AI_TIMEOUT_MS = 180_000`，并作为 `requestAiReading` 的默认 `timeoutMs`。

- [ ] **Step 2: 中转站直接调用 Chat Completions**

在创建统一 AbortController 后，如果 `urls.isRelay` 为真，立即调用 `requestChatCompletions`；官方地址保留 Responses API 流程。

- [ ] **Step 3: 运行专项测试**

Run: `node --test test/functions/openai.test.js`
Expected: PASS。

### Task 3: 完整验证

**Files:**
- Verify: `functions/_lib/openai.js`
- Verify: `test/functions/openai.test.js`

- [ ] **Step 1: 运行完整测试**

Run: `npm test`
Expected: 所有测试通过。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`
Expected: 构建成功并生成 `dist`。
