# Configurable Responses API Relay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Cloudflare Pages Functions to call Tokunex or the official OpenAI Responses API through server-side environment configuration while accurately disclosing the third-party relay path.

**Architecture:** Keep the existing Responses API request and structured-output parser intact. Add validated server-side request URL/model resolution in `openai.js`, pass environment configuration through `readings-api.js`, and update user-visible privacy wording plus deployment documentation. The browser never receives provider credentials or endpoints.

**Tech Stack:** JavaScript ES modules, Node.js test runner, Cloudflare Pages Functions, Cloudflare D1, Responses API-compatible HTTP endpoints.

---

### Task 1: Add validated provider configuration

**Files:**
- Modify: `test/functions/openai.test.js`
- Modify: `functions/_lib/openai.js`

- [ ] **Step 1: Write failing relay URL and model tests**

Add tests that call `requestAiReading` with `baseUrl: 'https://tokunex.com/v1'` and `model: 'gpt-5.4-mini'`, then assert:

```js
assert.equal(request.url, 'https://tokunex.com/v1/responses');
assert.equal(request.body.model, 'gpt-5.4-mini');
```

Add cases for a trailing slash, an already-complete `/responses` URL, and an insecure `http://` URL rejected with `provider_not_configured`.

- [ ] **Step 2: Run provider tests and verify RED**

Run: `node --test test/functions/openai.test.js`

Expected: FAIL because `requestAiReading` ignores `baseUrl` and `model`.

- [ ] **Step 3: Implement minimal provider resolution**

Add defaults and a URL resolver in `functions/_lib/openai.js`:

```js
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-5.4-mini';

function responsesUrl(value) {
  const raw = String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  let url;
  try { url = new URL(raw); } catch { throw new OpenAIRequestError('provider_not_configured'); }
  if (url.protocol !== 'https:') throw new OpenAIRequestError('provider_not_configured');
  return url.pathname.endsWith('/responses') ? url.toString().replace(/\/$/, '') : `${url.toString().replace(/\/$/, '')}/responses`;
}
```

Update the public function signature and request body:

```js
export async function requestAiReading({ apiKey, baseUrl, model, payload, risk, fetchImpl = fetch, timeoutMs = 45_000 }) {
  const requestUrl = responsesUrl(baseUrl);
  const requestModel = String(model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  // fetchImpl(requestUrl, ...)
  // body.model = requestModel
}
```

- [ ] **Step 4: Run provider tests and verify GREEN**

Run: `node --test test/functions/openai.test.js`

Expected: all provider tests pass.

- [ ] **Step 5: Commit provider configuration**

```bash
git add functions/_lib/openai.js test/functions/openai.test.js
git commit -m "feat: configure Responses API provider"
```

### Task 2: Pass Cloudflare environment settings into AI requests

**Files:**
- Modify: `test/functions/readings-api.test.js`
- Modify: `functions/_lib/readings-api.js`

- [ ] **Step 1: Write failing environment propagation test**

Use an injected `ai` function that records its input and call the create handler with:

```js
env: {
  OPENAI_API_KEY: 'key',
  OPENAI_BASE_URL: 'https://tokunex.com/v1',
  OPENAI_MODEL: 'gpt-5.4-mini'
}
```

Assert the injected function receives:

```js
assert.equal(aiInput.apiKey, 'key');
assert.equal(aiInput.baseUrl, 'https://tokunex.com/v1');
assert.equal(aiInput.model, 'gpt-5.4-mini');
```

- [ ] **Step 2: Run API tests and verify RED**

Run: `node --test test/functions/readings-api.test.js`

Expected: FAIL because only `apiKey` is passed to the AI client.

- [ ] **Step 3: Thread provider configuration through create and retry**

Change `runAi` to accept a provider object and call:

```js
const result = await ai({
  apiKey: provider.apiKey,
  baseUrl: provider.baseUrl,
  model: provider.model,
  payload,
  risk
});
```

Create the provider object from `env.OPENAI_API_KEY`, `env.OPENAI_BASE_URL`, and `env.OPENAI_MODEL` in both create and retry handlers.

- [ ] **Step 4: Run API tests and verify GREEN**

Run: `node --test test/functions/readings-api.test.js`

Expected: all readings API tests pass.

- [ ] **Step 5: Commit environment propagation**

```bash
git add functions/_lib/readings-api.js test/functions/readings-api.test.js
git commit -m "feat: pass relay settings to AI client"
```

### Task 3: Correct privacy disclosure and deployment documentation

**Files:**
- Modify: `test/ui/ask.test.js`
- Modify: `test/app/privacy.test.js`
- Modify: `src/ui/views/ask.js`
- Modify: `src/ui/views/privacy.js`
- Modify: `README.md`
- Modify: `wrangler.example.jsonc`

- [ ] **Step 1: Write failing disclosure tests**

Replace assertions that require the word `OpenAI` with assertions for the actual relay disclosure:

```js
assert.match(html, /第三方 AI 中转服务/);
assert.match(html, /中转服务及其上游供应商/);
```

- [ ] **Step 2: Run disclosure tests and verify RED**

Run: `node --test test/ui/ask.test.js test/app/privacy.test.js`

Expected: FAIL because the current views claim direct OpenAI processing.

- [ ] **Step 3: Update the two user-visible disclosures**

Use the approved wording in the ask confirmation and privacy page. State that `store: false` is sent as a request parameter, but provider retention follows the relay and upstream providers' policies.

- [ ] **Step 4: Document Cloudflare variables**

Update `README.md` to list:

```text
OPENAI_API_KEY   Secret
OPENAI_BASE_URL  https://tokunex.com/v1
OPENAI_MODEL     gpt-5.4-mini
```

Add non-secret example values to `wrangler.example.jsonc` under `vars`, without adding an API key.

- [ ] **Step 5: Run disclosure tests and verify GREEN**

Run: `node --test test/ui/ask.test.js test/app/privacy.test.js`

Expected: both test files pass.

- [ ] **Step 6: Commit disclosure and docs**

```bash
git add src/ui/views/ask.js src/ui/views/privacy.js test/ui/ask.test.js test/app/privacy.test.js README.md wrangler.example.jsonc
git commit -m "docs: disclose configurable AI relay"
```

### Task 4: Verify, publish, and deploy

**Files:**
- Verify: all modified files

- [ ] **Step 1: Run the full automated test suite**

Run: `node --test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `node tools/build.mjs`

Expected: build completes and writes `dist`.

- [ ] **Step 3: Run source checks**

Run:

```bash
git diff --check
node --check functions/_lib/openai.js
node --check functions/_lib/readings-api.js
```

Expected: all commands exit successfully.

- [ ] **Step 4: Push and create a PR**

Push `codex/tokunex-responses-api`, create a PR to `main`, confirm Cloudflare preview passes, and merge only after verification.

- [ ] **Step 5: Configure Cloudflare Production**

Set `OPENAI_API_KEY` as a Secret, and set `OPENAI_BASE_URL=https://tokunex.com/v1` plus `OPENAI_MODEL=gpt-5.4-mini` as production variables. Keep the existing `DB` binding.

- [ ] **Step 6: Redeploy and perform live acceptance**

Redeploy the latest `main`, submit one non-sensitive test question, confirm AI status reaches `completed`, verify the D1 row has a 30-day expiry, and verify retry behavior if the first provider call fails.
