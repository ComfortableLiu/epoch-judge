# 开发者文档

## API

- 前缀：`/api/v1`
- 文档：运行 API 后访问 `/api/docs`
- 语言头：`X-Locale: zh-CN | en-US`

## CORS 跨域配置

NestJS 应用内置 CORS 中间件，通过环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CORS_ORIGINS` | 开发: `http://localhost:8080`；生产: 无 | 逗号分隔的允许源 URL 列表 |

- 开发环境（`NODE_ENV !== 'production`）未设置 `CORS_ORIGINS` 时默认允许 `http://localhost:8080`
- 生产环境未设置时拒绝所有跨域请求（`origin: false`）
- 始终启用 `credentials: true` 以支持 JWT Token 跨域传递
- 允许的 headers：`Authorization`、`Content-Type`、`Accept`、`X-Locale`

## 评测模式

- **比赛**：`contests.judge_mode` 优先级最高；从比赛进入提交（`?contestId=`）时模式锁定且不可改。
- **个人偏好**：`users.preferred_judge_mode` / `preferred_language`，在「设置」页配置；题库提交可手选模式（未参赛时）。
- **题目**：不再绑定 `default_judge_mode`（已移除）。

`GET /problems/:number/submit-context?contestId=` 返回默认语言/模式及是否锁定。题目与比赛均使用自增数字 `number` 作为 URL 与展示 ID。`contestId` 可为比赛自增数字 ID 或内部 cuid。

## 比赛（BREAKING）

- 路由与 API 使用自增数字 **`number`**，不再使用 `slug`：`GET /contests/:number`、榜单 `/contests/:number/scoreboard`。
- 可选 **`accessPassword`**（bcrypt 哈希存储）；`POST /contests/:number/verify-password` 校验后写入报名记录的 `passwordVerified`。
- 管理端 API 响应中不返回密码哈希值，仅返回 `requiresPassword` 布尔字段。
- **迁移**：若从旧版本升级（明文密码），运行 `yarn migrate:contest-passwords` 将已有明文密码批量哈希（幂等，可重复执行）。
- 管理端 `POST/PATCH /admin/contests` 无需 slug；请求体可含 `accessPassword`、`problemIds`（顺序即 A/B/C）。
- **报名快照**：`ContestRegistration.displayNameSnapshot` 在首次报名/验证密码/管理员添加时冻结（`displayName` 或 `username`），榜单展示不随用户改昵称变化。
- **打星队伍**：`ContestRegistration.isStarTeam`；管理端 `GET/POST/PATCH /admin/contests/:id/registrations`；榜单名前加 `*`，不计入官方排名与成绩（`rank`、`score`/`solved`/`penalty` 为空），单独展示在「打星队伍」区块。
- **未开始准入**：`startAt` 之前仅 `ADMIN` 与 `Contest.createdById`（发起者）可进入详情/题目/榜单；所有人（含管理员与发起者）均不可提交（`contest.not_active` / `isActiveForSubmit`）。

## 题目可见性

- 新建题目默认 **`PRIVATE`**，并记录 **`createdById`**。
- 全局题库：仅 `PUBLIC` 且未被「未结束比赛」锁定的题目对普通用户可见；创建者与管理员/题目编辑始终可见。
- 比赛内：已满足比赛准入（含密码赛验证、PUBLIC 赛登录可见）的用户可查看该比赛挂载的题目，即使题为 `PRIVATE`。
- 题目仍挂在未结束的比赛时，在题库等全局入口对普通用户隐藏（创建者/管理员除外）。

## 迁移失败 P3009（contest-guards-and-admin）

若 `20260525210000_contest_guards_and_admin` 标记为 failed：

```bash
# 仓库根目录一键修复（自动读取 .env；用 prisma db execute，无需安装 mysql 命令行）
./scripts/fix-p3009-migration.sh
```

若 `slug` 已被删掉且其余列已齐：`./scripts/fix-p3009-migration.sh --applied-only`

## 判题流程

1. `POST /submissions` 创建提交并入 BullMQ 队列（队列名 `judge-tasks`，Redis 前缀 `REDIS_KEY_PREFIX`）
2. Judge Worker 消费任务，写回 `submission_testcase_results`
3. 经 Redis pub/sub `{REDIS_KEY_PREFIX}:judge:events` 推送 SSE：`GET /submissions/:number/stream`（对外用自增 `number`，队列与 Redis 仍用内部 cuid `id`）

开发模式设置 `JUDGE_MOCK=true` 跳过真实沙箱。

**启动恢复**：API 启动时默认扫描所有非终态提交并重新入队（`JUDGE_RECOVER_ON_STARTUP=false` 可关闭）。日志关键字 `Startup recovery`。

**队列载荷**：BullMQ 任务仅含提交与题目元数据，不含测例列表；Worker 按 `problemId` 从数据库加载测例（进程内缓存，同题只加载一次）。

## SSE 连接限制

每个用户限制最大 SSE 并发连接数（默认 3），超出时关闭最旧连接。使用 Redis Sorted Set 追踪，支持多实例部署。

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SSE_MAX_CONNECTIONS_PER_USER` | `3` | 每用户最大 SSE 并发连接数 |

- 连接追踪 key 自动设置 1 小时 TTL，崩溃场景下不会永久泄漏
- 多实例部署通过 Redis Pub/Sub 实现跨实例 eviction

## 题目导入 ZIP 结构

```
problem.yaml
statement.md
assets/          # 可选，题面内嵌图片（png/jpg/gif/webp/svg）
  diagram.png
testdata/
  1.in
  1.out
