## Why

`main.ts` 未配置 CORS，生产环境跨域访问需自行在 Nginx 层处理。开发环境前后端分离（localhost:8080 → localhost:3000）时也会遇到跨域问题。

## What Changes

- 在 NestJS 应用中启用 CORS 中间件
- 支持通过环境变量配置允许的源列表（`CORS_ORIGINS`）
- 开发环境默认允许 `localhost:8080`
- 生产环境从环境变量读取，未配置时拒绝跨域
- 支持凭证（`credentials: true`）以传递 JWT Token

## Capabilities

### New Capabilities

- `cors-configuration`: 可配置的 CORS 跨域资源共享策略

### Modified Capabilities

（无现有 spec 需修改）

## Impact

- **代码**：`apps/api/src/main.ts`（添加 `app.enableCors()` 配置）
- **配置**：`.env` / `.env.example` 新增 `CORS_ORIGINS` 环境变量
- **API**：响应头新增 `Access-Control-Allow-*` 系列字段
- **兼容性**：不影响现有 API 行为，仅新增响应头
