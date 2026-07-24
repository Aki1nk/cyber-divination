# 赛博天师 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一款手机优先、可安装、可离线运行，并能按可复核规则完成梅花易数起卦与《周易》分层解读的 PWA。

**Architecture:** 使用浏览器原生 ES Modules、Web APIs 与 Node 24 内置能力，不依赖 npm。梅花易数领域引擎、经典数据、解释规则、界面与本地存储相互分离；固定版本的 MIT 许可历法与《周易》数据通过校验脚本置入仓库。应用采用 Hash Router、原生 DOM 组件、`localStorage` 版本化仓库和生成式 Service Worker 构建流程。

**Tech Stack:** HTML5、CSS、原生 JavaScript ES Modules、Node.js 24 `node:test`、Web Crypto、Intl、Geolocation、Service Worker、Web App Manifest、`lunar-javascript@1.7.7`、`@freizl/yijing@2.1.0`。

---

## 实施前提

- 当前环境可执行 `node v24.14.0`，但 `npm` 与 `git` 不在 PATH 中。
- 本计划不依赖 npm；所有测试、构建与本地服务均直接通过 `node` 执行。
- 每个任务末尾保留 Git 提交步骤。开始执行前先让用户安装 Git for Windows 或提供可用的 `git.exe`；在 Git 不可用时不得伪称已提交。
- 设计规格位于 `docs/superpowers/specs/2026-07-24-cyber-divination-design.md`。

## 文件结构

```text
index.html                         应用入口与浏览器历法脚本加载
manifest.webmanifest               PWA 元数据
package.json                       ES Module 类型与可选脚本说明
public/icons/                      PWA 图标
src/app.js                         应用启动、路由挂载、SW 注册
src/app/router.js                  Hash Router 解析与导航
src/app/session.js                 起卦向导状态机
src/domain/                        排盘、历法、五行、解释与风险纯函数
src/data/                          外应映射、解释规则和经典加载器
src/vendor/                        固定版本第三方文件与许可证
src/storage/                       localStorage 仓库和问题指纹
src/ui/                            DOM 工具、布局、页面与组件
src/styles/                        设计令牌、布局、组件、动效和响应式样式
src/pwa/sw-template.js             Service Worker 模板
tools/vendor-assets.mjs            下载、校验、提取第三方文件
tools/build.mjs                    复制静态资源并生成 precache SW
tools/dev-server.mjs               本地静态服务器
test/                              Node 单元与集成测试
THIRD_PARTY_NOTICES.md             第三方来源与许可证说明
```

### Task 1: 建立无依赖静态项目与测试基线

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `manifest.webmanifest`
- Create: `src/app.js`
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Create: `tools/build.mjs`
- Create: `tools/dev-server.mjs`
- Test: `test/tooling/build.test.js`

- [ ] **Step 1: 写入失败的构建测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProject } from '../../tools/build.mjs';

