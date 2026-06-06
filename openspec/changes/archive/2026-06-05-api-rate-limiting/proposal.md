## Why

EpochJudge 当前完全没有 API Rate Limiting，注册、登录、代码提交等高频接口可被暴力破解或恶意刷爆，存在严重安全风险。作为 P0 安全基线任务，需立即补上。

## What Changes

- 引入 `@nestjs/throttler` 模块，为所有 HTTP 端点添加速率限制
- 全局默认限流：60 次/分钟
- 认证接口（`/auth/login`、`/auth/register`）：5 次/分钟
- 提交接口（`/submissions`）：10 次/分钟
- 限流策略可通过环境变量配置（`THROTTLE_TTL`、`THROTTLE_LIMIT`）
- 超限时返回 HTTP 429 Too Many Requests

## Capabilities

### New Capabilities

- `api-rate-limiting`: 基于 @nestjs/throttler 的 API 速率限制能力，包括全局默认策略和按端点自定义策略

### Modified Capabilities

（无现有 spec 需修改）

## Impact

- **代码**：`apps/api/src/main.ts`（注册全局守卫）、新增 `apps/api/src/common/guards/` 下限流守卫、各 Controller 添加 `@Throttle()` 装饰器
- **依赖**：新增 `@nestjs/throttler`（已内置 Redis 存储适配）
- **配置**：`.env` / `.env.example` 新增限流相关环境变量
- **API**：所有端点行为不变，仅超限时新增 429 响应
