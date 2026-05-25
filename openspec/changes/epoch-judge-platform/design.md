## Context

纪元（EpochJudge）是从零构建的开源 OJ，面向 OI/ACM 刷题用户与教学组织。约束与偏好：

- **语言**：全栈 **TypeScript**
- **工具链**：**Yarn 4+**（Berry workspace）、**Node.js 18+**（`engines` 约束）
- **后端**：NestJS（模块化、依赖注入、适合多服务拆分）
- **前端**：React + Rspack（快速构建）；**禁止 Tailwind**
- **UI**：**Ant Design 5** + CSS Modules / 少量全局 SCSS
- **图标**：**@icon-park/react**（IconPark 官方 React 包），统一封装 `Icon` 组件
- **数据库**：MySQL 8；**Redis** 用于评测队列、SSE 会话桥、限流与热点缓存
- **测试数据存储**：默认 **本地目录**（如 `data/testcases/`）；可选 **S3 兼容**配置（endpoint、bucket、key 前缀、凭证）
- **判题**：独立 Judge Worker 进程；**默认与 API 同机单机部署**；架构支持后续多 Worker 水平扩展
- **部署**：提供 **一键部署脚本**，封装依赖检查、镜像构建、迁移、启动与健康等待

当前仓库为空壳，无遗留系统。

## Goals / Non-Goals

**Goals:**

- 对标主流 OJ 的功能骨架：用户、题库、提交、比赛、管理后台
- 安全判题：沙箱隔离、资源限制、禁止危险系统调用与命令注入
- 分布式判题：API 接收任务，Worker 拉取/订阅执行，经 **SSE（面向浏览器）** 与 **gRPC（服务间）** 推送状态
- OI / ACM 两种评测语义；比赛内可绑定模式
- 中英文、亮/暗/系统主题；判题结果实时 UI 更新
- 题目与账号的文件导入及官方模板
- 判题并发可配置（全局与 per-worker）
- 运维人员通过 **单次执行部署脚本** 完成生产/本地全栈启动
- 测试数据默认可落地的本地目录方案，生产可切换 S3

**Non-Goals（首期）：**

- 交互题、Special Judge 源码在线编辑（可预留接口）
- 移动端原生 App
- 多租户 SaaS 计费
- 内置 AI 出题/验题
- Tailwind 或任意 utility-first CSS 框架

## Decisions

### 1. 仓库与部署拓扑

采用 **Yarn 4 workspace monorepo**（根目录 `.yarnrc.yml`，`packageManager: yarn@4.x`）：

| 包/服务 | 职责 |
|--------|------|
| `apps/api` | NestJS：REST、SSE、鉴权、业务编排 |
| `apps/web` | React + Rspack：用户端与部分管理 UI |
| `apps/judge` | NestJS：gRPC JudgeService、沙箱调度 |
| `packages/shared` | DTO、枚举、i18n key、proto 生成类型 |
| `packages/db` | Prisma 实体与迁移（MySQL） |

**默认部署拓扑（单机判题）**：一台主机上 Docker Compose 运行 MySQL、Redis、API、**1× Judge Worker**（与 API 同 compose 网络）、Web 静态资源由 API 反代或独立 nginx 容器。用户无需单独扩容判题机即可完整使用。

**扩展拓扑（可选）**：额外 Judge Worker 容器/主机注册心跳，Redis 队列多消费者；API 通过 gRPC/SSE 协议不变。

### 1.1 一键部署脚本

入口：`scripts/deploy.sh`（或 `yarn deploy`，内部调用该脚本）。

脚本职责（用户只执行一次，如 `./scripts/deploy.sh` 或 `yarn deploy`）：

1. 检测 **Node ≥18**、Docker、Docker Compose（缺失时给出安装指引并退出）
2. 复制 `.env.example` → `.env`（不存在时），写入默认单机判题与 **本地测试数据目录** 变量
3. `yarn install`（immutable 可选）与 `yarn build` 全 workspace
4. 构建/拉取 Compose 镜像，`docker compose up -d`
5. 等待 MySQL 就绪后执行 `yarn db:migrate`（Prisma migrate deploy）
6. 可选种子管理员账号
7. 输出访问 URL 与健康检查结果

不要求用户手动打包前端、配置 isolate 路径或分步启动各服务。开发模式仍可用 `yarn dev` 拆分启动，但生产推荐仅跑部署脚本。