test('buildProject copies the application shell', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'cyber-divination-'));
  try {
    await buildProject({ outputDir });
    assert.match(await readFile(join(outputDir, 'index.html'), 'utf8'), /赛博天师/);
    assert.match(await readFile(join(outputDir, 'manifest.webmanifest'), 'utf8'), /standalone/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test test/tooling/build.test.js`  
Expected: FAIL，提示无法找到 `tools/build.mjs`。

- [ ] **Step 3: 创建最小项目壳**

```json
{
  "name": "cyber-divination",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "build": "node tools/build.mjs",
    "dev": "node tools/dev-server.mjs --root . --port 4173"
  }
}
```

`index.html` 包含 `viewport`、主题色、manifest 链接、`src/styles/tokens.css`、`src/styles/base.css`、`src/vendor/lunar.global.js` 普通脚本和 `src/app.js` module 脚本。`manifest.webmanifest` 设置 `display: "standalone"`、`start_url: "/#/"`、中文名称和玄黑主题色。

```js
// tools/build.mjs
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const inputs = ['index.html', 'manifest.webmanifest', 'src', 'public', 'THIRD_PARTY_NOTICES.md'];

export async function buildProject({ outputDir = resolve(projectRoot, 'dist') } = {}) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  for (const input of inputs) await cp(resolve(projectRoot, input), resolve(outputDir, input), { recursive: true, force: true });
  return outputDir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildProject();
```

`tools/dev-server.mjs` 使用 `node:http`、路径穿越保护和明确 MIME 类型服务指定根目录；未知 Hash 路由仍返回 `index.html`，真实缺失资源返回 404。

- [ ] **Step 4: 运行基线验证并提交**

Run: `node --test test/tooling/build.test.js && node tools/build.mjs`  
Expected: 1 test PASS，生成 `dist/index.html` 与 `dist/manifest.webmanifest`。

```powershell
git add package.json index.html manifest.webmanifest src tools test
git commit -m "chore: establish static pwa foundation"
```

### Task 2: 固定并校验历法与《周易》数据

**Files:**
- Create: `tools/vendor-assets.mjs`
- Create: `src/vendor/lunar.global.js`
- Create: `src/vendor/lunar.cjs`
- Create: `src/vendor/64gua.json`
- Create: `src/vendor/LICENSE-lunar-javascript`
- Create: `src/vendor/LICENSE-yijing`
- Create: `THIRD_PARTY_NOTICES.md`
- Test: `test/data/vendor.test.js`

- [ ] **Step 1: 写入供应链完整性测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('vendored classics contain 64 unique hexagrams', async () => {
  const records = JSON.parse(await readFile('src/vendor/64gua.json', 'utf8'));
  assert.equal(records.length, 64);
  assert.equal(new Set(records.map((record) => record.id)).size, 64);
  assert.equal(records.find((record) => record.id === '111111').name, '乾');
  assert.equal(records.find((record) => record.id === '000000').name, '坤');
  assert.equal(records.find((record) => record.id === '100010').name, '屯');
});

test('vendored lunar library exposes Solar and Lunar', async () => {
  const lunar = await import('../../src/vendor/lunar.cjs');
  assert.equal(typeof lunar.default.Solar.fromYmd, 'function');
  assert.equal(typeof lunar.default.Lunar.fromYmd, 'function');
});
```

- [ ] **Step 2: 创建固定版本下载脚本**

`tools/vendor-assets.mjs` 下载并校验：

```js
const packages = [
  {
    name: 'lunar-javascript',
    url: 'https://registry.npmjs.org/lunar-javascript/-/lunar-javascript-1.7.7.tgz',
    sha512: 'u/KYiwPIBo/0bT+WWfU7qO1d+aqeB90Tuy4ErXenr2Gam0QcWeezUvtiOIyXR7HbVnW2I1DKfU0NBvzMZhbVQw=='
  },
  {
    name: '@freizl/yijing',
    url: 'https://registry.npmjs.org/@freizl/yijing/-/yijing-2.1.0.tgz',
    sha512: 'Gn6lveP8MeYkBNZ/6LYRn83sQPSB04iYUBe9vtMqCA8tWSFjDMGJnRNwb2WivhMWWqwXw2OTMvIPMQ+FsimI6A=='
  }
];
```

脚本使用 `crypto.createHash('sha512')` 比对 digest，调用系统 `tar` 解压，将 `lunar.js` 复制为 global 与 cjs 两份，将 `zh-CN/64gua.json` 和两个 LICENSE 写入 `src/vendor/`。校验失败时退出非零且不覆盖已有文件。

- [ ] **Step 3: 生成、验证、记录来源并提交**

Run: `node tools/vendor-assets.mjs && node --test test/data/vendor.test.js`  
Expected: 2 tests PASS。

`THIRD_PARTY_NOTICES.md` 写明包名、版本、仓库、许可证、使用文件和 SHA-512。

```powershell
git add tools/vendor-assets.mjs src/vendor THIRD_PARTY_NOTICES.md test/data/vendor.test.js
git commit -m "chore: vendor verified calendar and yijing data"
```

### Task 3: 实现八卦、取模与输入约束

**Files:**
- Create: `src/domain/modulo.js`
- Create: `src/domain/trigrams.js`
- Test: `test/domain/trigrams.test.js`

- [ ] **Step 1: 写入失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReportedInteger, moduloIndex } from '../../src/domain/modulo.js';
import { getTrigram } from '../../src/domain/trigrams.js';

test('modulo and exact integer rules are stable', () => {
  assert.equal(moduloIndex(8n, 8n), 8);
  assert.equal(moduloIndex(12n, 6n), 6);
  assert.equal(normalizeReportedInteger('900719925474099312345'), 900719925474099312345n);
  assert.throws(() => normalizeReportedInteger('-1'), /非负整数/);
});

