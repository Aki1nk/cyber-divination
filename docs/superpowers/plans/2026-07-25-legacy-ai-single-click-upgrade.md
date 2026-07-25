# Legacy AI Single-Click Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one click regenerate a legacy completed AI reading even when its local record initially lacks the cloud reading ID.

**Architecture:** Keep the existing queue and idempotent create path, then reload the record after synchronization. If the server restored an ID but returned a completed legacy payload, continue immediately through the existing forced retry path and persist the upgraded response.

**Tech Stack:** JavaScript ES modules, Node.js test runner, local repository abstraction, Cloudflare Pages deployment.

---

### Task 1: Reproduce the Missing-ID Upgrade Gap

**Files:**
- Modify: `test/cloud/sync-manager.test.js`

- [ ] **Step 1: Add the failing regression test**

Create a completed legacy record with `readingId: null`. Configure `client.create()` to return the same legacy payload with `id: 'cloud-legacy'`, and configure `client.retry()` to return a payload containing `comprehensive_hexagram_reading`.

- [ ] **Step 2: Assert the complete single-click flow**

Assert that one `retryRecord()` call invokes create once, invokes retry once with `{ force: true }`, and stores the comprehensive result.

- [ ] **Step 3: Run the focused test and confirm RED**

Run `node --test test/cloud/sync-manager.test.js`. Expected: the new test fails because retry is not called after create restores the cloud ID.

### Task 2: Continue Through Forced Retry

**Files:**
- Modify: `src/cloud/sync-manager.js`

- [ ] **Step 1: Reload the record after queue synchronization**

Replace the early return after `queue()` and `flush()` with a refreshed record loaded through `repository.getRecord(record.id)`.

- [ ] **Step 2: Detect whether the refreshed result needs upgrading**

Continue only when the refreshed record has a cloud ID, is completed, and lacks `comprehensive_hexagram_reading`; otherwise return its current AI state.

- [ ] **Step 3: Reuse the existing retry persistence path**

Call `client.retry()` using the refreshed cloud ID and `{ force: true }`, then patch the record and notify `onRecordUpdated` exactly as for records that originally had a cloud ID.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run `node --test test/cloud/sync-manager.test.js`. Expected: all sync manager tests pass.

### Task 3: Verify and Publish

**Files:**
- Generated: `dist/**`

- [ ] **Step 1: Run all tests**

Run `npm test`. Expected: all tests pass.

- [ ] **Step 2: Build production assets**

Run `npm run build`. Expected: build exits with code zero.

- [ ] **Step 3: Publish through GitHub**

Create a `codex/` branch from the latest `main`, commit the source, test, and documentation changes, open a pull request, and merge it after checks pass.

- [ ] **Step 4: Verify Cloudflare Pages**

Wait for the production deployment check, then confirm the deployed `sync-manager.js` contains the post-flush refresh and forced retry logic.

