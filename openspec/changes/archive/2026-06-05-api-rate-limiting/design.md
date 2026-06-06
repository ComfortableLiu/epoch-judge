## Context

EpochJudge 的 NestJS API（`apps/api`，NestJS 11 + Express）当前对所有 HTTP 端点均无速率限制。注册（`/auth/register`）、登录（`/auth/login`）与代码提交（`/submissions`）属于高风险高频端点：登录可被用于撞库/暴力破解，注册可被批量刷号，提交可被刷爆评测队列。这是一项 P0 安全基线任务。

现状关键点：
- 全局前缀为 `api/v1`，全局已注册 `ValidationPipe`（见 `apps/api/src/main.ts`）。
- 应用通过 `@nestjs/config` 的全局 `ConfigModule` 读取环境变量；项目已强依赖 Redis（`ioredis` + `@epoch-judge/redis` 的 `createRedisClient`）。
- 默认部署为单机（Docker Compose + nginx 反向代理，见 `docker/nginx.conf`），但架构上允许多 API 实例水平扩展。
- `/submissions/:number/stream` 为基于 SSE 的长连接端点，不应计入普通请求限流。

## Goals / Non-Goals

**Goals:**
- 为所有 HTTP 端点引入默认速率限制（60 次/分钟）。
- 对认证端点（`/auth/login`、`/auth/register`）限制为 5 次/分钟，对提交端点（`POST /submissions`）限制为 10 次/分钟。
- 限流参数（TTL、各档位 limit、总开关）可通过环境变量配置。
- 超限统一返回 HTTP 429 Too Many Requests。
- 在 nginx 反向代理后仍能基于真实客户端 IP 进行限流。

**Non-Goals:**
- 不引入按用户/按 API Key 的配额计费体系（仅按 IP/连接做基础限流）。
- 不改变任何端点的正常业务行为或响应结构（仅新增 429 分支）。
- 不实现分布式滑动窗口算法的自定义实现（沿用 throttler 内置算法）。
- 不为 gRPC 评测通道与 SSE 推送本身设计限流。

## Decisions

### 决策 1：采用 `@nestjs/throttler` 并以全局 Guard 接入
使用官方 `@nestjs/throttler`（与 NestJS 11 兼容的 v6 系列），通过 `APP_GUARD` provider 注册 `ThrottlerGuard`，使其默认覆盖所有路由，无需在每个 Controller 手动 `@UseGuards`。
- **为什么**：官方维护、与 Nest DI/装饰器体系一致，`@Throttle()` / `@SkipThrottle()` 装饰器可做细粒度覆盖。
- **替代方案**：自研中间件（重复造轮子、缺少装饰器粒度）；`express-rate-limit`（脱离 Nest DI，难以按路由覆盖、难读 ConfigService）。均被否决。

### 决策 2：通过 `forRootAsync` + ConfigService 读取环境变量
使用 `ThrottlerModule.forRootAsync` 注入 `ConfigService`，定义单个名为 `default` 的 throttler：`ttl = THROTTLE_TTL`（秒，默认 60），`limit = THROTTLE_LIMIT`（默认 60）。认证与提交档位的 limit 也从环境变量读取（`THROTTLE_AUTH_LIMIT` 默认 5、`THROTTLE_SUBMISSION_LIMIT` 默认 10），并通过常量模块导出供装饰器引用。
- **为什么**：满足“可配置”要求，且让端点级 `@Throttle()` 也能复用 env 值。
- **替代方案**：`forRoot` 硬编码（不可配置，否决）。

### 决策 3：端点级覆盖与豁免
- `/auth/login`、`/auth/register`：方法上加 `@Throttle({ default: { ttl, limit: AUTH_LIMIT } })`。
- `POST /submissions`：方法上加 `@Throttle({ default: { ttl, limit: SUBMISSION_LIMIT } })`。
- `/submissions/:number/stream`（SSE）：加 `@SkipThrottle()`，避免长连接被误限。
- **为什么**：按端点风险分级；SSE 长连接与普通请求语义不同。

### 决策 4：在 Express 上启用 `trust proxy` 并基于真实 IP 限流
在 `main.ts` 中对底层 Express 实例设置 `trust proxy`（受 `TRUST_PROXY` 环境变量控制，默认开启 1 跳），使 throttler 默认的 IP tracker 能读取 nginx 透传的 `X-Forwarded-For` 真实客户端 IP。
- **为什么**：默认部署在 nginx 之后，否则所有请求都来自代理 IP，限流会误伤所有用户。
- **风险见下**：`trust proxy` 在暴露给不可信网络时可被伪造 XFF 绕过。

### 决策 5：存储后端默认内存，生产可切换 Redis
默认使用 throttler 内置的内存存储（`THROTTLE_STORAGE=memory`）；当 `THROTTLE_STORAGE=redis` 时，使用 Redis 存储适配器（`@nest-lab/throttler-storage-redis`），复用 `@epoch-judge/redis` 的连接配置，实现多实例间共享计数。
- **为什么**：单机默认部署用内存即可、零额外依赖即生效；多实例水平扩展时内存计数各自独立会削弱防护，此时切到 Redis 共享窗口。
- **替代方案**：强制 Redis（增加单机部署复杂度，否决）；仅内存（多实例下防护失效，作为默认但保留切换能力）。

### 决策 6：全局开关
`THROTTLE_ENABLED=false` 时整体关闭限流（通过 `skipIf` 实现），用于本地开发与端到端测试。
- **为什么**：避免测试/压测被限流干扰，且便于按环境降级。

## Risks / Trade-offs

- **内存存储在多实例下计数不共享** → 默认单机部署无影响；多实例部署文档中明确要求设置 `THROTTLE_STORAGE=redis`。
- **`trust proxy` 导致 XFF 可被伪造绕过限流** → 仅信任固定跳数（默认 1，对应 nginx），并要求 nginx 重写而非透传客户端提供的 `X-Forwarded-For`；通过 `TRUST_PROXY` 可在直连场景关闭。
- **认证端点 5 次/分钟可能误伤共享出口 IP（NAT/校园网）下的正常用户** → TTL 与 limit 均可调，部署方可按场景放宽；错误信息为标准 429 便于前端提示重试时间。
- **SSE 端点豁免可能被滥用建立大量连接** → 由后续“SSE 连接数限制”变更专门处理，不在本变更范围内。
- **新增依赖（Redis 适配器）** → 设为可选，仅在 `THROTTLE_STORAGE=redis` 时加载，不影响默认路径。

## Migration Plan

1. 安装 `@nestjs/throttler`（及可选 `@nest-lab/throttler-storage-redis`）。
2. 新增限流配置常量与 `ThrottlerModule.forRootAsync`，在 `AppModule` 注册全局 `ThrottlerGuard`。
3. 在目标 Controller 方法添加 `@Throttle()` / `@SkipThrottle()`。
4. 在 `main.ts` 设置 `trust proxy`。
5. 更新 `.env.example` 与部署文档（含多实例 Redis 说明）。
6. 部署默认 `THROTTLE_ENABLED=true`、内存存储；回滚策略：设 `THROTTLE_ENABLED=false` 即可即时停用限流而无需回滚代码。