test('trigram numbers follow the approved mapping', () => {
  assert.deepEqual(getTrigram(1), { number: 1, key: 'qian', name: '乾', lines: [1, 1, 1], element: 'metal', direction: 'northwest' });
  assert.equal(getTrigram(8).name, '坤');
});
```

- [ ] **Step 2: 实现、验证并提交**

`normalizeReportedInteger` 使用 `/^\d+$/` 校验后返回 `BigInt`。`moduloIndex` 返回 `Number(value % divisor || divisor)`。`trigrams.js` 导出冻结数组，顺序严格为乾、兑、离、震、巽、坎、艮、坤，爻数组均按自下而上约定。

Run: `node --test test/domain/trigrams.test.js`  
Expected: 2 tests PASS。

```powershell
git add src/domain/modulo.js src/domain/trigrams.js test/domain/trigrams.test.js
git commit -m "feat: add canonical trigram domain model"
```

### Task 4: 实现六爻、本卦、互卦、变卦与体用

**Files:**
- Create: `src/domain/hexagrams.js`
- Test: `test/domain/hexagrams.test.js`

- [ ] **Step 1: 写入卦象金样测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveHexagram } from '../../src/domain/hexagrams.js';

test('deriveHexagram builds mutual, changed, body and use', () => {
  const result = deriveHexagram({ upperNumber: 1, lowerNumber: 8, movingLine: 2 });
  assert.deepEqual(result.originalLines, [0, 0, 0, 1, 1, 1]);
  assert.deepEqual(result.changedLines, [0, 1, 0, 1, 1, 1]);
  assert.deepEqual(result.mutualLines, [0, 0, 1, 0, 1, 1]);
  assert.equal(result.body.key, 'qian');
  assert.equal(result.use.key, 'kun');
  assert.equal(result.originalId, '000111');
});

test('moving line in upper trigram makes upper the use trigram', () => {
  const result = deriveHexagram({ upperNumber: 1, lowerNumber: 8, movingLine: 5 });
  assert.equal(result.body.key, 'kun');
  assert.equal(result.use.key, 'qian');
});
```

- [ ] **Step 2: 实现、验证并提交**

`deriveHexagram` 连接下卦三爻与上卦三爻；互卦下卦取第 2–4 爻，互卦上卦取第 3–5 爻；变卦只翻转动爻。返回三个六位 ID、体用对象和全部中间爻数组，并校验数值范围。

Run: `node --test test/domain/hexagrams.test.js`  
Expected: 2 tests PASS。

```powershell
git add src/domain/hexagrams.js test/domain/hexagrams.test.js
git commit -m "feat: derive original mutual and changed hexagrams"
```

### Task 5: 实现五行关系与旺衰档案

**Files:**
- Create: `src/domain/five-elements.js`
- Test: `test/domain/five-elements.test.js`

- [ ] **Step 1: 写入失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { relationFromBody, seasonalStrength } from '../../src/domain/five-elements.js';

test('five-element relations and earth months are explicit', () => {
  assert.equal(relationFromBody('wood', 'fire'), 'body_generates_use');
  assert.equal(relationFromBody('wood', 'metal'), 'use_overcomes_body');
  assert.equal(relationFromBody('water', 'water'), 'same_element');
  assert.equal(seasonalStrength('earth', 6), 'prosperous');
});
```

- [ ] **Step 2: 实现、验证并提交**

使用固定生序 `wood → fire → earth → metal → water → wood` 与克序 `wood → earth → water → fire → metal → wood`。旺衰档案 ID 为 `four-seasons-earth-months-v1`，返回 `prosperous`、`supported`、`resting` 或 `weakened`。

Run: `node --test test/domain/five-elements.test.js`  
Expected: 1 test PASS。

```powershell
git add src/domain/five-elements.js test/domain/five-elements.test.js
git commit -m "feat: evaluate five element relations and strength"
```

### Task 6: 实现报数与现代随机取象

**Files:**
- Create: `src/domain/casting/number.js`
- Create: `src/domain/casting/random.js`
- Test: `test/domain/casting-number-random.test.js`

- [ ] **Step 1: 写入失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { castNumberPair, castNumberTriple } from '../../src/domain/casting/number.js';
import { castDigitalSymbol } from '../../src/domain/casting/random.js';

test('pair and triple profiles never mix moving-line rules', () => {
  assert.deepEqual(castNumberPair('9', '16'), { profileId: 'number-pair-v1', upperNumber: 1, lowerNumber: 8, movingLine: 1, raw: ['9', '16'] });
  assert.deepEqual(castNumberTriple('9', '16', '12'), { profileId: 'number-triple-v1', upperNumber: 1, lowerNumber: 8, movingLine: 6, raw: ['9', '16', '12'] });
});

test('digital symbol casting consumes exactly three secure values', () => {
  const values = [0, 7, 5];
  const result = castDigitalSymbol((max) => values.shift() % max);
  assert.deepEqual(result, { profileId: 'digital-symbol-v1', upperNumber: 1, lowerNumber: 8, movingLine: 6 });
  assert.equal(values.length, 0);
});
```

- [ ] **Step 2: 实现、验证并提交**

默认随机函数使用 `crypto.getRandomValues(new Uint32Array(1))` 和拒绝采样避免取模偏差；测试通过依赖注入使用确定性整数函数。两种报数档案调用 Task 3 的精确整数与取模函数。

Run: `node --test test/domain/casting-number-random.test.js`  
Expected: 2 tests PASS。

```powershell
git add src/domain/casting test/domain/casting-number-random.test.js
git commit -m "feat: add number and digital symbol casting"
```

