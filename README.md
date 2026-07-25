# 赛博天师｜梅花易数 · 易经推演

移动优先、可离线起卦的传统文化 PWA。应用先按确定性本地规则生成本卦、互卦、变卦、动爻、体用、五行旺衰、经典原文和九段式解释，再通过 Cloudflare Pages Functions 调用兼容 Responses API 的 AI 服务，以 `gpt-5.5` 生成紧扣问题的第二层结构化深解。

> 本项目用于传统文化学习与自我反思，不替代医疗、法律、投资等专业意见，也不承诺具体结果。

- 新生成的卦例使用 `local-deterministic-v2` 本地解释档案：应用在本机从问题和可选背景中识别意图、关注点、主体和时间信号，再结合本卦、互卦、变卦、体用、旺衰与动爻阶段生成九段式详细解读。
- v2 会明确给出“宜、暂不宜、宜先……再……”等非绝对结论，并保存问题解析依据；本地排盘不调用 AI，云端 AI 也不能改变任何排盘事实。
- 已保存的 v1 卦例继续显示原始解读，不会自动重算或覆盖。
- 所有新占问会上传问题、背景、排盘事实与本地解读。离线时本地结果照常生成，AI 请求进入本机队列，联网后自动上传。
- 云端记录使用匿名设备编号聚合并保留 30 天；管理后台位于 `/admin`，只允许持有共享管理密码的人查看或删除。

## 本地运行

前端和函数代码不依赖运行时 npm 包。需要 Node.js 24 或兼容版本；部署 Cloudflare 资源时另需 Wrangler 4.x。

```powershell
node tools/dev-server.mjs --root . --port 4173
```

浏览器打开 `http://localhost:4173/#/`。

## 测试与构建

```powershell
node --test
node tools/build.mjs
node tools/dev-server.mjs --root dist --port 4175
```

`dist/` 包含公开应用、`admin.html` 与版本化 `sw.js`。`/api/*`、`/admin*` 和后台专用脚本不会进入 Service Worker 缓存。

## 生产部署

推荐通过 Git 仓库连接 Cloudflare Pages，保持构建、回滚和审计记录一致：

```text
Production branch: main
Build command: node tools/build.mjs
Output directory: dist
Root directory: /
Pages Functions directory: functions/
D1 binding: DB
Secrets: OPENAI_API_KEY, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
Variables: OPENAI_BASE_URL=https://tokunex.com/v1, OPENAI_MODEL=gpt-5.5
```

构建会把 `_headers`、`robots.txt`、管理后台与带 12 位内容哈希的应用构建号写入 `dist/`。`_headers` 启用严格 CSP、点击劫持防护、权限收敛，并明确禁止缓存管理后台和 API。

### Cloudflare 数据与 Secrets

1. 创建 D1 数据库，并将 Pages Functions 绑定名设为 `DB`。
2. 执行 `migrations/0001_cloud_readings.sql`。
3. 在 Pages 的生产与预览环境分别设置 `OPENAI_API_KEY`、`ADMIN_PASSWORD`、`ADMIN_SESSION_SECRET` 三个加密 Secret；设置普通文本变量 `OPENAI_BASE_URL=https://tokunex.com/v1` 和 `OPENAI_MODEL=gpt-5.5`。不要把 Secret 写入 Git、聊天记录或普通环境变量文件。
4. `ADMIN_PASSWORD` 使用密码管理器生成并直接填入 Cloudflare Secret，不在终端、代码或聊天中展示；`ADMIN_SESSION_SECRET` 使用独立的高强度随机字符串。
5. `wrangler.example.jsonc` 是 Pages 配置模板，填入真实 D1 database ID 后再复制为 `wrangler.jsonc`。未填真实 ID 时不要提交活动配置，以免中断自动部署。
6. 将 `cleanup-worker/wrangler.jsonc` 中的 D1 ID 替换为同一个数据库，部署独立清理 Worker；Cron 每天北京时间 02:15（UTC 18:15）删除过期记录。

AI 请求固定使用 Responses API 协议、`reasoning.effort: medium`、严格 JSON Schema、`store: false`，且不启用网页搜索、文件搜索、代码执行或任何工具。未设置 `OPENAI_BASE_URL` 时默认请求官方 OpenAI 地址；生产环境当前通过 Tokunex 中转站提交给 `gpt-5.5`。`store: false` 是请求参数，不代表中转站或其上游供应商必然不保留数据。

重新生成自有 PWA 图标：

```powershell
node tools/generate-icons.mjs
```

重新核验并固定第三方数据：

```powershell
node tools/vendor-assets.mjs
```

## 起卦方法

- **时间起卦**：农历年支数、月、日、时支取数；明确年界、子时换日和可选真太阳时。
- **双数起卦**：第一数定上卦，第二数定下卦，两数之和定动爻。
- **三数起卦**：第一、第二数定上下卦，第三数独立定动爻。
- **现代数字取象**：本机安全随机源分别生成上下卦和动爻，界面明确标注非古籍原法。
- **外应取象**：用户确认物象、方位、数量和时支后起卦。

详细公式见 `docs/algorithm-profiles.md`。

## 数据与安全

- 卦录、设置、离线队列和 AI 状态保存在当前浏览器 `localStorage`；所有新占问同时进入云端 AI 流程。
- 云端保存完整问题、背景、排盘、本地解读、风险分类和 AI 结果 30 天，不保存账号、邮箱、手机号或真实身份。
- 管理后台使用共享密码和签名 HttpOnly Cookie，会话与管理 API 均禁止缓存。
- 位置权限只在用户主动点击后请求，仅保存当次计算需要的经度和用户填写的城市标签。
- 同一问题指纹在 24 小时内返回原记录，避免反复占问。
- 高风险问题保留文化性排盘，但行动建议会被现实边界提示覆盖。

详见 `docs/privacy-and-safety.md`。

## 目录结构

```text
src/app/           路由、状态机、起卦控制器
src/domain/        取模、卦象、历法、五行、风险与解释规则
src/data/          经典规范化、解释规则、外应映射
src/domain/question-context.js  本地问题意图、关注点、主体与时间信号解析
src/data/hexagram-guidance.js   64 卦现代规则解读资料
src/storage/       本地仓库、问题指纹
src/cloud/         匿名设备编号、上传契约、队列与同步管理
src/ui/            页面与无框架组件
src/styles/        玄夜视觉、响应式与无障碍样式
src/pwa/           Service Worker 模板
src/vendor/        固定版本的历法和六十四卦数据
public/icons/      自有 PWA 图标
tools/             无依赖构建、服务、供应链和图标脚本
functions/         Cloudflare Pages Functions、Responses API、D1 与管理 API
cleanup-worker/    30 天到期数据清理 Worker
migrations/        D1 数据库迁移
test/              领域、应用、存储、构建和金样测试
```

## 第三方材料

版本、来源、摘要与许可证记录见 `THIRD_PARTY_NOTICES.md`。经典数据与历法代码均随构建固定，不在运行时请求第三方服务。
