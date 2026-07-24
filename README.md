# 赛博天师｜梅花易数 · 易经推演

移动优先、无需后端、可离线安装的传统文化 PWA。应用按确定性本地规则生成本卦、互卦、变卦、动爻、体用、五行旺衰、经典原文和分层解释，并保留可复核计算日志。

> 本项目用于传统文化学习与自我反思，不替代医疗、法律、投资等专业意见，也不承诺具体结果。

## 本地运行

项目不依赖 npm，也不需要安装第三方包。需要 Node.js 24 或兼容版本。

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

`dist/` 包含完整静态资源与版本化 `sw.js`，可部署到任意支持 HTTPS 和静态文件的主机。localhost 环境也可注册 Service Worker。

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

- 占问、设置、计算快照和结果仅保存在当前浏览器 `localStorage`。
- 无账号、无后端、无云同步、无分析 SDK、无数据导出。
- 位置权限只在用户主动点击后请求，仅保存当次计算需要的经度和用户填写的城市标签。
- 同一问题指纹在 24 小时内返回原记录，避免反复占问。
- 高风险问题保留文化性排盘，但行动建议会被现实边界提示覆盖。

详见 `docs/privacy-and-safety.md`。

## 目录结构

```text
src/app/           路由、状态机、起卦控制器
src/domain/        取模、卦象、历法、五行、风险与解释规则
src/data/          经典规范化、解释规则、外应映射
src/storage/       本地仓库、问题指纹
src/ui/            页面与无框架组件
src/styles/        玄夜视觉、响应式与无障碍样式
src/pwa/           Service Worker 模板
src/vendor/        固定版本的历法和六十四卦数据
public/icons/      自有 PWA 图标
tools/             无依赖构建、服务、供应链和图标脚本
test/              领域、应用、存储、构建和金样测试
```

## 第三方材料

版本、来源、摘要与许可证记录见 `THIRD_PARTY_NOTICES.md`。经典数据与历法代码均随构建固定，不在运行时请求第三方服务。