### Task 7: 实现历法、子时、年界与真太阳时

**Files:**
- Create: `src/domain/calendar.js`
- Create: `src/domain/solar-time.js`
- Create: `src/domain/casting/time.js`
- Test: `test/domain/time-casting.test.js`

- [ ] **Step 1: 写入时间起卦金样测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createCalendarAdapter } from '../../src/domain/calendar.js';
import { castTime } from '../../src/domain/casting/time.js';
import { longitudeCorrectionMinutes } from '../../src/domain/solar-time.js';

const require = createRequire(import.meta.url);
const lunarApi = require('../../src/vendor/lunar.cjs');
const calendar = createCalendarAdapter(lunarApi);

test('1986-05-29 at 子时 produces the approved totals', () => {
  const result = castTime({ year: 1986, month: 5, day: 29, hour: 0, minute: 0 }, { calendar, dayBoundary: 'midnight', yearBoundary: 'lunar-new-year' });
  assert.equal(result.lunar.month, 4);
  assert.equal(result.lunar.day, 21);
  assert.equal(result.yearBranchNumber, 3);
  assert.deepEqual({ upper: result.upperNumber, lower: result.lowerNumber, moving: result.movingLine }, { upper: 4, lower: 5, moving: 5 });
});

test('23:00 requires an explicit day-boundary choice', () => {
  assert.throws(() => castTime({ year: 2026, month: 7, day: 24, hour: 23, minute: 30 }, { calendar, dayBoundary: null, yearBoundary: 'lunar-new-year' }), /子时换日/);
});

test('longitude correction is four minutes per degree', () => {
  assert.equal(longitudeCorrectionMinutes({ longitude: 121, standardMeridian: 120 }), 4);
});
```

- [ ] **Step 2: 实现历法适配器和时间口径**

`createCalendarAdapter` 只暴露农历年支、月数、日数、闰月标记和立春节气年支。月份使用绝对值，闰月单独记录；23:00–00:59 均映射为子时。

`castTime` 在 23:00–23:59 且未指定换日规则时抛出领域错误。`early-zi` 将历法日期推进一天，`midnight` 保持民用日期。默认年界使用农历年，高级档案使用立春年支。

`solar-time.js` 使用 NOAA 分数年公式计算 equation-of-time，再叠加 `4 × (longitude - UTC偏移对应中央经线)`；返回校正后时间和完整分钟差，不改变原始快照。

- [ ] **Step 3: 验证并提交**

Run: `node --test test/domain/time-casting.test.js`  
Expected: 3 tests PASS。

```powershell
git add src/domain/calendar.js src/domain/solar-time.js src/domain/casting/time.js test/domain/time-casting.test.js
git commit -m "feat: add auditable time casting profiles"
```

### Task 8: 实现外应起卦与依据不足状态

**Files:**
- Create: `src/data/external-mappings.js`
- Create: `src/domain/casting/external.js`
- Test: `test/domain/external-casting.test.js`

- [ ] **Step 1: 写入失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { castExternal } from '../../src/domain/casting/external.js';

test('external casting uses confirmed object, direction, count and hour', () => {
  assert.deepEqual(castExternal({ objectTrigram: 4, directionTrigram: 3, count: '2', hourBranchNumber: 7, confirmed: true }), {
    profileId: 'external-object-direction-v1', upperNumber: 4, lowerNumber: 3, movingLine: 6, rawTotal: '12'
  });
});

test('ambiguous mappings cannot cast before confirmation', () => {
  assert.throws(() => castExternal({ objectTrigram: 4, directionTrigram: 3, count: '2', hourBranchNumber: 7, confirmed: false }), /确认物象映射/);
});
```

- [ ] **Step 2: 创建映射并实现规则**

`external-mappings.js` 为八卦提供人物、动物、自然、器物和方位关键词，每条记录设置 `sourceKey: 'meihua-wan-wu-v1'`。方向固定为西北乾一、西兑二、南离三、东震四、东南巽五、北坎六、东北艮七、西南坤八。

`castExternal` 在缺少方向、数量或确认状态时抛出明确领域错误，不自动补 1。动爻原始总数为物数、方位卦数和时支数之和。

- [ ] **Step 3: 验证并提交**

Run: `node --test test/domain/external-casting.test.js`  
Expected: 2 tests PASS。

```powershell
git add src/data/external-mappings.js src/domain/casting/external.js test/domain/external-casting.test.js
git commit -m "feat: add confirmed external-response casting"
```

### Task 9: 加载经典、风险分类与本地解释

**Files:**
- Create: `src/data/classics.js`
- Create: `src/data/interpretation-rules.js`
- Create: `src/domain/risk.js`
- Create: `src/domain/interpretation.js`
- Test: `test/domain/interpretation.test.js`

