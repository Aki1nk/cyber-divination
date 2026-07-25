# 邀请码用户认证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加邀请码注册、手机号密码登录、账户中心和后台用户管理。

**Architecture:** Pages Functions + D1 + Web Crypto；认证逻辑、仓储、API、前端门禁分层实现。

**Tech Stack:** 原生 ES Modules、Cloudflare Pages Functions、D1、Web Crypto、Node test。

---

### Task 1: 认证核心与迁移
- [ ] 先写 `test/functions/user-auth.test.js` 失败测试。
- [ ] 新建 `migrations/0002_user_auth.sql`、`functions/_lib/user-auth.js`。
- [ ] 验证手机号、密码哈希、Cookie、邀请码加密测试通过。

### Task 2: 仓储与用户 API
- [ ] 先写仓储和注册/登录/限流失败测试。
- [ ] 新建用户、邀请码、登录尝试仓储及 `/api/auth/*` 路由。
- [ ] 验证注册、登录、强制改密、退出、注销测试通过。

### Task 3: 卦象账户授权
- [ ] 修改测试，要求创建与重试必须登录并写入 `user_id`。
- [ ] 修改 readings API 和仓储，以账户而非设备作为权限边界。
- [ ] 验证现有 AI 流程保持通过。

### Task 4: 管理 API 与界面
- [ ] 先写用户、备注、临时密码和邀请码管理失败测试。
- [ ] 新增管理员 API，扩展 `src/admin.js` 和后台视图。
- [ ] 验证所有输出转义且管理员会话仍独立。

### Task 5: 前端登录门禁
- [ ] 先写认证视图、账户中心和路由门禁失败测试。
- [ ] 新增认证客户端、登录/注册页、账户页并接入 `src/app.js`。
- [ ] 更新样式、隐私和部署文档。

### Task 6: 验证与发布
- [ ] 运行聚焦测试、`node --test`、`node tools/build.mjs`。
- [ ] 浏览器验证关键流程。
- [ ] 创建分支、提交、PR；资源就绪后部署。
