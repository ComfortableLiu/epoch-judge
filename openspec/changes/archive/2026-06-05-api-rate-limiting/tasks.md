## 1. 安装依赖

- [x] 1.1 安装 `@nestjs/throttler` 到 `apps/api`
- [x] 1.2 安装可选依赖 `@nest-lab/throttler-storage-redis` 到 `apps/api`（用于 Redis 存储后端）
- [x] 1.3 运行 `yarn install` 确保依赖解析正常

## 2. 限流配置与模块注册

- [x] 2.1 创建 `apps/api/src/common/throttle.config.ts`，定义从 `ConfigService` 读取限流环境变量的常量与工厂函数（`THROTTLE_TTL`、`THROTTLE_LIMIT`、`THROTTLE_AUTH_LIMIT`、`THROTTLE_SUBMISSION_LIMIT`、`THROTTLE_ENABLED`、`THROTTLE_STORAGE`、`TRUST_PROXY`）
- [x] 2.2 在 `apps/api/src/app.module.ts` 中导入 `ThrottlerModule.forRootAsync`，使用上述工厂函数配置默认 throttler
- [x] 2.3 在 `apps/api/src/app.module.ts` 中通过 `APP_GUARD` 注册全局 `ThrottlerGuard`

## 3. 端点级限流覆盖

- [x] 3.1 在 `apps/api/src/auth/auth.controller.ts` 的 `login` 和 `register` 方法上添加 `@Throttle()` 装饰器，使用认证限流档位
- [x] 3.2 在 `apps/api/src/submissions/submissions.controller.ts` 的 `create` 方法上添加 `@Throttle()` 装饰器，使用提交限流档位
- [x] 3.3 在 `apps/api/src/submissions/submissions.controller.ts` 的 `stream`（SSE）方法上添加 `@SkipThrottle()` 装饰器

## 4. Trust Proxy 配置

- [x] 4.1 在 `apps/api/src/main.ts` 中根据 `TRUST_PROXY` 环境变量设置 Express 的 `trust proxy`（默认启用 1 跳）

## 5. 环境变量与文档

- [x] 5.1 更新 `.env.example`，添加限流相关环境变量（`THROTTLE_TTL`、`THROTTLE_LIMIT`、`THROTTLE_AUTH_LIMIT`、`THROTTLE_SUBMISSION_LIMIT`、`THROTTLE_ENABLED`、`THROTTLE_STORAGE`、`TRUST_PROXY`）及注释
- [x] 5.2 更新部署文档（`docs/developer.md`），说明限流配置与多实例 Redis 存储说明

## 6. 验证

- [x] 6.1 手动验证：默认限流生效，超限返回 HTTP 429
- [x] 6.2 手动验证：`THROTTLE_ENABLED=false` 时无限流
- [x] 6.3 手动验证：认证端点使用 5 次/分钟的独立限制
- [x] 6.4 手动验证：提交端点使用 10 次/分钟的独立限制
- [x] 6.5 手动验证：SSE 端点不受限流影响