- [ ] **Step 1: 写入失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRisk } from '../../src/domain/risk.js';
import { interpret } from '../../src/domain/interpretation.js';

test('medical and investment questions receive mandatory boundaries', () => {
  assert.equal(classifyRisk('这个药能不能治好我的病').level, 'high');
  assert.equal(classifyRisk('应该把全部积蓄买入哪只股票').level, 'high');
});

test('interpretation exposes reasons and avoids forbidden certainty', () => {
  const output = interpret({ category: 'career', relation: 'body_overcomes_use', bodyStrength: 'prosperous', originalName: '家人', changedName: '贲', movingLineText: '九三……', risk: { level: 'normal' } });
  assert.equal(output.sections.length, 5);
  assert.ok(output.sections.every((section) => section.reasonKeys.length > 0));
  assert.doesNotMatch(JSON.stringify(output), /必然|稳赚|包治|一定分手/);
});
```

- [ ] **Step 2: 实现经典、风险和解释优先级**

`classics.js` 验证 64 个唯一六位 ID、每卦至少 6 条爻辞，并提供 `getHexagramClassic(id)`；乾坤多出的用九、用六放入 `specialLines`。

`risk.js` 通过明确词组表分类医疗、生死、自伤、怀孕、诉讼、犯罪、投资和大额财务；自伤紧急词触发 `urgent`。`interpretation.js` 固定生成局势摘要、有利因素、阻碍因素、时机倾向、行动建议，每段包含 `text` 和 `reasonKeys`；高风险模板覆盖行动建议但不删除排盘数据。

- [ ] **Step 3: 验证并提交**

Run: `node --test test/domain/interpretation.test.js test/data/vendor.test.js`  
Expected: 4 tests PASS。

```powershell
git add src/data/classics.js src/data/interpretation-rules.js src/domain/risk.js src/domain/interpretation.js test/domain/interpretation.test.js
git commit -m "feat: add classical text and safe local interpretation"
```

### Task 10: 实现本地仓库、版本迁移与重复占问保护

**Files:**
- Create: `src/storage/repository.js`
- Create: `src/storage/fingerprint.js`
- Test: `test/storage/repository.test.js`

- [ ] **Step 1: 写入失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createRepository } from '../../src/storage/repository.js';

test('repository persists versioned records and settings', async () => {
  const repository = createRepository(createMemoryStorage());
  await repository.saveRecord({ id: 'gua-1', questionFingerprint: 'abc', createdAt: '2026-07-24T10:00:00.000Z' });
  await repository.saveSettings({ reduceMotion: true, dayBoundary: 'early-zi' });
  assert.equal((await repository.listRecords()).length, 1);
  assert.equal((await repository.getSettings()).reduceMotion, true);
});

test('recent duplicate returns the original record', async () => {
  const repository = createRepository(createMemoryStorage());
  await repository.saveRecord({ id: 'gua-1', questionFingerprint: 'abc', createdAt: '2026-07-24T10:00:00.000Z' });
  assert.equal((await repository.findRecentDuplicate('abc', new Date('2026-07-25T09:59:00.000Z'))).id, 'gua-1');
  assert.equal(await repository.findRecentDuplicate('abc', new Date('2026-07-25T10:01:00.000Z')), null);
});
```

- [ ] **Step 2: 实现仓库、指纹、验证并提交**

根键固定为 `cyber-divination:v1`，数据结构为 `{ schemaVersion: 1, records: [], settings: {} }`。写入前解析、迁移、验证；损坏 JSON 移入 `cyber-divination:recovery:<timestamp>` 后恢复空仓库。

`fingerprint.js` 对去除首尾空白、合并连续空格、统一全半角标点后的问题文本使用 `crypto.subtle.digest('SHA-256')`，结果不上传网络。

Run: `node --test test/storage/repository.test.js`  
Expected: 2 tests PASS。

```powershell
git add src/storage test/storage/repository.test.js
git commit -m "feat: persist private local divination records"
```

### Task 11: 建立 Hash Router、应用壳与起卦状态机

**Files:**
- Create: `src/app/router.js`
- Create: `src/app/session.js`
- Create: `src/ui/dom.js`
- Create: `src/ui/layout.js`
- Create: `src/ui/views/home.js`
- Modify: `src/app.js`
- Test: `test/app/router-session.test.js`

- [ ] **Step 1: 写入路由与状态机测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../../src/app/router.js';
import { createSession, transition } from '../../src/app/session.js';

test('parseRoute recognizes result ids and navigation pages', () => {
  assert.deepEqual(parseRoute('#/result/gua-1'), { name: 'result', params: { id: 'gua-1' } });
  assert.deepEqual(parseRoute('#/classics'), { name: 'classics', params: {} });
});

