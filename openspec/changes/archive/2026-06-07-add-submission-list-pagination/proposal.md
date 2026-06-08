## Why

提交列表 API 的 `listForUser` 方法固定返回最近 50 条记录，前端无分页控件。用户无法查看更早的提交历史，当提交次数超过 50 次后，早期记录将被截断且无法访问。需要实现服务端分页以支持完整的提交历史浏览。

## What Changes

- **API 分页支持**：`listForUser` 方法接受 `page` 和 `limit` 查询参数，返回分页数据（含总数）
- **前端分页组件**：在提交列表页面添加分页控件，支持翻页和每页条数选择
- **响应格式标准化**：API 返回标准化分页响应格式 `{ data, total, page, limit }`

## Capabilities

### New Capabilities

- `submission-list-pagination`: 提交列表服务端分页能力，包括 API 分页参数支持和前端分页 UI 组件

### Modified Capabilities

- `submissions`: 修改提交历史查询需求，从固定 50 条改为可分页查询，需更新 spec 中 Submission history 需求的分页行为描述

## Impact

- **后端 API**：`submissions.service.ts` 的 `listForUser` 方法需重构，`submissions.controller.ts` 需添加查询参数验证
- **前端页面**：提交列表组件需添加 Ant Design `Pagination` 组件
- **数据库**：查询模式变更，需确保 `userId` + `createdAt` 索引有效以支持高效分页
- **类型定义**：需新增分页响应 DTO 类型
