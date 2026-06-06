## Context

EpochJudge 当前测试覆盖几乎为零：仅 `packages/storage/src/storage.test.ts` 一个文件，使用 `node --test` 运行。API（NestJS）与 Web（React）层无任何自动化测试，任何改动只能依赖 `scripts/smoke-test.sh` 兜底，回归风险极高。

现状关键点：
- Monorepo 使用 Yarn 4.9.2 workspaces（`apps/*`、`packages/*`）。
- API 为 NestJS 11，TypeScript 编译目标 `module: commonjs` / `target: ES2022`，启用装饰器（`emitDecoratorMetadata`、`experimentalDecorators`）。
- Service 层依赖注入清晰：如 `AuthService` 仅依赖 `PrismaService` 和 `JwtService`；`PrismaService` 通过 `readonly client` 暴露 `@epoch-judge/db` 的 Prisma 客户端，服务通过 `this.prisma.client.user.*` 访问数据库。
- Prisma datasource 固定为 MySQL（`provider = "mysql"`），无法直接切换为 SQLite 做内存测试。
- 根 `package.json` 的 `test` 脚本目前仅运行 storage 包测试。
- 本变更聚焦 API 核心模块：Auth、Problems、Submissions、Contests。

## Goals / Non-Goals

**Goals:**
- 为 API 核心 Service 建立单元测试：Auth（注册/登录/Token 刷新/权限）、Problems（CRUD/权限/导入导出）、Submissions（提交创建/状态查询）、Contests（CRUD/报名/密码验证）。
- 配置 Jest + `@nestjs/testing` 测试环境，使用 `ts-jest` 处理 TypeScript 与装饰器。
- 单元测试通过 mock `PrismaService` 实现确定性、无外部依赖、可在 CI 快速运行。
- 添加可在 CI 运行的测试脚本（`yarn test`）。
- 建立可扩展的测试基础设施（mock 工厂、测试模块构建辅助函数），便于后续补充更多测试。

**Non-Goals:**
- 不在本变更中实现 Web（React）层测试。
- 不追求特定覆盖率数字门槛（先建立基线，覆盖率门禁作为后续变更）。
- 不实现需要真实 MySQL 的完整 e2e 链路测试作为强制项（作为可选层提供，受测试 DB 可用性约束）。
- 不测试 gRPC 评测通道与 Docker 沙箱执行（属于 judge 包，单独覆盖）。

## Decisions

### 决策 1：选用 Jest + ts-jest + @nestjs/testing
采用 NestJS 官方推荐的 Jest 测试栈：`jest`、`ts-jest`、`@nestjs/testing`、`@types/jest`，e2e 层使用 `supertest`。
- **为什么**：`@nestjs/testing` 的 `Test.createTestingModule()` 与 NestJS DI 深度集成，可方便地 override providers；`ts-jest` 支持装饰器元数据；Jest 生态成熟、mock 能力强。
- **替代方案**：沿用 `node --test`（缺少 DI 集成、mock 能力弱，不适合 NestJS）；Vitest（与 NestJS 装饰器集成需额外配置 SWC，生态适配不如 Jest 稳定）。均被否决。

### 决策 2：单元测试 mock PrismaService，不依赖真实数据库
单元测试通过 `Test.createTestingModule()` 提供一个 mock 版 `PrismaService`，其 `client` 为 jest mock 对象（如 `{ user: { findUnique: jest.fn(), create: jest.fn(), ... } }`）。
- **为什么**：Prisma 固定 MySQL provider，无法用 SQLite 内存库；mock 让单元测试确定性、快速、无需 DB；服务层对 Prisma 的访问模式（`this.prisma.client.<model>.<op>`）易于 mock。
- **替代方案**：真实测试 MySQL（CI 需起 DB 服务、慢、有状态）作为 e2e 可选层而非单元测试默认；`prisma-mock` 库（额外依赖、维护不活跃）。

### 决策 3：建立共享 mock 工厂与测试辅助
创建 `apps/api/test/helpers/`，包含 `createMockPrisma()`（返回带 jest.fn 的 Prisma client mock）、`createMockJwt()` 等工厂，以及构建测试模块的辅助函数。
- **为什么**：减少各 spec 文件的样板代码，统一 mock 行为，降低维护成本。

### 决策 4：测试文件就近放置（co-located）+ e2e 独立目录
单元测试 `*.spec.ts` 与被测源码同目录（如 `apps/api/src/auth/auth.service.spec.ts`），与 NestJS 默认约定一致；可选的 e2e 测试放在 `apps/api/test/`，由独立 Jest 配置（`jest-e2e.json`）运行。
- **为什么**：就近放置便于查找与维护；e2e 独立配置避免与单元测试混跑（e2e 需 DB，单元测试不需要）。

### 决策 5：测试脚本与 CI 集成
在 `apps/api/package.json` 添加 `test`（单元）、`test:watch`、`test:cov`、`test:e2e` 脚本；更新根 `package.json` 的 `test` 脚本以同时运行 storage 与 API 单元测试。
- **为什么**：让 `yarn test` 在 CI 中一键运行全部可在无 DB 环境执行的测试；e2e 作为可选 job（需 DB）单独触发。

### 决策 6：Jest 配置使用 ts-jest 并启用装饰器元数据
`apps/api/jest.config.ts` 配置 `preset: 'ts-jest'`、`testEnvironment: 'node'`，并指向一个启用 `emitDecoratorMetadata`/`experimentalDecorators` 的 `tsconfig.spec.json`。
- **为什么**：NestJS DI 依赖装饰器元数据，测试编译必须保留；ts-jest 通过独立 tsconfig 隔离测试编译配置。

## Risks / Trade-offs

- **Mock Prisma 无法验证真实 SQL/约束行为** → 单元测试聚焦业务逻辑分支；真实 DB 行为由可选 e2e 层与现有 smoke 测试补充。
- **ts-jest 编译较慢** → 可后续切换 `@swc/jest` 提速；初期以正确性优先，性能非瓶颈（核心模块测试量有限）。
- **e2e 需真实 MySQL，CI 配置复杂** → e2e 设为可选层，不阻塞默认 `yarn test`；文档说明如何本地/CI 起测试 DB。
- **Mock 与真实实现可能漂移** → 通过共享 mock 工厂集中维护；mock 仅模拟被实际调用的 Prisma 方法，减少漂移面。
- **首次引入大量测试依赖** → 均为标准 NestJS 测试生态包，体积可接受，仅 devDependencies。
