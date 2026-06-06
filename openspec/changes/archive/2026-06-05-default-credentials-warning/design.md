## Context

`.env.example` 包含多组默认弱凭证：
- `JWT_SECRET=change-me-in-production`
- `DB_PASSWORD=epoch_secret`
- `REDIS_PASSWORD=epoch_redis_secret`
- `SEED_ADMIN_PASSWORD=admin123`

部署后若运维人员未修改这些值，攻击者可直接使用默认管理员密码登录，或伪造 JWT Token 绕过认证。这是 P0 安全基线问题。

现状关键点：
- `main.ts` 启动流程：`loadMonorepoEnv()` → `syncDatabaseSchema()` → `NestFactory.create()` → 配置 → `app.listen()`。凭证检查应在 `loadMonorepoEnv()` 之后、数据库连接之前执行。
- 项目使用 `@nestjs/config` 的全局 `ConfigModule`，但启动阶段检查直接读取 `process.env` 即可（`loadMonorepoEnv()` 已加载 `.env`）。
- `packages/db/src/seed.ts` 使用 `process.env.SEED_ADMIN_PASSWORD ?? 'admin123'` 作为默认值。
- 此变更仅涉及启动时检查，不影响运行时 API 行为。

## Goals / Non-Goals

**Goals:**
- 应用启动时检测 `JWT_SECRET`、`DB_PASSWORD`、`REDIS_PASSWORD`、`SEED_ADMIN_PASSWORD` 是否仍为已知默认值。
- 检测到默认值时，输出醒目警告日志（使用 ANSI 红色高亮）。
- 通过 `ENFORCE_SECURE_CREDENTIALS=true` 环境变量启用强制模式：检测到默认值时拒绝启动（`process.exit(1)`）。
- 在 `.env.example` 中对敏感字段添加注释说明必须修改。

**Non-Goals:**
- 不检测密码强度（如长度、复杂度）——仅检测是否为已知默认值。
- 不自动替换或轮换密码。
- 不在运行时持续检查（仅启动时一次）。
- 不检测 S3 凭证（`S3_ACCESS_KEY`/`S3_SECRET_KEY` 为空表示未配置 S3，非弱凭证）。

## Decisions

### 决策 1：独立模块 `credential-check.ts`，在 `main.ts` 中调用
创建 `apps/api/src/common/startup/credential-check.ts`，导出 `checkDefaultCredentials()` 函数。在 `main.ts` 的 `bootstrap()` 开头调用。
- **为什么**：职责单一、可独立测试、不影响其他启动逻辑。
- **替代方案**：NestJS Lifecycle Hook（`OnModuleInit`）——检查需在 DB 连接之前执行，而 Lifecycle Hook 在模块初始化之后运行，时机太晚。被否决。

### 决策 2：硬编码已知默认值列表
检查函数内部维护一个 `{ envVar, defaultValue, description }[]` 数组，逐一比对 `process.env[envVar]`。
- **为什么**：默认值是固定的、有限的（来自 `.env.example`），硬编码简单可靠。
- **替代方案**：从 `.env.example` 文件解析——增加文件 I/O 依赖、解析复杂度，且 `.env.example` 可能不在生产镜像中。被否决。

### 决策 3：警告模式（默认）+ 强制模式（可选）
默认行为：检测到默认值时输出红色警告日志，继续启动。`ENFORCE_SECURE_CREDENTIALS=true` 时：输出错误日志后 `process.exit(1)`。
- **为什么**：开发环境默认凭证可接受（方便开箱即用），生产环境应启用强制模式。渐进式引入，不破坏现有开发流程。
- **替代方案**：始终强制（破坏开发体验）；始终仅警告（生产环境可能被忽略）。均被否决。

### 决策 4：ANSI 颜色代码高亮警告
使用 ANSI 转义码（`\x1b[31m` 红色、`\x1b[1m` 粗体、`\x1b[0m` 重置）在终端输出醒目警告。
- **为什么**：零依赖，终端原生支持，比纯文本更醒目。
- **替代方案**：`chalk` 库（额外依赖）；`console.warn`（不够醒目）。被否决。

## Risks / Trade-offs

- **硬编码默认值需手动维护** → 默认值变更频率极低（仅在 `.env.example` 更新时），维护成本可接受；代码注释中提示需同步更新。
- **ANSI 颜色在非终端环境（如 Docker 日志聚合）可能显示乱码** → 使用 `process.stdout.isTTY` 检测，非 TTY 环境下输出纯文本。
- **强制模式下开发环境需配置所有凭证** → 开发环境不设置 `ENFORCE_SECURE_CREDENTIALS`，使用默认警告模式即可。
