## Context

个人资料页（`ProfilePage`）已有 `GET /users/me` 与昵称、改密能力。提交数据在 `Submission`（含 `userId`、`problemId`、`contestId`、`status`、`createdAt`）；比赛参与可通过 `ContestRegistration` 与带 `contestId` 的提交推断。当前无用户侧聚合 API。

## Goals / Non-Goals

**Goals:**

- 提供只读、本人可访问的统计 API，支撑资料页数据面板。
- 首版覆盖：题目通过数/列表、练习通过率、提交终态分布、参加过的比赛列表及场内简要成绩。
- Web 面板分区展示（概览数字 + 表格），支持跳转题目/比赛/提交记录。
- 查询基于现有索引（`userId`），列表分页。

**Non-Goals:**

- 他人主页、全站排行榜、图表库（ECharts）复杂可视化（首版用 Ant Design Statistic/Table 即可）。
- 按语言/难度/标签的多维钻取图表（可后续迭代）。
- 物化表或定时任务预聚合（数据量增大后再做）。
- 管理员查看任意用户统计。

## Decisions

### 1. API 形态

- **`GET /api/v1/users/me/stats`**：返回 `summary` + `verdictBreakdown` + `contests`（比赛列表可不分页，预期每人数量有限）。
- **`GET /api/v1/users/me/stats/solved-problems`**：已通过题目分页列表（`page`、`pageSize`，默认 20）。
- 理由：概览一次加载，长列表独立分页，避免单次响应过大。

### 2. 指标定义

| 指标 | 定义 |
|------|------|
| 已通过题目数 | 至少有一条 `status = ACCEPTED` 的**不同** `problemId`（含比赛题与练习题） |
| 已尝试题目数 | 至少有一条终态提交的不同 `problemId`（终态 = 非 PENDING/QUEUED/JUDGING/COMPILING/RUNNING/REJUDGE_*） |
| 练习通过率 | `已通过题目数 / 已尝试题目数 × 100%`（无尝试时为 0 或展示「—」） |
| 总提交数 | 当前用户全部 `Submission` 计数 |
| 终态分布 | 按 `status` 分组计数（仅终态） |
| 比赛参与 | 存在 `ContestRegistration` **或** 在该 `contestId` 下有提交；合并去重按 `contestId` |

已通过题目列表：每题取**首次 AC** 的 `createdAt`；展示 `problem.number`、`problem.title`、可选 `contestId` 标记是否比赛题。

比赛列表项：`contest.number`、`title`、`startAt`、`endAt`、`status`（upcoming/running/ended）、`submissionCount`、`acceptedProblemCount`（该场内不同 AC 题数）。

### 3. 实现位置

- `UsersService.getMyStats()` / `listMySolvedProblems()`；`UsersController` 挂载在 `users/me` 下，JWT 必需。
- 使用 Prisma `groupBy` / 子查询；对 solved-problems 用 `distinct` + 排序。

### 4. 前端布局

- `ProfilePage` 顶部或 Tab：**资料** | **数据面板**（或单页纵向：基本信息 → 数据面板 → 改密），推荐 **Tabs** 避免页面过长。
- 数据面板：`Row` + `Statistic` 概览；`Table` 已通过题目、比赛记录；verdict 用 `Tag` 或小型描述列表。
- i18n 键 `profile.stats.*`。

### 5. 权限与隐私

- 仅 `JwtAuthGuard`；`userId` 取自 token，忽略路径中的其他用户 id（本变更不新增 `GET /users/:id/stats`）。

## Risks / Trade-offs

- **[Risk] 重度用户提交量大导致聚合慢** → 分页列表；summary 用 COUNT/GROUP BY；必要时加 `(userId, status)` 复合索引（迁移可选）。
- **[Risk] 通过率语义与用户预期不一致** → UI 旁注说明「按不同题目首次 AC / 曾提交过的不同题目」。
- **[Risk] 比赛题与练习题混在通过列表** → 列中标注「比赛」Tag 或 `contestNumber`。

## Migration Plan

1. 部署 API → 部署 Web；无 DB 迁移必需。
2. 回滚：移除前端 Tab 与 API 路由即可，无数据破坏。

## Open Questions

- 是否在首版展示「最近 10 条提交」时间线？（建议放入 tasks 可选项）
- 通过率是否排除仅比赛提交、单独统计「练习」维度？（首版合并，spec 可写 practice = `contestId IS NULL` 作为 summary 子字段预留）
