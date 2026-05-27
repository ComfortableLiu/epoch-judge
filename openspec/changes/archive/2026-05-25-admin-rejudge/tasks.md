# Tasks

## 1. 数据与共享类型

- [x] 1.1 Prisma：`SubmissionStatus` 增加 `REJUDGE_QUEUED`、`REJUDGING`；可选 `rejudgeCount`、`lastRejudgedAt`；迁移脚本
- [x] 1.2 `packages/shared` 枚举、`isSubmissionTerminal`、终态列表同步更新

## 2. API 重判服务

- [x] 2.1 实现 `RejudgeService`：按 scope 解析提交、校验终态、同步测例结果行、重置 PENDING
- [x] 2.2 `POST /admin/rejudge/preview` 与 `POST /admin/rejudge`（ADMIN），批量上限与 inflight 入队
- [x] 2.3 `JudgeQueueService` 支持重判 jobId（`${submissionId}:rejudge:${n}`）
- [x] 2.4 管理端查询：题目/比赛/提交维度列表接口（供多选表格）

## 3. Judge Worker

- [x] 3.1 Worker 识别 `REJUDGE_QUEUED` → `REJUDGING`，复用现有评测循环与 SSE 发布
- [x] 3.2 gRPC/终态判断包含新状态

## 4. 前端管理后台

- [x] 4.1 `admin-url` 增加 `rejudge` Tab；`AdminRejudgePanel`：维度切换 + 多选 + 预览/确认
- [x] 4.2 提交列表/详情：`submission-status-ui` 与 i18n 展示重判状态；轮询包含非终态重判态

## 5. 文档与验证

- [x] 5.1 更新 `docs/developer.md` 重判 API 说明
- [x] 5.2 冒烟：终态提交重判 → 状态 REJUDGE_QUEUED → REJUDGING → 新终态
