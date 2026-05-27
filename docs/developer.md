# 开发者文档

## API

- 前缀：`/api/v1`
- 文档：运行 API 后访问 `/api/docs`
- 语言头：`X-Locale: zh-CN | en-US`

## 评测模式

- **比赛**：`contests.judge_mode` 优先级最高；从比赛进入提交（`?contestId=`）时模式锁定且不可改。
- **个人偏好**：`users.preferred_judge_mode` / `preferred_language`，在「设置」页配置；题库提交可手选模式（未参赛时）。
- **题目**：不再绑定 `default_judge_mode`（已移除）。

`GET /problems/:number/submit-context?contestId=` 返回默认语言/模式及是否锁定。题目与比赛均使用自增数字 `number` 作为 URL 与展示 ID。`contestId` 可为比赛自增数字 ID 或内部 cuid。

## 比赛（BREAKING）

- 路由与 API 使用自增数字 **`number`**，不再使用 `slug`：`GET /contests/:number`、榜单 `/contests/:number/scoreboard`。
- 可选 **`accessPassword`**（明文存储）；`POST /contests/:number/verify-password` 校验后写入报名记录的 `passwordVerified`。
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