```

`statement.md` 中可用相对路径引用图片，例如 `![](assets/diagram.png)`，导入后会通过 `GET /api/v1/problems/:number/assets/*` 提供访问。`problem.yaml` 可选字段：

| 字段 | 说明 |
|------|------|
| `number` | 覆盖更新已有题目（upsert） |
| `tags` | 字符串数组，最多 5 个，每个 1–10 字符 |

## 题目导出 ZIP

管理员/题目编辑：`GET /problems/:id/export?testdata=true|false`（默认 `true`）。

- `testdata=true`：与导入模板一致，含 `testdata/*.in|out`
- `testdata=false`：仅 `problem.yaml`、`statement.md`、`assets/**`

## 用户资料

- 昵称字段：`User.displayName`（可空、**不要求唯一**，最长 64 字符）
- 个人资料：`GET /users/me`；`PATCH /users/me` 可更新 `displayName`、`email`、判题偏好等
- 展示：提交记录等对外显示优先 `displayName`，为空则回退 `username`

### 个人数据面板（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/users/me/stats` | 汇总：总提交、已通过/已尝试题数、通过率、终态分布、参加过的比赛列表 |
| `GET` | `/users/me/stats/solved-problems?page=&pageSize=` | 已通过题目分页（题号、标题、首次 AC 时间、是否比赛题） |

`summary.passRatePercent` = 不同题目 AC 数 ÷ 不同题目终态提交数 × 100（无尝试时为 0）。比赛参与 = 有报名记录或在该比赛下有提交。

## 认证与 Token

- 登录/注册：`POST /auth/login`、`POST /auth/register` 返回 `accessToken`（JWT）。
- 刷新：`POST /auth/refresh`，请求头带 `Authorization: Bearer <当前或已过期 token>`；签名有效且过期不超过 30 天时签发新 token。
- 前端在 token 将过期（15 分钟内）时主动 refresh；接口返回 401 时会先尝试 refresh 一次，失败则清除 `epoch.token` 并跳转登录页。

## 速率限制

所有 HTTP 端点默认启用基于 IP 的速率限制（`@nestjs/throttler`）：

| 端点 | 默认限制 |
|------|----------|
| 全局 | 60 次/分钟 |
| `POST /auth/login`、`POST /auth/register` | 5 次/分钟 |
| `POST /submissions` | 10 次/分钟 |
| `GET /submissions/:number/stream`（SSE） | 不受限流 |

环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `THROTTLE_ENABLED` | `true` | 设为 `false` 关闭限流 |
| `THROTTLE_TTL` | `60` | 限流窗口（秒） |
| `THROTTLE_LIMIT` | `60` | 全局每窗口请求数 |
| `THROTTLE_AUTH_LIMIT` | `5` | 认证端点每窗口请求数 |
| `THROTTLE_SUBMISSION_LIMIT` | `10` | 提交端点每窗口请求数 |
| `THROTTLE_STORAGE` | `memory` | 存储后端；多实例部署设为 `redis` |
| `TRUST_PROXY` | `1` | nginx 代理跳数；直连设为 `false` |

多实例部署时需设置 `THROTTLE_STORAGE=redis` 以共享限流计数，否则各实例独立计数。

## 账号密码

- 个人改密：`PATCH /users/me/password`（`currentPassword`、`newPassword` ≥8 位）
- 管理员重置：`POST /users/:id/reset-password`（二次确认由前端完成）
- 重置后用户须用**原用户名**调用 `POST /auth/register` 设置新密码；重置完成前 `POST /auth/login` 与密码错误相同，返回 `auth.invalid_credentials`（不暴露账号已重置）

## 题目测例管理（管理端 API）

需管理员或题目编辑权限（`Authorization: Bearer …`）：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/problems/:id/testcases` | 测例列表（元数据） |
| `GET` | `/problems/:id/testcases/:testcaseId` | 测例详情（含输入/输出文本） |
| `POST` | `/problems/:id/testcases` | 新增测例（JSON：`input`、`output`、`score`、`isSample?`、`ordinal?`） |
| `PATCH` | `/problems/:id/testcases/:testcaseId` | 更新测例 |
| `DELETE` | `/problems/:id/testcases/:testcaseId` | 删除测例 |

管理后台题目编辑弹窗的「测试用例」页签调用上述接口，支持在线增删改查。

## 管理端批量重判（ADMIN）

管理后台「重判」页签（`?tab=rejudge`）或下列 API。仅**终态**提交可重判；入队后状态为 `REJUDGE_QUEUED` → Worker 置 `REJUDGING` → 新终态。BullMQ `jobId` 为 `{submissionId}:rejudge:{rejudgeCount}`。

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/admin/rejudge/candidates` | 按维度列出可勾选提交（终态） |
| `POST` | `/admin/rejudge/preview` | 预览可重判条数与跳过原因 |
| `POST` | `/admin/rejudge` | 执行重判并入队 |

请求体：

```json
{
  "scope": "problem | submission | contest",
  "ids": ["目标 ID 列表"],
  "submissionIds": ["可选，problem/contest 维度下进一步勾选提交 ID"]
}
```

- `scope=submission`：`ids` 为提交 ID；`ids` 为空时返回最近 200 条终态提交供勾选。
- `scope=problem`：`ids` 为题目 ID；可选 `submissionIds` 取交集。
- `scope=contest`：`ids` 为比赛 ID；可选 `submissionIds` 取交集。
- `statuses`：可选，终态多选（如 `ACCEPTED`、`WRONG_ANSWER`）；不传则包含全部终态。

环境变量 `REJUDGE_BATCH_MAX`（默认 500）限制单次批量上限。

模板见仓库 `templates/` 目录。

## 用户批量导入 CSV

```csv
username,email,password
```

模板：`GET /api/v1/templates/user-import.csv`
