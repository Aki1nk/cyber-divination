# Tokunex Chat Completions 与 180 秒超时设计

## 背景

生产环境使用 Tokunex 中转站和 GPT-5.5。当前实现先请求 `/v1/responses`，只有收到非成功 HTTP 状态后才回退到 `/v1/chat/completions`。如果 Responses 请求一直等待，45 秒计时器会直接中断请求并返回 `provider_timeout`，备用接口不会执行。

## 目标

- Tokunex 等非 OpenAI 官方地址直接调用 Chat Completions，避免无效的 Responses 等待。
- AI 请求总超时从 45 秒提高到 180 秒。
- OpenAI 官方地址继续优先使用 Responses API。
- 保持现有严格 JSON Schema、风险分类、数据库状态和前端错误协议不变。

## 方案

`providerUrls` 继续判断是否为中转站。`requestAiReading` 创建一个覆盖整个调用的 AbortController：中转站直接调用 `requestChatCompletions`；官方地址继续调用 Responses API。默认超时提取为导出常量 `DEFAULT_AI_TIMEOUT_MS = 180_000`，便于测试锁定。

## 验证

- 单元测试确认中转站只请求 `/chat/completions`。
- 单元测试确认默认超时为 180 秒。
- 保留官方 Responses、结构化输出、拒答和错误映射测试。
- 运行完整测试与生产构建。
