## 1. Redis Key 与实例标识

- [x] 1.1 在 `packages/redis/src/redis-keys.ts` 中添加 SSE 连接相关的 Redis key 定义：`sseConnections(userId)` → `{prefix}:sse:conns:{userId}`（Sorted Set）、`sseEvict()` → `{prefix}:sse:evict`（Pub/Sub 频道）
- [x] 1.2 在 API 中生成唯一 `instanceId`（`os.hostname():process.pid`），在应用启动时赋值并可供注入

## 2. SSE 连接管理服务

- [x] 2.1 创建 `apps/api/src/submissions/sse-connection.service.ts`，实现 `SseConnectionService`：注入 `RedisService` 和 `ConfigService`
- [x] 2.2 实现 `registerConnection(userId, connectionId, subscriber)` 方法：在 Redis Sorted Set 中添加连接（score 为时间戳），检查连接数是否超限，超限时获取最旧连接并通过 Pub/Sub 发送 eviction 信号
- [x] 2.3 实现 `unregisterConnection(userId, connectionId)` 方法：从 Redis Sorted Set 和本地 Map 中移除连接
- [x] 2.4 实现 `handleEviction()` 方法：监听 `sse:evict` Pub/Sub 频道，收到当前实例的连接 eviction 信号时调用对应 subscriber 的 `complete()`
- [x] 2.5 实现连接 TTL 兜底：为 Sorted Set key 设置 TTL（如 1 小时），每次新连接时刷新
- [x] 2.6 实现 `onModuleInit` / `onModuleDestroy`：启动时订阅 eviction 频道，关闭时清理所有本地连接

## 3. Controller 集成

- [x] 3.1 修改 `apps/api/src/submissions/submissions.controller.ts` 的 `stream()` 方法：添加 `@Req()` 参数获取用户 ID，注入 `SseConnectionService`
- [x] 3.2 在 `stream()` 方法中调用 `SseConnectionService.registerConnection()`，生成唯一 `connectionId`（如 `crypto.randomUUID()`）
- [x] 3.3 在 Observable 的 teardown 函数中调用 `SseConnectionService.unregisterConnection()`
- [x] 3.4 将 `SseConnectionService` 注册到 `SubmissionsModule` 的 providers

## 4. 环境变量与文档

- [x] 4.1 更新 `.env.example`，添加 `SSE_MAX_CONNECTIONS_PER_USER` 环境变量及注释
- [x] 4.2 更新部署文档，说明 SSE 连接限制配置和多实例部署注意事项

## 5. 验证

- [x] 5.1 手动验证：同一用户建立 3 个 SSE 连接后，第 4 个连接建立时第 1 个连接被关闭
- [x] 5.2 手动验证：连接正常关闭（收到 `type: 'done'`）后 Redis 计数正确减少
- [x] 5.3 手动验证：不同用户的连接计数互不影响
- [x] 5.4 手动验证：`SSE_MAX_CONNECTIONS_PER_USER` 环境变量生效