test('session cannot cast before question and method are confirmed', () => {
  const session = createSession();
  assert.throws(() => transition(session, { type: 'CAST' }), /尚未确认/);
});
```

- [ ] **Step 2: 实现导航与状态机**

路由固定为 `#/`、`#/ask`、`#/result/:id`、`#/history`、`#/classics`、`#/settings`，未知路由回首页。状态机顺序固定为 `question → method → input → confirmed → casting → completed`；进入 `confirmed` 后创建不可变快照。

`layout.js` 创建跳至主内容链接、品牌栏、`main` 和四项底部导航。`home.js` 展示品牌、副标题、文化娱乐声明和“诚心问易”按钮。

- [ ] **Step 3: 验证并提交**

Run: `node --test test/app/router-session.test.js`  
Expected: 2 tests PASS。

Run: `node tools/dev-server.mjs --root . --port 4173`  
Expected: `http://localhost:4173/#/` 显示首页，底部导航 Hash 正确变化，控制台无错误。

```powershell
git add src/app src/ui test/app/router-session.test.js
git commit -m "feat: add app shell routing and casting session"
```

### Task 12: 实现定问、择法、取数与成卦向导

**Files:**
- Create: `src/ui/views/ask.js`
- Create: `src/ui/components/method-card.js`
- Create: `src/ui/components/time-fields.js`
- Create: `src/ui/components/external-fields.js`
- Create: `src/ui/views/ritual.js`
- Create: `src/app/cast-controller.js`
- Test: `test/app/cast-controller.test.js`

- [ ] **Step 1: 写入控制器集成测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCastController } from '../../src/app/cast-controller.js';
import { createMemoryStorage, createRepository } from '../../src/storage/repository.js';

test('controller creates one immutable auditable number record', async () => {
  const repository = createRepository(createMemoryStorage());
  const controller = createCastController({ repository, now: () => new Date('2026-07-24T10:00:00.000Z') });
  const record = await controller.cast({ question: '未来三个月是否适合推进当前职业选择？', category: 'career', method: 'number-pair', inputs: { first: '9', second: '16' } });
  assert.equal(record.algorithm.id, 'number-pair-v1');
  assert.equal(record.hexagram.movingLine, 1);
  assert.equal((await repository.listRecords()).length, 1);
  assert.ok(Object.isFrozen(record.snapshot));
});
```

- [ ] **Step 2: 实现控制器与向导界面**

`cast-controller.js` 负责校验一事一占、生成问题指纹、检查 24 小时重复、调用 casting profile、派生卦象、计算五行旺衰、加载经典、分类风险、生成解释和保存记录。UI 不得自行拼接半成品记录。

控制器保存的记录字段固定为：`id`、`createdAt`、`question`、`category`、`background`、`questionFingerprint`、`method`、`algorithm { id, version }`、`timeBasis`、`rawInputs`、`snapshot`、`hexagram`、`fiveElements`、`classics`、`interpretation`、`risk`、`calculationLog`、`schemaVersion`。启用定位时只保存本次计算所需经度和用户选择的城市标签，不保存持续定位信息；全部字段仍仅进入本地仓库。

`ask.js` 依次渲染问题类别与背景、四种方法卡、方法字段和最终确认摘要。时间法显示时区、历法、年界、子时选项和真太阳时开关；开启真太阳时后显示手动经度与“使用当前位置”按钮，定位只能由用户点击触发。随机法显示“现代数字取象法”。外应法要求物象、方向、数量和人工确认。

`ritual.js` 使用六条语义化爻线，自下而上添加 `is-revealed`；减少动态效果开启时直接完成，随后导航到结果页。

- [ ] **Step 3: 验证并提交**

Run: `node --test test/app/cast-controller.test.js && node --test`  
Expected: 全部测试 PASS。

```powershell
git add src/app/cast-controller.js src/ui/views/ask.js src/ui/views/ritual.js src/ui/components test/app/cast-controller.test.js
git commit -m "feat: implement guided four-method casting flow"
```

### Task 13: 实现双层结果、计算日志与风险提示

**Files:**
- Create: `src/ui/views/result.js`
- Create: `src/ui/components/hexagram-lines.js`
- Create: `src/ui/components/reason-list.js`
- Create: `src/ui/components/risk-banner.js`
- Create: `src/styles/result.css`
- Test: `test/app/result-model.test.js`

- [ ] **Step 1: 写入结果视图模型测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createResultModel } from '../../src/ui/views/result.js';

test('result model separates summary, classics and calculation evidence', () => {
  const model = createResultModel({
    interpretation: { sections: [{ id: 'summary', text: '宜先整顿基础。', reasonKeys: ['relation:body_overcomes_use'] }] },
    classics: { original: { name: '家人', guaCi: '利女贞。' }, movingLine: '九三……' },
    calculationLog: [{ label: '上卦总数', value: '28' }],
    risk: { level: 'normal' }
  });
  assert.equal(model.tabs.summary.sections.length, 1);
  assert.equal(model.tabs.classics.originalName, '家人');
  assert.equal(model.tabs.evidence.rows[0].value, '28');
});
```

