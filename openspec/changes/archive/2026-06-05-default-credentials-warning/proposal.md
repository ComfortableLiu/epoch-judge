## Why

`.env.example` 中包含 `admin/admin123`、`JWT_SECRET=change-me-in-production` 等默认弱凭证。部署后若运维人员未修改，攻击者可直接使用默认凭证登录或伪造 JWT Token。

## What Changes

- 应用启动时检测关键环境变量是否仍为默认值
- 检测项：`JWT_SECRET`、`ADMIN_PASSWORD`、`DB_PASSWORD`、`REDIS_PASSWORD`
- 若检测到默认值，输出醒目警告日志（红色高亮）
- 可选：通过环境变量 `ENFORCE_SECURE_CREDENTIALS=true` 启用强制模式，检测到默认值时拒绝启动
- 在 `.env.example` 中添加注释说明必须修改

## Capabilities

### New Capabilities

- `default-credentials-warning`: 启动时默认凭证检测与告警能力

### Modified Capabilities

（无现有 spec 需修改）

## Impact

- **代码**：新增 `apps/api/src/common/startup/credential-check.ts`、`apps/api/src/main.ts`（启动时调用）
- **配置**：`.env.example` 添加注释、新增 `ENFORCE_SECURE_CREDENTIALS` 环境变量
- **API**：不影响运行时 API 行为，仅启动时检测
- **部署**：运维人员需确保环境变量已正确配置
