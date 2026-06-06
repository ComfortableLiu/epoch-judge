## Context

EpochJudge 的 SSE 端点（`GET /submissions/:number/stream`）当前无连接数限制。`JwtAuthGuard` 已应用，但 `stream()` 方法未接收 `@Req()` 参数。恶意用户可批量建立 SSE 长连接，耗尽 API 进程的内存和文件描述符。在多实例部署（Docker Compose 多副本）场景下，限制需要跨实例生效。

现状关键点：
- SSE 端点在 `apps/api/src/submissions/submissions.controller.ts:53` 定义，返回 RxJS `Observable<MessageEvent>`，通过 Redis Pub/Sub（`judgeEvents` 频道）接收评测事件。
- `JwtAuthGuard` 已应用，`req.user.id` 可用，但 `stream()` 方法当前未声明 `@Req()` 参数。
- `RedisService` 暴露 `client`（用于读写）和 `subscriber`（用于 Pub/Sub），均基于 `ioredis`。
- Redis key 遵循 `redisKey(...parts)` 模式，自动添加全局前缀。
- 连接生命周期：客户端打开 → 订阅 Redis 频道 → 收到 `type: 'done'` 事件后自动 complete → 清理。但客户端异常断开时 Observable 可能不会自动 complete。

## Goals / Non-Goals

**Goals:**
- 每个用户限制最大 SSE 并发连接数（默认 3），通过 `SSE_MAX_CONNECTIONS_PER_USER` 环境变量可配置。
- 新连接超出限制时，关闭该用户最旧的连接。
- 使用 Redis 记录连接信息，支持多实例部署。
- 连接关闭时自动清理 Redis 计数。
- 崩溃场景下连接计数通过 TTL 自动过期，不会永久泄漏。

**Non-Goals:**
- 不实现全局限流（仅限 SSE 连接数，不限制请求频率——那是 rate limiting 变更的范畴）。
- 不为 SSE 连接实现认证降级（仍要求 JWT）。
- 不实现连接级别的带宽或消息频率限制。
- 不修改 SSE 消息格式或业务逻辑。

## Decisions

### 决策 1：Redis Sorted Set + 本地 Map 双层追踪
使用两层结构追踪用户连接：
- **Redis Sorted Set**：`sse:conns:{userId}`，score 为连接建立时间戳，member 为 `{instanceId}:{connectionId}`。提供全局视图，支持跨实例查询连接数和获取最旧连接。
- **本地 Map**：`Map<string, Map<string, Subscriber<MessageEvent>>>`，以 `userId` → `connectionId` → RxJS Subscriber。提供 O(1) 的本地连接关闭能力。

- **为什么**：Redis 提供跨实例一致的连接计数；本地 Map 提供对 Subscriber 对象的直接引用以执行 `complete()`。两者配合实现跨实例 eviction。
- **替代方案**：仅 Redis 计数器 INCR/DECR（无法获取最旧连接进行 eviction）；仅本地 Map（无法跨实例计数）。均被否决。

### 决策 2：Redis Pub/Sub 信号实现跨实例 eviction
当用户连接数超限时，获取 Sorted Set 中 score 最小的 member（最旧连接），通过 Redis Pub/Sub 向 `sse:evict` 频道发布 `{ connectionId, instanceId }` 消息。持有该连接的实例收到消息后调用 `subscriber.complete()` 关闭连接。
- **为什么**：Redis Pub/Sub 是项目已有的跨实例通信机制（judge events 已使用），零新依赖。
- **替代方案**：仅关闭本地最旧连接（无法跨实例，多实例下连接数仍可能超限）；使用 Redis Stream（过度设计）。被否决。

### 决策 3：instanceId 使用 `hostname:pid` 或 UUID
每个 API 实例启动时生成唯一 `instanceId`（`os.hostname()` + `process.pid`，或 `crypto.randomUUID()`），存储在内存中，用于标识 Redis Sorted Set member 中的实例归属。
- **为什么**：需要区分不同实例的连接，以便 Pub/Sub 消息路由到正确的实例。`hostname:pid` 在 Docker 中天然唯一（容器名 + 进程 PID）。

### 决策 4：连接 TTL 兜底防泄漏
Redis Sorted Set 中的 member 设置独立 TTL（通过 Redis key `sse:conn:{instanceId}:{connectionId}` 的过期时间间接管理，或使用 Sorted Set 的整体 TTL）。更简单的方式：每个用户连接 set 设置 TTL（如 1 小时），每次新连接时刷新。超时未清理的连接自动过期。
- **为什么**：防止进程崩溃、网络断开等异常场景下 Redis 计数永久泄漏。
- **替代方案**：依赖客户端断开通知（不可靠——TCP 半开连接不触发关闭事件）。被否决。

### 决策 5：`stream()` 方法添加 `@Req()` 参数
在 `stream()` 方法签名中添加 `@Req() req: { user: { id: string } }`，以获取当前用户 ID。`JwtAuthGuard` 已确保 `req.user` 存在。
- **为什么**：当前方法未接收请求对象，无法获取用户 ID。这是最小侵入性修改。

### 决策 6：连接限制逻辑封装为独立 Guard 或 Interceptor
将连接检查/注册/清理逻辑封装为 `SseConnectionGuard`（NestJS Guard）或在 controller 中直接注入服务。考虑到 Guard 无法访问 Observable 的 teardown 逻辑，选择在 controller 中调用一个专门的 `SseConnectionService` 处理连接生命周期。
- **为什么**：Guard 适合前置检查但无法处理后置清理（Observable teardown）；Service 模式可封装注册、检查、清理的完整生命周期。
- **替代方案**：NestJS Interceptor（可以包装 Observable，但增加复杂度）。被否决。

## Risks / Trade-offs

- **Sorted Set member 格式依赖 instanceId 唯一性** → `hostname:pid` 在单机多进程（cluster 模式）下唯一；Docker 容器名天然唯一。若使用 PM2 cluster 模式需额外考虑。
- **Redis Pub/Sub 消息可能丢失（at-most-once）** → 最坏情况下旧连接未被关闭，但新连接仍会正常工作；TTL 兜底确保计数最终恢复。
- **连接清理延迟（客户端异常断开）** → Observable teardown 依赖 NestJS/Express 的连接关闭事件，TCP 半开连接可能延迟检测；TTL 兜底。
- **每个用户一个 Redis key** → 用户量大时 key 数量可控（每个用户仅一个 Sorted Set）；TTL 确保不活跃用户的 key 自动清理。
