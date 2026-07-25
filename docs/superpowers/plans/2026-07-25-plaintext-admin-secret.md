# Plaintext Admin Secret Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PBKDF2 admin-password configuration with the Cloudflare Pages production secret `ADMIN_PASSWORD` while preserving secure session cookies and generic login failures.

**Architecture:** The login handler reads only `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`. A new helper hashes the submitted and configured plaintext values with Web Crypto SHA-256, then compares the equal-length digests using the existing byte comparison loop. The obsolete hash generator and package command are removed after tests prove the new contract.

**Tech Stack:** Cloudflare Pages Functions, Web Crypto, Node test runner, Wrangler Pages secrets.

---

### Task 1: Define Plaintext Password Verification

**Files:**
- Modify: `test/functions/admin-auth.test.js`
- Modify: `functions/_lib/admin-auth.js`

- [ ] **Step 1: Write the failing helper tests**

Replace the PBKDF2 test with assertions for `verifyAdminSecret`:

```js
import { verifyAdminSecret, createAdminSession, verifyAdminSession, adminCookie } from '../../functions/_lib/admin-auth.js';

test('admin plaintext secret is compared without direct string equality', async () => {
  assert.equal(await verifyAdminSecret('correct horse battery staple', 'correct horse battery staple'), true);
  assert.equal(await verifyAdminSecret('wrong', 'correct horse battery staple'), false);
  assert.equal(await verifyAdminSecret('密碼一二三', '密碼一二三'), true);
  assert.equal(await verifyAdminSecret('', ''), false);
  assert.equal(await verifyAdminSecret('short', 'a much longer password'), false);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
& "$env:TEMP\codex-node-v24.14.0\node-v24.14.0-win-x64\node.exe" --test test/functions/admin-auth.test.js
```

Expected: FAIL because `verifyAdminSecret` is not exported.

- [ ] **Step 3: Implement the minimal digest comparison**

In `functions/_lib/admin-auth.js`, remove PBKDF2 password generation and verification, retain `equalBytes`, and add:

```js
async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export async function verifyAdminSecret(password, expected) {
  if (!password || !expected) return false;
  return equalBytes(await sha256(String(password)), await sha256(String(expected)));
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the same focused command. Expected: both authentication tests pass.

- [ ] **Step 5: Commit the helper change**

```bash
git add test/functions/admin-auth.test.js functions/_lib/admin-auth.js
git commit -m "refactor: verify plaintext admin secret"
```

### Task 2: Migrate the Login Handler Contract

**Files:**
- Create: `test/functions/admin-session.test.js`
- Modify: `functions/api/admin/session.js`

- [ ] **Step 1: Write failing handler tests**

Create tests that call `onRequestPost` with `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`, then assert:

```js
test('admin session authenticates with ADMIN_PASSWORD', async () => {
  const response = await onRequestPost({ request: loginRequest('密碼一二三'), env: { ADMIN_PASSWORD: '密碼一二三', ADMIN_SESSION_SECRET: 'session-secret' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).authenticated, true);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
});

test('admin session rejects mismatch and missing plaintext configuration', async () => {
  const mismatch = await onRequestPost({ request: loginRequest('wrong'), env: { ADMIN_PASSWORD: 'expected', ADMIN_SESSION_SECRET: 'session-secret' } });
  assert.equal(mismatch.status, 401);
  assert.deepEqual(await mismatch.json(), { errorCode: 'invalid_credentials' });
  const missing = await onRequestPost({ request: loginRequest('expected'), env: { ADMIN_SESSION_SECRET: 'session-secret' } });
  assert.equal(missing.status, 503);
});
```

- [ ] **Step 2: Run the handler test and confirm RED**

Run the new test file. Expected: correct plaintext password still returns `503` because the handler requires `ADMIN_PASSWORD_HASH`.

- [ ] **Step 3: Switch the handler to the new helper and Secret**

Update `functions/api/admin/session.js` to import `verifyAdminSecret`, require `env.ADMIN_PASSWORD`, and pass the configured plaintext secret to the helper. Do not add a hash fallback.

- [ ] **Step 4: Run handler and auth tests**

Run both focused files. Expected: all tests pass.

- [ ] **Step 5: Commit the handler migration**

```bash
git add test/functions/admin-session.test.js functions/api/admin/session.js
git commit -m "feat: use Cloudflare admin password secret"
```

### Task 3: Remove Obsolete Hash Tooling and Document Configuration

**Files:**
- Modify: `package.json`
- Delete: `tools/hash-admin-password.mjs`
- Modify: `README.md`

- [ ] **Step 1: Add a failing repository contract test**

Extend `test/tooling/wrangler-config.test.js` or add a focused tooling test that asserts `package.json` has no `hash-admin-password` script and repository source no longer documents `ADMIN_PASSWORD_HASH` as the active production setting.

- [ ] **Step 2: Run the test and confirm RED**

Expected: FAIL because the old script and documentation still exist.

- [ ] **Step 3: Remove obsolete tooling**

Delete the package script and hash generator. Update README production setup to require `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`, with an explicit instruction never to commit the plaintext value.

- [ ] **Step 4: Run focused and full tests**

Run the tooling tests, then `npm test` and `npm run build`. Expected: all tests pass and `dist` is rebuilt.

- [ ] **Step 5: Commit the cleanup**

```bash
git add package.json README.md test/tooling/wrangler-config.test.js tools/hash-admin-password.mjs
git commit -m "docs: remove admin hash setup"
```

### Task 4: Configure and Deploy Production

**Files:**
- No source files; Cloudflare Pages production configuration only.

- [ ] **Step 1: Create `ADMIN_PASSWORD` without exposing it**

Open Cloudflare Pages production variables or run `wrangler pages secret put ADMIN_PASSWORD --project-name cyber-divination`. The user enters the password directly; do not read clipboard contents or command output containing the value.

- [ ] **Step 2: Confirm required secret names**

Run `wrangler pages secret list --project-name cyber-divination`. Expected: `ADMIN_PASSWORD`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, and `OPENAI_API_KEY` are listed during the rollback window.

- [ ] **Step 3: Deploy the tested `dist` output to `main`**

Run `wrangler pages deploy dist --project-name cyber-divination --branch main` and record the deployment ID without exposing secrets.

- [ ] **Step 4: Verify production login and logout**

Open `https://cyber-divination.pages.dev/admin`. The user enters the password. Confirm login, list access, one detail view, logout, and rejection after logout.

- [ ] **Step 5: Delete the old hash secret**

Run `wrangler pages secret delete ADMIN_PASSWORD_HASH --project-name cyber-divination` only after the new flow succeeds. Confirm the secret list no longer includes it.

- [ ] **Step 6: Log out and clean temporary OAuth files**

Run `wrangler logout`, verify `wrangler whoami` reports unauthenticated, and remove only the explicitly named temporary OAuth helper/status files.

