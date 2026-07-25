# Cloudflare 明文管理员 Secret 迁移设计

## 目标

将管理后台从 `ADMIN_PASSWORD_HASH` 迁移到 Cloudflare Pages Production Secret `ADMIN_PASSWORD`。密码不得进入源代码、Git、构建产物、日志、测试数据或聊天内容。现有管理页面、管理 API 和八小时会话机制保持不变。

## 鉴权设计

- 登录接口读取 `env.ADMIN_PASSWORD`，不再读取 `env.ADMIN_PASSWORD_HASH`。
- 继续使用 `ADMIN_SESSION_SECRET` 签发和验证管理会话。
- 服务端将用户输入与配置密码分别编码为 UTF-8，再通过 Web Crypto SHA-256 生成固定长度摘要，并使用固定长度逐字节比较，避免普通字符串比较。
- 密码错误统一返回 `401 invalid_credentials`；任一必需 Secret 缺失时返回 `503 admin_not_configured`。
- 登录成功后继续设置 `HttpOnly`、`Secure`、`SameSite=Strict` 的八小时 Cookie。

## 两阶段迁移

1. 用户直接在 Cloudflare 或 Wrangler 隐藏输入中创建 `ADMIN_PASSWORD`，程序和代理不读取该值。
2. 部署只读取 `ADMIN_PASSWORD` 的新版本，同时暂时保留旧 Secret 以便回滚旧部署。
3. 验证正式登录、会话检查、管理列表、详情和退出流程。
4. 验证成功后删除 `ADMIN_PASSWORD_HASH`。
5. 注销 Wrangler 临时 OAuth 凭据并清理临时授权文件。

新代码不提供哈希回退或双密码逻辑，避免旧格式继续成为隐藏依赖。

## 测试与验收

- 正确密码登录成功并设置安全 Cookie。
- 错误密码返回稳定的 `401 invalid_credentials`。
- 缺少任一必需 Secret 时返回 `503 admin_not_configured`。
- Unicode、空值和不同长度输入不会绕过比较。
- 管理列表、详情、删除、退出和会话过期行为保持不变。
- 全量自动化测试、生产构建和正式浏览器登录通过。

## 风险与回滚

Cloudflare Secret 不进入仓库，但 Pages Function 运行时能够读取明文密码，因此风险高于只保存 PBKDF2 哈希。旧部署和旧哈希 Secret 保留到新登录完成验收；出现非密码类回归时可恢复旧部署。只有新版本验证成功后才删除旧哈希。

共享密码无法提供独立管理员身份、单人撤销或多因素认证。未来出现多管理员需求时，应迁移至 Cloudflare Access 或独立身份系统。

## 不在本次范围

- Cloudflare Access、自定义域名或第三方身份提供商。
- 占卦算法、AI 模型、D1 数据结构和保留策略。
- 客户端保存密码、找回密码或后台视觉重设计。

