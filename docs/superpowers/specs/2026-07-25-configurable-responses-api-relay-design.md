# 可配置 Responses API 中转站设计

## 1. 背景与目标

生产环境将通过 Tokunex 中转站调用兼容 OpenAI Responses API 的 `gpt-5.4-mini`。当前服务端固定请求 `https://api.openai.com/v1/responses`，无法使用中转站。

本次改造将 AI 请求地址和模型改为服务端环境配置，同时保留官方 OpenAI 地址作为安全默认值。前端不得接触 API Key、中转地址或供应商响应原文。

## 2. 已确认配置

| 配置 | 值 |
| --- | --- |
| API 类型 | OpenAI Responses API 兼容接口 |
| 中转站基础地址 | `https://tokunex.com/v1` |
| 实际请求地址 | `https://tokunex.com/v1/responses` |
| 模型 ID | `gpt-5.4-mini` |
| 推理强度 | `medium` |
| 供应商响应存储参数 | `store: false` |

## 3. 环境变量

- `OPENAI_API_KEY`：加密 Secret，保存中转站 API Key。
- `OPENAI_BASE_URL`：生产环境文本变量，值为 `https://tokunex.com/v1`。
- `OPENAI_MODEL`：生产环境文本变量，值为 `gpt-5.4-mini`。

未设置 `OPENAI_BASE_URL` 时使用 `https://api.openai.com/v1`；未设置 `OPENAI_MODEL` 时使用 `gpt-5.4-mini`，确保现有官方 OpenAI 部署保持兼容。

## 4. 请求地址规则

服务端只接受合法的 HTTPS 基础地址：

1. 去除首尾空白和末尾 `/`；
2. 地址必须使用 `https:`；
3. 基础地址后统一拼接 `/responses`；
4. 若配置已经以 `/responses` 结尾，则不重复拼接；
5. 地址非法时返回现有安全错误码 `provider_not_configured`，不把原始地址或异常堆栈返回前端。

请求体、鉴权头、超时、Structured Outputs JSON Schema、拒绝识别和错误映射保持不变。

## 5. 服务端数据流

1. Pages Function 接收占问数据并重新执行风险分类；
2. 从 Cloudflare 环境读取 API Key、基础地址和模型 ID；
3. 将问题、背景、排盘事实、本地解读和风险边界发送到配置的 Responses API 中转站；
4. 校验结构化响应后保存到 D1；
5. 不保存完整供应商请求、原始响应或思维链。

## 6. 隐私与披露

现有“直接通过 OpenAI 处理”的文字将调整为可验证的实际链路：

> 所有新占问会上传问题、背景、排盘事实与本地解读，并经配置的第三方 AI 中转服务提交给 GPT-5.4 mini 生成深度解读。本站云端记录保留 30 天；中转服务及其上游供应商的数据处理和保留规则以各自政策为准。请勿填写姓名、电话、身份证号、住址、账号密码等敏感信息。

前台不展示中转站密钥。隐私页说明 `store: false` 是请求参数，但不将其描述为对中转站或上游供应商的绝对不留存保证。

## 7. 测试范围

- 未配置基础地址时请求官方默认 `/v1/responses`；
- 配置 `https://tokunex.com/v1` 时请求 `https://tokunex.com/v1/responses`；
- 末尾 `/` 不产生双斜杠；
- 已包含 `/responses` 时不重复拼接；
- 非 HTTPS、无效 URL 和空模型配置使用安全失败或默认值；
- 自定义模型被写入请求体；
- Pages API 正确传递三个环境配置；
- 起卦页与隐私页明确披露第三方中转链路；
- 全量自动化测试和生产构建继续通过。

## 8. 部署步骤

1. 在独立分支实现并运行测试；
2. 创建并合并 PR；
3. 在 Cloudflare Pages Production 环境配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`；
4. 重新部署最新 `main`；
5. 用真实占问验证 AI 深解、失败重试和 D1 保存；
6. 验证 `/admin` 权限后再启用定时清理 Worker。

## 9. 不在本次范围

- 不支持 Chat Completions API；
- 不允许浏览器直接调用中转站；
- 不加入多个供应商之间的自动故障切换；
- 不在代码、Git、日志或聊天中保存 API Key；
- 不修改梅花易数排盘事实或本地确定性解读。
