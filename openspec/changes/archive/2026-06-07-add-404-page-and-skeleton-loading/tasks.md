## 1. 404 页面实现

- [x] 1.1 创建 NotFound 页面组件（src/components/NotFound.tsx）
- [x] 1.2 实现 404 页面 UI（404 标识、提示文字、返回首页链接）
- [x] 1.3 配置 React Router 通配路由（path: "*"）
- [x] 1.4 测试 404 页面功能（访问不存在路由、返回首页链接）

## 2. 骨架屏组件开发

- [x] 2.1 创建题目列表骨架屏组件（src/components/skeleton/ProblemListSkeleton.tsx）
- [x] 2.2 创建比赛列表骨架屏组件（src/components/skeleton/ContestListSkeleton.tsx）
- [x] 2.3 创建提交列表骨架屏组件（src/components/skeleton/SubmissionListSkeleton.tsx）
- [x] 2.4 确保骨架屏样式与 Ant Design Skeleton 组件一致

## 3. 列表页集成骨架屏

- [x] 3.1 修改题目列表页，集成骨架屏 Loading
- [x] 3.2 修改比赛列表页，集成骨架屏 Loading
- [x] 3.3 修改提交列表页，集成骨架屏 Loading
- [x] 3.4 确保 loading 状态切换正常（骨架屏 ↔ 实际内容）

## 4. 测试与验证

- [x] 4.1 测试所有 404 场景（各种不存在的路由路径）
- [x] 4.2 测试骨架屏显示和消失时机
- [x] 4.3 验证现有路由功能不受影响
- [x] 4.4 检查 UI 视觉一致性和用户体验
