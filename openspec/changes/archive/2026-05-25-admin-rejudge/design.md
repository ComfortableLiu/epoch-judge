# Design: 管理后台批量重判

## Context

- 提交创建时写入 `Submission` + `SubmissionTestcaseResult`，经 `JudgeQueueService` 入 BullMQ（`jobId = submissionId`）
- Worker 将状态置为 `JUDGING`，逐测例评测后写入终态
- 管理后台已有用户/题目/判题节点等 Tab，URL 使用 `?tab=` 查询参数

## Goals / Non-Goals

**Goals:**

- 管理员按题目 ID 列表、提交 ID 列表、比赛 ID 列表批量发起重判
- 支持预览（dry-run）与确认后入队
- 新增 `REJUDGE_QUEUED`、`REJUDGING` 状态，UI 与 API 一致
- 重判后测例结果与分数清空并重新计算，比赛关联提交仍保留 `contestId`

**Non-Goals:**

- 不修改用户源码（重判使用原 `sourceCode`）
- 不支持「只重跑部分测例」或「换语言重判」
- 不自动重判（无定时任务）；不实现重判优先级队列（与普通提交共用队列）

## Decisions

### 1. 重判 API 形态

`POST /api/v1/admin/rejudge/preview` — 返回将影响的提交数与样例 ID  
`POST /api/v1/admin/rejudge` — 执行重判

请求体：

```typescript
{
  scope: 'problem' | 'submission' | 'contest';
  ids: string[];           // problemId / submissionId / contestId
  submissionIds?: string[]; // scope=problem|contest 时可选进一步勾选
}
```

- `scope=submission`：`ids` 即提交 ID 列表（与表格多选一致）
- `scope=problem`：解析为所选题目下所有**终态**提交；若带 `submissionIds` 则取交集
- `scope=contest`：所选比赛下所有终态提交；若带 `submissionIds` 则取交集

**理由**：单一端点易于权限控制与审计；preview 避免误操作。

### 2. 新增状态

| 状态 | 含义 |
|------|------|
| `REJUDGE_QUEUED` | 已标记重判，等待 Worker 领取 |
| `REJUDGING` | Worker 已开始重判（进入评测流程前设置） |

入队后设为 `REJUDGE_QUEUED`；Worker `runJob` 开头设为 `REJUDGING`，随后与现网一致进入测例循环（可再发 `JUDGING` 事件或统一视为 REJUDGING 直至终态）。

终态集合不变；`isSubmissionTerminal()` 不包含上述两态。

可选字段：`Submission.rejudgeCount`（Int，默认 0，每次重判 +1）、`lastRejudgedAt`（DateTime?）。

### 3. 重判准备（单条提交）

1. 校验状态为终态或允许从 `REJUDGE_QUEUED` 幂等重试
2. 将所有 `SubmissionTestcaseResult.verdict` 置 `PENDING`，`score/timeMs/memoryKb` 清零
3. `submission.status = REJUDGE_QUEUED`，`score/timeMs/memoryKb = null`
4. 按当前题目测例列表重建 `JudgeTaskPayload`（测例增删后按最新 testcases）
5. `inflight.acquire()` 后 `queue.add`，**jobId** 使用 `${submissionId}:rejudge:${rejudgeCount}` 避免 BullMQ 与已完成 job 冲突

### 4. 管理端 UI

- `AdminPage` 增加 Tab `rejudge`（URL `?tab=rejudge`）
- 子表单：维度 Radio（题目 / 提交 / 比赛）→ 对应选择器（题目/比赛下拉多选，提交表格分页多选）
- 「预览影响条数」→「确认重判」
- 展示最近一批重判结果摘要（成功入队数、跳过数及原因）

题目/比赛维度下列出可勾选提交（默认选中终态），支持全选/反选。

### 5. 权限与限流

- 仅 `ADMIN`（可选含 `PROBLEM_EDITOR` 仅题目维度 — **首版仅 ADMIN**）
- 批量上限可配置（如单次最多 500 条），超出返回 400
- 每条仍走 `InflightService.acquire()`，与全局限流一致

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 同 submissionId 重复入队 | 唯一 jobId 含 rejudge 序号；入队前检查是否已在 REJUDGE_QUEUED/REJUDGING |
| 题目测例变更后旧结果行对不上 | 重判前按 problem.testcases 同步 result 行（增删测例） |
| 比赛榜单缓存 | 重判完成后依赖现有提交更新；榜单查询读最新 submission 状态 |
| 枚举迁移 **BREAKING** 仅增枚举值，旧数据兼容 |

## Migration Plan

1. Prisma 迁移：扩展 `SubmissionStatus` + 可选字段
2. 部署 API → 部署 Judge Worker（识别新状态）→ 部署 Web
3. 回滚：新状态提交保持 REJUDGE_QUEUED 直至手动处理；无破坏性 DDL 回滚需保留枚举值

## Open Questions

- 是否允许 `PROBLEM_EDITOR` 对所属题目发起重判（首版否，仅 ADMIN）
- 重判是否写审计表（首版用日志 + `rejudgeCount` 即可）
