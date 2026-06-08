## 1. 分析现有实现

- [x] 1.1 阅读 `src/modules/problems/problems.controller.ts` 中的 `/problems` 端点
- [x] 1.2 阅读 `src/modules/problems/problems.service.ts` 中的查询逻辑
- [x] 1.3 确认 problems 表结构，特别是 title、tags、difficulty 字段
- [x] 1.4 查看前端题库列表页面组件

## 2. 后端 API 修改

- [x] 2.1 修改 `problems.controller.ts`，添加 `keyword`、`tags`、`difficultyMin`、`difficultyMax` 查询参数定义
- [x] 2.2 修改 `problems.service.ts`，实现关键词搜索逻辑（匹配 title 和 id）
- [x] 2.3 修改 `problems.service.ts`，实现标签筛选逻辑（多标签 OR 匹配）
- [x] 2.4 修改 `problems.service.ts`，实现难度区间筛选逻辑
- [x] 2.5 确保筛选条件可以组合使用
- [x] 2.6 确保分页功能正常工作

## 3. 前端筛选 UI 组件

- [x] 3.1 创建搜索框组件（使用 Ant Design Input.Search）
- [x] 3.2 创建标签选择器组件（使用 Ant Design Select mode="multiple"）
- [x] 3.3 创建难度区间滑块组件（使用 Ant Design Slider range）
- [x] 3.4 创建筛选容器组件，组合所有筛选组件
- [x] 3.5 实现筛选参数的状态管理

## 4. 集成到题库列表页

- [x] 4.1 修改题库列表页面，添加筛选容器组件
- [x] 4.2 将筛选参数传递给 API 请求
- [x] 4.3 实现 URL 参数同步，支持刷新和分享链接
- [x] 4.4 处理筛选参数变化时的列表刷新

## 5. 测试验证

- [x] 5.1 测试关键词搜索功能（标题匹配、编号匹配）
- [x] 5.2 测试标签筛选功能（单标签、多标签）
- [x] 5.3 测试难度区间筛选功能（最小值、最大值、区间）
- [x] 5.4 测试组合筛选功能
- [x] 5.5 测试分页功能在筛选后正常工作
- [x] 5.6 测试 URL 参数同步功能
- [x] 5.7 运行现有测试，确保无回归问题

## 6. 文档和清理

- [x] 6.1 更新 API 文档，说明新增的查询参数
- [x] 6.2 确认所有任务完成
