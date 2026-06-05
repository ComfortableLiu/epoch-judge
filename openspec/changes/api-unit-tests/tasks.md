## 1. Jest 环境配置

- [x] 1.1 安装 devDependencies：`jest`、`ts-jest`、`@nestjs/testing`、`@types/jest`、`supertest`、`@types/supertest` 到 `apps/api`
- [x] 1.2 创建 `apps/api/tsconfig.spec.json`，继承 `tsconfig.json`，启用 `emitDecoratorMetadata`/`experimentalDecorators`，include `src/**/*.spec.ts` 和 `test/**/*.ts`
- [x] 1.3 创建 `apps/api/jest.config.ts`，配置 `preset: 'ts-jest'`、`testEnvironment: 'node'`、`roots: ['<rootDir>/src']`、`transform` 使用 `tsconfig.spec.json`
- [x] 1.4 在 `apps/api/package.json` 添加脚本：`test`（jest）、`test:watch`（jest --watch）、`test:cov`（jest --coverage）

## 2. 测试辅助工具

- [x] 2.1 创建 `apps/api/test/helpers/mock-prisma.ts`，导出 `createMockPrisma()` 工厂函数，返回包含 jest.fn 的 Prisma client mock（覆盖 user、problem、contest、submission、contestRegistration 等模型的 CRUD 方法）
- [x] 2.2 创建 `apps/api/test/helpers/test-module.ts`，导出 `createTestModule(providers, overrides)` 辅助函数，使用 `Test.createTestingModule()` 构建测试模块并 override PrismaService

## 3. Auth 模块测试

- [x] 3.1 创建 `apps/api/src/auth/auth.service.spec.ts`，编写 AuthService 单元测试：注册成功、重复用户名拒绝、mustResetPassword 接管、登录成功、错误密码拒绝、不存在用户拒绝、登录 blocked while reset pending
- [x] 3.2 编写 AuthService refresh 测试：有效 token 刷新、过期 token 在宽限期内刷新、过期 token 超出宽限期拒绝、缺失 authorization header 拒绝

## 4. Problems 模块测试

- [x] 4.1 创建 `apps/api/src/problems/problems.service.spec.ts`，编写 ProblemsService 单元测试：列表公开题目、创建题目、按 number 获取题目、不存在 number 抛 NotFoundException、更新题目

## 5. Submissions 模块测试

- [x] 5.1 创建 `apps/api/src/submissions/submissions.service.spec.ts`，编写 SubmissionsService 单元测试：创建提交成功、题目不存在抛 NotFoundException、按用户列出提交、按 number 获取提交详情

## 6. Contests 模块测试

- [x] 6.1 创建 `apps/api/src/contests/contests.service.spec.ts`，编写 ContestsService 单元测试：创建比赛成功、时间范围无效抛 BadRequestException
- [x] 6.2 编写密码验证测试：正确密码验证成功、错误密码拒绝、无密码比赛直接通过
- [x] 6.3 编写访问控制测试：有密码比赛未验证返回 false、有提交的比赛删除抛 BadRequestException

## 7. 根脚本集成

- [x] 7.1 更新根 `package.json` 的 `test` 脚本，使其同时运行 `@epoch-judge/storage test` 和 `@epoch-judge/api test`
- [x] 7.2 运行 `yarn test` 验证全部测试通过