- [ ] **Step 2: 实现四标签结果页**

标签固定为摘要、卦象、经典、依据。摘要展示五段解释；卦象展示本卦、互卦、变卦和体用五行；经典展示卦辞与动爻爻辞；依据展示原始输入、时区、历法、算法 ID、原始总数、取模结果和风险模板版本。

风险为 `high` 时在页面顶部和行动建议前显示提示；`urgent` 时先显示现实求助信息，再允许展开文化性排盘。标签使用 button + `aria-selected`，左右键切换。

- [ ] **Step 3: 验证并提交**

Run: `node --test test/app/result-model.test.js`  
Expected: 1 test PASS。

```powershell
git add src/ui/views/result.js src/ui/components src/styles/result.css test/app/result-model.test.js
git commit -m "feat: present layered auditable divination results"
```

### Task 14: 实现卦例、典籍与设置页

**Files:**
- Create: `src/ui/views/history.js`
- Create: `src/ui/views/classics.js`
- Create: `src/ui/views/settings.js`
- Create: `src/styles/secondary-pages.css`
- Test: `test/app/settings.test.js`

- [ ] **Step 1: 写入设置行为测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from '../../src/ui/views/settings.js';

test('settings preserve only approved algorithm choices', () => {
  assert.deepEqual(normalizeSettings({ reduceMotion: true, dayBoundary: 'early-zi', yearBoundary: 'lunar-new-year', timeMode: 'civil' }), {
    reduceMotion: true, dayBoundary: 'early-zi', yearBoundary: 'lunar-new-year', timeMode: 'civil'
  });
  assert.throws(() => normalizeSettings({ dayBoundary: 'silent-auto' }), /不支持/);
});
```

- [ ] **Step 2: 实现三个辅助页面**

历史页按时间倒序列出问题、方法、卦名和创建时间，并链接到不可变结果；首版不提供导出。典籍页按卦名和六位卦 ID 搜索，展示 64 卦原文和术语。设置页提供算法档案、民用/真太阳时、年界、子时换日、减少动态效果、恢复默认和清除全部卦例。

清除数据使用原生 `dialog`，显示删除数量，只有“确认清除”调用仓库；关闭、Escape 和取消均无副作用。

- [ ] **Step 3: 验证并提交**

Run: `node --test test/app/settings.test.js`  
Expected: 1 test PASS。

```powershell
git add src/ui/views/history.js src/ui/views/classics.js src/ui/views/settings.js src/styles/secondary-pages.css test/app/settings.test.js
git commit -m "feat: add history classics and local settings"
```

### Task 15: 落实玄夜科技视觉、图标与无障碍

**Files:**
- Create: `src/styles/layout.css`
- Create: `src/styles/components.css`
- Create: `src/styles/ritual.css`
- Create: `src/styles/responsive.css`
- Create: `public/icons/app-icon.svg`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/maskable-512.png`
- Modify: `manifest.webmanifest`
- Test: `test/tooling/accessibility-contract.test.js`

- [ ] **Step 1: 写入静态无障碍契约测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('shell declares language, skip link and reduced motion', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/styles/ritual.css', 'utf8');
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /class="skip-link"/);
  assert.doesNotMatch(html, /<audio|autoplay/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
```

- [ ] **Step 2: 实现设计令牌与响应式布局**

固定颜色为玄黑 `#071311`、墨绿 `#15362F`、鎏金 `#B99B52`、朱砂 `#A94537`。正文不使用低对比金色；焦点环使用浅金、2px 宽和 2px 外偏移。移动端单列，结果卦象在 768px 以上变三列。底部导航预留 `env(safe-area-inset-bottom)`。

- [ ] **Step 3: 生成图标资产**

创建基于“易”字与阴阳爻的纯 SVG 标记，再使用 imagegen 技能生成同构的 192、512 与 maskable PNG；不得使用真人、神像、符咒照片或版权素材。检查 maskable 安全区内主体不被裁切。

- [ ] **Step 4: 浏览器视觉与键盘检查**

在 390×844、768×1024、1440×900 三种视口检查首页、向导、结果、典籍和设置；使用 Tab/Shift+Tab 完成流程；开启减少动态效果后确认无强制动画。

- [ ] **Step 5: 验证并提交**

Run: `node --test test/tooling/accessibility-contract.test.js`  
Expected: 1 test PASS。

```powershell
git add src/styles public/icons manifest.webmanifest index.html test/tooling/accessibility-contract.test.js
git commit -m "feat: apply xuanye visual system and accessibility"
```

### Task 16: 生成 Service Worker 并验证离线 PWA

**Files:**
- Create: `src/pwa/sw-template.js`
- Modify: `tools/build.mjs`
- Modify: `src/app.js`
- Test: `test/tooling/pwa-build.test.js`

- [ ] **Step 1: 写入失败的 PWA 构建测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProject } from '../../tools/build.mjs';

