## Why

当前 SSE 连接无限制，单个用户可无限制建立 SSE 长连接，存在资源耗尽风险。恶意用户可通过批量建立 SSE 连接耗尽 API 进程内存和文件描述符。

## What Changes

- 为每个用户限制最大 SSE 连接数（默认 3 个）
- 新连接建立时，若超出限制则关闭该用户最旧的连接
- 使用 Redis 记录用户 SSE 连接数（支持多实例部署）
- 连接关闭时自动清理计数
- 可通过环境变量配置最大连接数（`SSE_MAX_CONNECTIONS_PER_USER`）

## Capabilities

### New Capabilities

- `sse-connection-limit`: SSE 长连接的用户级并发限制能力

### Modified Capabilities

（无现有 spec 需修改）

## Impact

- **代码**：`apps/api/src/submissions/submissions.controller.ts`（SSE 端点添加连接限制逻辑）
- **Redis**：新增 `sse:connections:{userId}` 计数器
- **配置**：`.env` 新增 `SSE_MAX_CONNECTIONS_PER_USER`
- **API**：SSE 端点行为不变，仅超限时关闭旧连接
