# GPT-5.4 mini Cloud Readings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add disclosed cloud storage, GPT-5.4 mini structured readings, retry support, protected administration, and 30-day D1 cleanup while preserving deterministic offline readings.

**Architecture:** The browser saves deterministic casting facts first and posts immutable snapshots to Pages Functions. Functions validate and reclassify risk, persist to D1, call OpenAI with a strict schema, and return safe public state. A scheduled Worker deletes expired data; `/admin` uses a signed HttpOnly cookie.

**Tech Stack:** Native ES modules, Node tests, Cloudflare Pages Functions/D1/Workers, OpenAI Responses API, Web Crypto.

---

### Task 1: Device Identity And Queue

**Files:** Create `src/cloud/device-id.js`, `src/cloud/upload-queue.js`, and tests; modify `src/storage/repository.js` and tests.

- [ ] Test UUID persistence, queue insertion, due selection, retry backoff, removal, and migration.
- [ ] Run focused tests and confirm failure.
- [ ] Implement identity helpers and repository queue methods.
- [ ] Re-run focused tests and confirm PASS.

### Task 2: Reading Contract And Schema

**Files:** Create `src/cloud/reading-contract.js`, `functions/_lib/ai-schema.js`, `functions/_lib/validation.js`, and tests.

- [ ] Test exact fields, limits, enums, IDs, question context, casting facts, local interpretation, and AI fields.
- [ ] Run focused tests and confirm failure.
- [ ] Implement `buildReadingUpload`, `validateReadingRequest`, and `AI_READING_JSON_SCHEMA`.
- [ ] Re-run focused tests and confirm PASS.

### Task 3: OpenAI Responses Client

**Files:** Create `functions/_lib/openai.js`, `functions/_lib/prompt.js`, and tests.

- [ ] Test model, reasoning, storage, tools, structured output, prompt specificity, parsing, refusal, timeout, and safe errors.
- [ ] Run focused tests and confirm failure.
- [ ] Implement the prompt and dependency-injected Responses API client.
- [ ] Re-run focused tests and confirm PASS.

### Task 4: D1 Repository

**Files:** Create `migrations/0001_cloud_readings.sql`, `functions/_lib/readings-repository.js`, and tests.

- [ ] Test idempotent create/read, status updates, attempts, admin filters, details, deletion, and expiry.
- [ ] Run focused tests and confirm failure.
- [ ] Create D1 tables/indexes and prepared-statement repository methods.
- [ ] Re-run focused tests and confirm PASS.

### Task 5: Public Reading API

**Files:** Create `functions/api/readings/index.js`, `functions/api/readings/[id]/retry.js`, `functions/_lib/http.js`, `functions/_lib/risk.js`, and tests.

- [ ] Test validation, server risk classification, idempotency, success, provider failure/refusal, retry ownership, and safe bodies.
- [ ] Run focused tests and confirm failure.
- [ ] Implement safe Pages handlers and professional-risk overrides.
- [ ] Re-run focused tests and confirm PASS.

### Task 6: Admin Authentication And APIs

**Files:** Create `functions/_lib/admin-auth.js`, admin API routes, and tests.

- [ ] Test PBKDF2 verification, signed secure sessions, authorization, login/logout, filters, pagination, detail, and deletion.
- [ ] Run focused tests and confirm failure.
- [ ] Implement Web Crypto authentication and no-store admin handlers.
- [ ] Re-run focused tests and confirm PASS.

### Task 7: Cleanup Worker

**Files:** Create `cleanup-worker/src/index.js`, `cleanup-worker/wrangler.jsonc`, and tests.

- [ ] Test scheduled deletion without selecting question content.
- [ ] Run focused tests and confirm failure.
- [ ] Implement daily D1 cleanup with `ctx.waitUntil()`.
- [ ] Re-run focused tests and confirm PASS.

### Task 8: Client Sync Integration

**Files:** Create `src/cloud/readings-client.js`, `src/cloud/sync-manager.js`, and tests; modify `src/app/cast-controller.js`, `src/app.js`, and related tests.

- [ ] Test pending state, non-blocking upload, completed storage, offline queueing, startup/online retries, and idempotency.
- [ ] Run focused tests and confirm failure.
- [ ] Implement client sync, record patching, and post-save casting hook.
- [ ] Re-run focused tests and confirm PASS.

### Task 9: Five-Tab Result UI

**Files:** Modify `src/ui/views/result.js`, `src/app.js`, `src/styles.css`, and result tests.

- [ ] Test five tabs, all AI states, twelve output fields, limitations, safety override, and retry controls.
- [ ] Run focused tests and confirm failure.
- [ ] Implement accessible AI status, detailed sections, and retry binding.
- [ ] Re-run focused tests and confirm PASS.

### Task 10: Disclosure And Admin UI

**Files:** Modify ask/privacy/styles; create `src/admin.js`, `src/ui/views/admin.js`, `admin.html`, and tests.

- [ ] Test persistent upload/OpenAI/30-day disclosure and admin login, filters, pagination, detail, delete, logout, loading, and errors.
- [ ] Run focused tests and confirm failure.
- [ ] Implement escaped same-origin admin UI and disclosure without storing secrets.
- [ ] Re-run focused tests and confirm PASS.

### Task 11: Build And Deployment

**Files:** Modify `tools/build.mjs`, `src/pwa/sw-template.js`, `_headers`, `README.md`, privacy docs, tooling tests; create `wrangler.jsonc`.

- [ ] Test admin build output, API/admin cache exclusion, no-store headers, and documented bindings/secrets.
- [ ] Run focused tests and confirm failure.
- [ ] Implement build copying, cache exclusions, D1/migration/secret/deployment documentation.
- [ ] Re-run focused tests and confirm PASS.

### Task 12: Full Verification

- [ ] Run `npm test`; expect zero failures.
- [ ] Run `npm run build`; expect exit code 0 and complete public/admin output.
- [ ] Verify casting, disclosure, local fallback, five tabs, retry states, responsive/keyboard behavior, and mocked admin flows in the in-app browser.
- [ ] Confirm no secrets leak, admin/API routes are not cached, safety constraints hold, and 30-day cleanup is configured.
