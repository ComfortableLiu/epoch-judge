## Context

当前提交列表 API 的 `listForUser` 方法使用 Prisma 的 `findMany` 并固定 `take: 50`，只返回最近 50 条提交记录。前端无分页控件，用户无法浏览更早的提交历史。

**现有实现**：
- 后端：`submissions.service.ts` 的 `listForUser` 方法
- 前端：提交列表组件（待确认具体位置）
- 数据库：MySQL + Prisma ORM

**约束**：
- UI 框架：Ant Design（非 Tailwind）
- 图标库：@icon-park/react
- 状态管理：需确认前端当前的数据获取模式（React Query / SWR / 直接 fetch）

## Goals / Non-Goals

**Goals:**
- API 支持 `page` 和 `limit` 查询参数，返回标准化分页响应
- 前端添加分页组件，支持翻页和每页条数选择
- 保持向后兼容（不改变现有端点路径）
- 确保分页查询性能（利用数据库索引）

**Non-Goals:**
- 不实现无限滚动或虚拟滚动
- 不实现服务端排序（保持现有 `createdAt: desc` 排序）
- 不实现提交列表的实时更新（已有 SSE 机制）
- 不修改其他提交查询方法（如 `listForProblem`）

## Decisions

### 1. 分页参数命名：`page` + `limit`

**选择**：使用 `page`（从 1 开始）和 `limit`（每页条数，默认 20）

**理由**：
- 与常见 REST API 分页约定一致
- `page` 比 `offset` 更直观，用户不需要计算偏移量
- `limit` 比 `pageSize` 更简洁

**备选方案**：
- `offset` + `limit`：更灵活但用户不友好
- `cursor`-based：适合无限滚动，但不适合传统分页 UI

### 2. 响应格式：包装对象

**选择**：
```typescript
{
  data: Submission[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

**理由**：
- 包含总数和总页数，前端无需额外计算
- 与项目中其他分页 API（如有）保持一致
- 支持前端显示"共 X 条，第 Y/Z 页"

**备选方案**：
- 仅返回 `data` + `total`：前端需自行计算总页数
- 使用 HTTP 头部（如 `X-Total-Count`）：不符合项目现有风格

### 3. 分页组件：Ant Design Pagination

**选择**：使用 Ant Design 的 `Pagination` 组件，置于列表底部

**理由**：
- 与项目 UI 框架一致
- 内置翻页、条数选择、页码跳转功能
- 样式与项目其他页面统一

### 4. 数据获取模式：React Query（假设）

**选择**：使用 React Query 的 `useQuery` 获取分页数据，通过 query key 缓存不同页数据

**理由**：
- 自动缓存和重新获取
- 支持 `keepPreviousData` 避免翻页时闪烁
- 与项目现有数据获取模式一致（需确认）

**备选方案**：
- SWR：类似功能，但需确认项目是否已使用
- 直接 fetch + useState：更简单但缺乏缓存优化

## Risks / Trade-offs

- **[风险] 分页性能**：大量提交记录时 `COUNT(*)` 查询可能慢
  → 缓解：确保 `userId` + `createdAt` 索引存在；考虑缓存总数（可选）

- **[风险] 数据一致性**：翻页期间有新提交插入，可能导致记录重复或遗漏
  → 缓解：使用 `createdAt` 排序，新数据只出现在第一页；接受轻微不一致性

- **[权衡] 向后兼容 vs 清洁 API**：保持现有端点路径不变，但响应格式变更
  → 决策：响应格式变更属于 BREAKING CHANGE，需版本控制或渐进式迁移

- **[权衡] 总数查询开销**：每次分页请求都执行 `COUNT(*)`
  → 决策：对于用户级提交列表（通常 < 10,000 条），性能可接受；如需优化可后续添加缓存