test('build emits a versioned precache service worker', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'cyber-pwa-'));
  try {
    await buildProject({ outputDir });
    const worker = await readFile(join(outputDir, 'sw.js'), 'utf8');
    assert.match(worker, /cyber-divination-[a-f0-9]{12}/);
    assert.match(worker, /src\/vendor\/64gua\.json/);
    assert.doesNotMatch(worker, /__PRECACHE__/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: 实现生成式 precache**

`tools/build.mjs` 复制文件后递归收集全部静态文件，排除 `sw.js`，按路径排序并计算 SHA-256 前 12 位作为 cache version。将 URL 数组和版本替换进 `src/pwa/sw-template.js`。Service Worker install 阶段 precache，activate 删除旧版本，fetch 对同源 GET 使用 cache-first；导航失败时回退 `/index.html`。

- [ ] **Step 3: 注册并自动验证**

`src/app.js` 仅在 HTTPS 或 localhost 注册 `/sw.js`；失败只记录非阻塞警告。

Run: `node --test test/tooling/pwa-build.test.js && node tools/build.mjs`  
Expected: test PASS，`dist/sw.js` 含版本化 cache。

- [ ] **Step 4: 浏览器离线检查并提交**

Run: `node tools/dev-server.mjs --root dist --port 4173`。首次打开并刷新让 SW 接管；切换浏览器离线模式，验证首页、四种起卦、典籍和已保存卦例可用。

```powershell
git add src/pwa src/app.js tools/build.mjs test/tooling/pwa-build.test.js
git commit -m "feat: make the divination app installable offline"
```

### Task 17: 全量回归、内容审查与交付文档

**Files:**
- Create: `README.md`
- Create: `docs/algorithm-profiles.md`
- Create: `docs/privacy-and-safety.md`
- Create: `test/domain/golden-cases.test.js`
- Modify: files only when a failing verification proves a defect

- [ ] **Step 1: 添加跨档案金样测试**

`test/domain/golden-cases.test.js` 明确覆盖：余数零、超大报数、双数与三数不混用、1986-05-29 时间样例、23:00 两种换日规则、闰月标记、四个外应方位样例、上下卦动爻体用判定、乾坤用九用六保留以及高风险文案。

```js
test('remainder-zero and very large values stay exact', () => {
  assert.deepEqual(castNumberPair('8', '16'), { profileId: 'number-pair-v1', upperNumber: 8, lowerNumber: 8, movingLine: 6, raw: ['8', '16'] });
  assert.equal(castNumberPair('900719925474099312345', '8').upperNumber, 1);
});
```

- [ ] **Step 2: 运行完整自动验证**

Run: `node tools/vendor-assets.mjs && node --test && node tools/build.mjs`  
Expected: 全部测试 PASS，构建退出码 0，vendor digest 完全一致。

- [ ] **Step 3: 执行浏览器全流程回归**

使用 in-app Browser 完成时间、双数、三数、随机和外应流程；随机法同问 24 小时内不能重抽；结果四标签完整；历史可恢复；典籍可搜索；设置清除需要二次确认；高风险问题显示边界；离线模式仍可工作。检查控制台无 error。

- [ ] **Step 4: 编写交付文档**

`README.md` 包含运行命令、构建命令、浏览器 URL、目录结构和无 npm 说明。`docs/algorithm-profiles.md` 逐项写出五个算法档案公式、时间口径和版本。`docs/privacy-and-safety.md` 写明仅本地存储、位置权限、清除方法、高风险边界与文化娱乐声明。

- [ ] **Step 5: 最终提交**

```powershell
git add README.md docs test src tools public index.html manifest.webmanifest THIRD_PARTY_NOTICES.md
git commit -m "docs: finalize cyber divination pwa delivery"
```

## 完成定义

- `node --test` 全部通过。
- `node tools/build.mjs` 生成可运行的 `dist/`。
- 四种起卦方式产生可审计结果，所有算法档案与中间值可见。
- 《周易》经典数据完整性检查通过。
- 所有问题和卦例仅保存在当前设备。
- 高风险内容不会生成被禁止的诊断、保证、恐吓或交易指令。
- PWA 可安装、可离线、支持减少动态效果和键盘操作。
- README、算法文档、隐私安全文档与第三方许可证完整。