### 1.2 测试数据存储抽象

`StorageProvider` 接口（`packages/shared` 或 `packages/storage`）：

| 驱动 | 配置 | 行为 |
|------|------|------|
| `local`（**默认**） | `STORAGE_TYPE=local`，`STORAGE_LOCAL_ROOT=./data/testcases` | 按 `{problemId}/{caseId}.in\|.out` 落盘 |
| `s3` | `STORAGE_TYPE=s3`，`S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`、`S3_PREFIX` | 读写对象键与 local 布局一致 |

DB 的 `problem_testcases` 仅存 `storage_key`、`checksum`、`size`；判题 Worker 通过 API 或共享卷读取（单机默认 **bind mount 同一 data 目录**）。

### 2. 前端技术选型（无 Tailwind）

- **Ant Design 5**：后台、表格、表单、Modal、Upload、国际化 `ConfigProvider`
- **@ant-design/cssinjs** + 自定义 token 实现暗色主题，与「跟随系统」通过 `prefers-color-scheme` + 用户覆盖存储联动
- **react-i18next**：中英文资源文件 `locales/zh-CN.json`、`locales/en-US.json`
- **状态**：React Query 拉取提交/判题状态；SSE 更新时 invalidate 或 push 到本地 store
- **代码编辑**：Monaco Editor（语言高亮与 C++/Java/Python/JS 模板）
- **图标**：`@icon-park/react`，主题色随 antd token；禁止混用多套图标库以免风格分裂

### 3. 判题沙箱与语言运行时

- **沙箱**：Linux 下 **isolate**（或 **nsjail**）作为首选；开发环境 Docker 内运行 Worker
- **语言**：预装编译/运行时镜像层
  - C/C++：`g++` / `gcc`，统一 C++17
  - Java：OpenJDK 17，`javac` + `java`（限制 classpath）
  - Python：3.11，`python3` 仅允许标准库白名单（可配置）
  - JavaScript：Node 20 LTS，禁止 `child_process`、`fs` 等（通过 isolate 环境变量 + 静态检查入口包装）
- **指令防护**：
  - 不将用户代码作为 shell 脚本执行；仅调用编译器/解释器固定 argv
  - 过滤源码中的危险模式（如 `system(`, `exec(`, `Runtime.getRuntime`, `child_process`）作为提交前警告或拒绝
  - 时间、内存、输出、进程数、文件大小硬限制
  - 测试数据路径只读挂载，工作目录临时且销毁

### 4. 判题协议（单机默认，可扩展）

**任务模型**（Redis Stream 或 BullMQ）：

```text
JudgeTask { submissionId, problemId, language, sourceCode, tests[], mode: OI|ACM, limits }
```

- **API → Queue**：创建提交后入队，返回 `submissionId`
- **Worker**：消费任务，逐测试点运行，写 `submission_testcase_results`
- **实时反馈**：
  - **SSE**：`GET /api/submissions/:id/stream`，事件 `status|testcase|done`
  - **gRPC**：`JudgeService.Submit` / `WatchStatus` 供内部或未来 CLI 使用

默认 Compose 仅 **1 个 Worker 副本**（`deploy.replicas: 1`）。Worker 无状态，通过 **并发配置** `JUDGE_WORKER_CONCURRENCY` 控制 isolate box 数量；API 侧 `JUDGE_GLOBAL_MAX_INFLIGHT` 限流。扩容时增加 Worker 服务实例即可，无需改 API 契约。

### 5. OI vs ACM 语义

| 模式 | 通过判定 | 得分 |
|------|----------|------|
| ACM | 全部测试点 AC | 无部分分（仅显示 AC/WA/TLE…） |
| OI | 按测试点 | 汇总得分（百分制或题目满分比例），支持子任务分 |

提交时携带 `judgeMode`；题目默认模式可覆盖；比赛可锁定模式。

### 6. 数据模型（核心表）

- `users`：账号、角色（user/admin/judge_manager）、批量导入元数据
- `problems`：标题、描述 MD、限制、默认模式、可见性
- `problem_testcases`：输入输出（文件或 blob）、分值（OI）、排序
- `submissions`：代码、语言、状态、得分、耗时内存汇总
- `submission_testcase_results`：逐点结果
- `contests` / `contest_problems` / `contest_registrations` / `contest_submissions`（关联提交）
- `judge_nodes`（可选）：Worker 心跳、负载，供管理端展示

