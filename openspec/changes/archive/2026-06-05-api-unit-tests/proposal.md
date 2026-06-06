## Why

当前仅 `packages/storage` 有 1 个测试文件，API 和 Web 层零测试覆盖。任何代码改动只能依赖 smoke 测试兜底，回归风险极高。作为 P0 质量基线，需为 API 核心模块建立单元测试和集成测试。

## What Changes

- 为 Auth 模块添加单元测试：注册、登录、Token 刷新、权限校验
- 为 Problems 模块添加单元测试：CRUD、权限控制、导入导出
- 为 Submissions 模块添加单元测试：提交创建、状态查询、SSE 推送
- 为 Contests 模块添加单元测试：比赛 CRUD、报名、密码验证
- 添加集成测试：端到端 API 请求链路（HTTP → Service → DB）
- 配置 Jest 测试环境：内存数据库（SQLite）或测试专用 MySQL
- 添加 CI 测试脚本：`yarn test` / `yarn test:e2e`

## Capabilities

### New Capabilities

- `api-test-suite`: API 核心模块的单元测试与集成测试套件

### Modified Capabilities

（无现有 spec 需修改）

## Impact

- **代码**：新增 `apps/api/src/**/*.spec.ts` 测试文件、`apps/api/test/` 集成测试目录
- **依赖**：`jest`、`@nestjs/testing`、`supertest`（NestJS 测试生态）
- **配置**：`apps/api/jest.config.ts`、`apps/api/tsconfig.spec.json`
- **CI**：`package.json` 新增 `test` 脚本
