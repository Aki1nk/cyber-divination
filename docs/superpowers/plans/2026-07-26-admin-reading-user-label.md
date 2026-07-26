# 后台占问记录用户标注 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在管理员后台的占问列表和详情中显示关联用户的昵称与完整手机号，并兼容未关联账号的历史记录。

**Architecture:** 仓库层为管理员列表增加 `LEFT JOIN users`，并新增管理员专用详情查询 `getAdmin()`，避免改变普通用户读取路径。视图层使用单一 `formatReadingUser()` 生成用户名展示文本，确保列表、详情和历史记录采用相同规则。

**Tech Stack:** Cloudflare Pages Functions、D1 SQL、原生 JavaScript、Node.js `node:test`

---

### Task 1: 为管理员占问查询关联用户

**Files:**
- Modify: `test/functions/readings-repository.test.js`
- Modify: `functions/_lib/readings-repository.js`

- [ ] **Step 1: 写列表和详情的失败测试**

在 `test/functions/readings-repository.test.js` 增加：

```js
test('repository joins users for admin reading list and detail', async () => {
  const db = fakeDb([
    { count: 1 },
    { results: [{ id: 'reading-1', user_nickname: '林', user_phone: '13800138000' }] },
    { id: 'reading-1', user_nickname: '林', user_phone: '13800138000' }
  ]);
  const repository = createReadingsRepository(db);
  const list = await repository.list();
  const detail = await repository.getAdmin('reading-1');

  assert.match(db.calls[0].sql, /LEFT JOIN users/);
  assert.match(db.calls[1].sql, /users\.nickname AS user_nickname/);
  assert.match(db.calls[2].sql, /LEFT JOIN users/);
  assert.equal(list.items[0].user_phone, '13800138000');
  assert.equal(detail.user_nickname, '林');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test test/functions/readings-repository.test.js`

Expected: FAIL，因为 `getAdmin` 尚不存在，列表 SQL 也没有关联 `users`。

- [ ] **Step 3: 实现管理员关联查询**

在 `functions/_lib/readings-repository.js`：

```js
async getAdmin(id) {
  return parseRow(await db.prepare(`
    SELECT readings.*, users.nickname AS user_nickname, users.phone AS user_phone
    FROM readings
    LEFT JOIN users ON users.id = readings.user_id
    WHERE readings.id = ?
    LIMIT 1
  `).bind(id).first());
}
```

将 `list()` 的计数与列表查询改为同一个 `LEFT JOIN users` 数据源，并将筛选字段限定为 `readings.question`、`readings.background`、`readings.device_id`、`readings.status`、`readings.category`。列表选择字段增加：

```sql
users.nickname AS user_nickname,
users.phone AS user_phone
```

- [ ] **Step 4: 运行仓库测试并确认通过**

Run: `node --test test/functions/readings-repository.test.js`

Expected: 所有仓库测试 PASS。

### Task 2: 管理员详情接口使用专用查询

**Files:**
- Modify: `test/functions/admin-api.test.js`
- Modify: `functions/_lib/admin-api.js`

- [ ] **Step 1: 写失败测试**

在管理员详情测试的 repository stub 中只提供 `getAdmin()`，并断言响应包含：

```js
{
  item: {
    id: 'reading-1',
    user_nickname: '林',
    user_phone: '13800138000'
  }
}
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test test/functions/admin-api.test.js`

Expected: FAIL，因为 `handleAdminDetail()` 仍调用 `repository.get()`。

- [ ] **Step 3: 改用管理员详情查询**

在 `functions/_lib/admin-api.js` 中将：

```js
const item = await repository.get(context.readingId);
```

改为：

```js
const item = await repository.getAdmin(context.readingId);
```

- [ ] **Step 4: 运行管理员 API 测试**

Run: `node --test test/functions/admin-api.test.js`

Expected: PASS。

### Task 3: 后台列表和详情显示用户名

**Files:**
- Modify: `test/app/admin.test.js`
- Modify: `src/ui/views/admin.js`

- [ ] **Step 1: 写三种展示规则的失败测试**

扩展 `test/app/admin.test.js`，覆盖：

```js
assert.match(renderAdminDashboard({ items: [{ user_nickname: '林', user_phone: '13800138000', /* required fields */ }] }), /林（13800138000）/);
assert.match(renderAdminDashboard({ items: [{ user_nickname: '', user_phone: '13900139000', /* required fields */ }] }), /未设置昵称（13900139000）/);
assert.match(renderAdminDetail({ id: 'legacy', status: 'completed' }), /旧记录（未关联用户）/);
```

同时使用昵称 `'<林>'` 断言输出包含 `&lt;林&gt;`，不包含原始标签。

- [ ] **Step 2: 运行视图测试并确认失败**

Run: `node --test test/app/admin.test.js`

Expected: FAIL，因为列表没有“用户”列，详情没有“占问用户”。

- [ ] **Step 3: 实现统一格式化与展示**

在 `src/ui/views/admin.js` 增加：

```js
function formatReadingUser(item) {
  if (!item.user_phone) return '旧记录（未关联用户）';
  return `${String(item.user_nickname ?? '').trim() || '未设置昵称'}（${item.user_phone}）`;
}
```

列表表头新增“用户”，每行输出：

```js
<td>${escapeHtml(formatReadingUser(item))}</td>
```

详情页标题区域或首个信息区新增：

```js
<span>占问用户：${escapeHtml(formatReadingUser(item))}</span>
```

调整空列表行的 `colspan`，保持表格结构正确。

- [ ] **Step 4: 运行视图测试并确认通过**

Run: `node --test test/app/admin.test.js`

Expected: PASS。

### Task 4: 完整验证与发布

**Files:**
- Verify: `functions/_lib/readings-repository.js`
- Verify: `functions/_lib/admin-api.js`
- Verify: `src/ui/views/admin.js`
- Verify: related tests and build output

- [ ] **Step 1: 运行相关测试**

Run:

```powershell
node --test test/functions/readings-repository.test.js test/functions/admin-api.test.js test/app/admin.test.js
```

Expected: 所有相关测试 PASS。

- [ ] **Step 2: 运行完整测试和构建**

Run:

```powershell
node --test
node tools/build.mjs
```

Expected: 全部测试 PASS，构建退出码为 `0`。

- [ ] **Step 3: 发布修复分支并创建 PR**

创建 `codex/admin-reading-user-label` 分支，只提交本计划涉及的代码、测试和规格文档，创建 PR 到 `main`。

- [ ] **Step 4: 验证 Preview 与生产环境**

在 Cloudflare Preview 后台确认：

- 新记录显示 `昵称（完整手机号）`。
- 无昵称账户显示 `未设置昵称（完整手机号）`。
- 历史记录显示 `旧记录（未关联用户）`。
- 详情页显示相同用户文本。

Preview 验证通过后合并 PR，等待生产部署并复查正式后台。