测试数据经 `StorageProvider` 写入；**默认 local**，生产可设 `STORAGE_TYPE=s3`；DB 存 `storage_key` 与 checksum。

### 7. 导入能力

- **题目导入**：ZIP（`problem.yaml` + `statement.md` + `testdata/*.in|*.out`）或 Excel/CSV 简化版；提供 `templates/problem-import.zip` 与文档
- **用户导入**：CSV（username,email,password_hash 或初始密码列）；模板 `templates/user-import.csv`

### 8. 安全与鉴权

- JWT（access + refresh）或 Session Cookie（开发简单选 JWT + httpOnly refresh）
- 比赛权限：仅报名用户提交；封榜后隐藏实时榜单
- 管理接口 RBAC：`admin` 全权，`problem_editor` 仅题库

### 9. 持久化层（结论：需要，选用 Prisma）

**是否需要 ORM/持久化框架？——需要。**

理由：

| 因素 | 说明 |
|------|------|
| 关系复杂 | 用户、题目、测试点、提交、逐点结果、比赛/报名/榜单等多表外键与级联 |
| 事务 | 题目 ZIP 导入、批量用户导入、提交+入队需原子性 |
| 迁移 | 一键部署依赖可重复执行的版本化 schema（`prisma migrate deploy`） |
| 类型安全 | 全栈 TypeScript，共享 `packages/db` 导出类型给 API 与脚本 |
| 查询形态 | 分页列表、榜单聚合、权限过滤——手写 SQL 维护成本高、易漏 |

**不采用**裸 `mysql2` + 手写 SQL 作为默认方案：适合极少数热点查询优化，不适合作为主路径。

**候选对比：**

| 方案 | 结论 |
|------|------|
| **Prisma** | **选用**。Schema 单一真相、`migrate` 与 deploy 脚本契合、TS 类型自动生成、开源贡献者易读 `schema.prisma` |
| TypeORM | 与 Nest 装饰器风格接近，但类型推断与迁移体验弱于 Prisma；实体与 DB 易漂移 |
| Drizzle | 轻量、TS 好，生态与 Nest 模板少，对「一键部署 + 非资深 DBA」贡献者门槛略高 |
| Kysely | 仅 query builder，迁移与 schema 需另配，增加工程负担 |

**落地方式：**

- `packages/db`：`schema.prisma`、迁移、`PrismaClient` 工厂、repository 薄封装（复杂查询可 `$queryRaw`）
- `apps/api`：Nest `PrismaService`（全局模块），业务在 service 层而非 controller 直接散落 query
- 热点路径（如榜单统计）后期可对单条 SQL 用 `prisma.$queryRaw` 优化，不必换框架

### 10. API 风格

REST `/api/v1/*`；OpenAPI 文档；SSE 单独文档说明事件类型。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 沙箱逃逸 | 使用成熟 isolate/nsjail；禁网；非 root；定期升级镜像 |
| JS/Python 动态语言难静态封禁 | 双层：源码扫描 + 运行时 seccomp/ cgroup |
| 分布式判题顺序与重复消费 | 队列 ack、submission 幂等键、状态机 CAS |
| SSE 连接数高 | Redis pub/sub 桥接多 API 实例；连接超时与心跳 |
| 无 Tailwind 开发效率 | antd 覆盖 80% 后台；设计 token 统一间距色板 |
| 首期功能面大 | tasks 分阶段：MVP（用户+题+判题+提交）→ 比赛 → 导入 → 管理 |

## Migration Plan

绿field 无需数据迁移。建议发布阶段：

1. 执行 `./scripts/deploy.sh`：单机 Compose（MySQL + Redis + API + 1 Worker + Web），测试数据卷 `./data`
2. 生产扩展：同脚本生成的 compose 上增加 `judge` 副本；切换 `STORAGE_TYPE=s3`
3. 回滚：API 与 Worker 版本标签回退；队列积压可暂停消费

## Open Questions

- ~~Prisma vs TypeORM~~ → **已决：Prisma**（见 §9）
- Special Judge 是否纳入 v1（建议 v2）
- 是否对接 GitHub OAuth（建议 v1 仅邮箱/用户名密码，v1.1 加 OAuth）
