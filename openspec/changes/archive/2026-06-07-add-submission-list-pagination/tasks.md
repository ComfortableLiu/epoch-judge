## 1. 后端 API 分页支持

- [x] 1.1 创建分页查询 DTO（PaginationQueryDto）：定义 `page`（默认 1，最小 1）和 `limit`（默认 20，最小 1，最大 100）参数
- [x] 1.2 创建分页响应 DTO（PaginatedResponseDto）：定义 `data`、`pagination`（total, page, limit, totalPages）结构
- [x] 1.3 修改 `submissions.service.ts` 的 `listForUser` 方法：接受分页参数，使用 Prisma 的 `skip` 和 `take` 实现分页查询
- [x] 1.4 在 `listForUser` 方法中添加 `count` 查询：获取符合条件的总记录数
- [x] 1.5 修改 `submissions.controller.ts`：在 `listForUser` 端点添加查询参数验证和转换
- [x] 1.6 返回标准化分页响应：包含 `data` 数组和 `pagination` 元数据

## 2. 前端分页组件集成

- [x] 2.1 确认前端提交列表组件位置和当前数据获取模式（React Query）
- [x] 2.2 创建分页状态管理：使用 React state 存储当前页码和每页条数
- [x] 2.3 修改 API 调用：传递 `page` 和 `limit` 参数到后端 API
- [x] 2.4 添加 Ant Design `Pagination` 组件：配置 `current`、`pageSize`、`total`、`onChange`、`showSizeChanger` 属性
- [x] 2.5 实现翻页逻辑：页码变化时重新获取数据，使用 `keepPreviousData` 避免闪烁
- [x] 2.6 实现每页条数选择：支持 10, 20, 50 条选项，切换时重置到第 1 页

## 3. 测试与验证

- [x] 3.1 为 `listForUser` 分页逻辑添加单元测试：验证默认分页、自定义分页、边界情况（空数据、超大页码）
- [x] 3.2 为分页参数验证添加测试：验证无效参数（page=0, limit=-1, limit>100）返回 400 错误
- [x] 3.3 手动测试前端分页功能：验证翻页、条数选择、加载状态显示正确
- [x] 3.4 性能测试：验证大量提交记录时分页查询性能（确保索引生效）

## 4. 文档与清理

- [x] 4.1 更新 API 文档：添加分页参数和响应格式说明
- [x] 4.2 检查并更新相关组件的 TypeScript 类型定义
- [x] 4.3 清理旧的固定 `take: 50` 代码和相关注释
