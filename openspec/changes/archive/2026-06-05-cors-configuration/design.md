## Context

EpochJudge 的 `main.ts` 未配置 CORS。开发环境中 rspack dev server 通过 proxy（`/api` → `localhost:3000`）规避了跨域问题，但以下场景需要 CORS 支持：
- 生产环境 API 与前端部署在不同域（如 `api.example.com` 与 `app.example.com`）
- 浏览器直接访问 Swagger 文档（`/api/docs`）
- 移动端或第三方客户端直接调用 API
- 未来微服务拆分或多前端接入

现状关键点：
- `main.ts` 使用 `NestFactory.create(AppModule)`，未传入 CORS 选项，Express 默认不发送 CORS 头。
- NestJS 内置 `app.enableCors()` 方法，支持 origin、credentials、methods 等配置，底层基于 `cors` 中间件。
- 前端通过 `Authorization: Bearer <token>` header 传递 JWT，需 `credentials: true` 与 `Access-Control-Allow-Headers` 包含 `Authorization`。
- `.env.example` 已有 `API_PORT` 等环境变量模式，CORS 配置遵循同样模式。
- 项目已有 `@nestjs/config` 全局 ConfigModule，但 CORS 配置在应用启动阶段（`bootstrap()`）读取，此时 ConfigModule 尚未完全就绪，因此直接使用 `process.env` 读取。

## Goals / Non-Goals

**Goals:**
- 在 NestJS 应用中启用 CORS 中间件。
- 通过 `CORS_ORIGINS` 环境变量配置允许的源列表（逗号分隔）。
- 开发环境默认允许 `localhost:8080`（rspack dev server 端口）。
- 生产环境从环境变量读取，未配置时使用安全默认值（拒绝跨域或仅允许同源）。
- 支持 credentials 以传递 JWT Token。
- 预检请求（OPTIONS）正确响应。

**Non-Goals:**
- 不修改 nginx 配置（nginx 层 CORS 由部署方自行管理，与 NestJS 层互补）。
- 不实现动态 origin 回调（如从数据库读取白名单）——静态配置足够。
- 不为不同路由配置不同的 CORS 策略——全局统一策略即可。

## Decisions

### 决策 1：使用 `app.enableCors()` 而非手动中间件
NestJS 内置 `app.enableCors(options)` 方法，底层调用 Express 的 `cors` 中间件，一行代码即可启用。
- **为什么**：官方推荐方式，无需额外依赖（`cors` 已作为 `@nestjs/platform-express` 的依赖存在），配置选项完整。
- **替代方案**：手动 `app.use(cors())`（功能相同但绕过 NestJS 生命周期）；自研 CORS 头设置（重复造轮子）。均被否决。

### 决策 2：`CORS_ORIGINS` 环境变量，逗号分隔
环境变量格式为 `CORS_ORIGINS=https://app.example.com,https://admin.example.com`，解析为字符串数组传入 `origin` 选项。
- **为什么**：与 Docker Compose、Kubernetes ConfigMap 等部署方式兼容；逗号分隔是业界惯例（如 Spring Boot 的 `CORS_ALLOWED_ORIGINS`）。
- **默认值**：`NODE_ENV=development` 时默认 `http://localhost:8080`；其他环境默认空数组（拒绝所有跨域，需显式配置）。

### 决策 3：`credentials: true` + 显式允许 `Authorization` 头
CORS 配置中设置 `credentials: true`，`allowedHeaders` 包含 `Authorization`、`Content-Type` 等常用头。
- **为什么**：前端通过 Bearer Token 认证，需跨域携带凭证；浏览器要求 `Access-Control-Allow-Credentials: true` 与显式 origin（不能用 `*`）。

### 决策 4：在 `bootstrap()` 中直接读取 `process.env`
CORS 配置在 `bootstrap()` 函数中通过 `process.env.CORS_ORIGINS` 读取，不通过 ConfigService。
- **为什么**：`bootstrap()` 在应用启动时执行，此时 ConfigModule 的异步初始化可能未完成；`process.env` 在 `loadMonorepoEnv()` 后已就绪，保证读取正确。

## Risks / Trade-offs

- **`process.env` 绕过 ConfigModule** → CORS 配置仅在启动时读取一次，运行时不可变，符合预期；与 `API_PORT` 等启动时配置一致。
- **未配置 `CORS_ORIGINS` 时生产环境拒绝跨域** → 安全默认值；部署文档中明确说明需配置。
- **credentials 限制：不能同时用 `*` 和 `credentials: true`** → 必须显式列出 origin，已在设计中处理。
