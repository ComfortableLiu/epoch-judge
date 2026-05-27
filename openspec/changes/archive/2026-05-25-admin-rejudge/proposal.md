# Proposal: 管理后台批量重判

## Why

题目测例、评测配置或判题机故障修复后，管理员需要按**题目**、**提交记录**或**比赛**维度批量重新评测，而不能让用户逐条重新提交。当前系统仅支持首次入队判题，缺少重判入口与可区分的重判状态，运维与教研无法高效纠正历史结果。

## What Changes

- 管理后台新增「重判」能力：支持多选，按题目 / 提交 / 比赛三种维度筛选待重判记录
- 新增管理 API：预览可重判数量、提交批量重判任务
- 扩展提交状态机：增加重判排队与重判中状态，列表与详情/SSE 可展示
- 重判流程复用现有 BullMQ 队列与 Judge Worker，重置测例结果为 PENDING 后重新入队
- 重判仅针对**已达终态**的提交（AC、WA、TLE 等），进行中的提交不可重判
- 受全局限流 `JUDGE_GLOBAL_MAX_INFLIGHT` 与队列容量约束

## Capabilities

### New Capabilities

- `admin-rejudge`：管理端重判 UI、批量选择与按维度筛选、重判任务提交与结果反馈

### Modified Capabilities

- `admin-ops`：管理后台增加重判入口与操作流程
- `submissions`：提交状态扩展、重判语义、列表/详情展示与 SSE 更新
- `judge-engine`：Worker 识别重判任务、状态迁移与结果写回

## Impact

- **数据库**：`SubmissionStatus` 枚举新增值，需 Prisma 迁移；可选 `rejudge_count` / `last_rejudged_at` 字段
- **API**：`apps/api` 新增 `admin/rejudge` 模块；`submissions` 查询支持重判状态筛选
- **Judge**：`apps/judge` Worker 入队 jobId 策略、状态更新逻辑
- **前端**：`AdminPage` 新 Tab；`submission-status-ui` 与 i18n；提交列表展示重判状态
- **共享包**：`packages/shared` 枚举与终态判断；`packages/db` 种子无需变更
