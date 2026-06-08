## Why

题库页面目前只能翻页浏览，无搜索框、无标签筛选、无难度区间筛选，用户找到目标题目非常困难。随着题库数量增长，用户需要快速定位目标题目的能力。需要在题库列表页添加搜索和筛选功能，提升用户体验。

## What Changes

- API 层：修改题目列表接口，支持 `keyword`（标题/编号关键词）、`tags`（标签筛选）、`difficultyMin`/`difficultyMax`（难度区间）查询参数
- 前端 UI：在题库列表页顶部添加搜索框、标签选择器、难度区间滑块等筛选组件
- 前端逻辑：将筛选参数传递给 API，实时更新题目列表
- 保持现有分页功能不变

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `problems`: 修改题目列表规格，添加搜索和筛选功能要求

## Impact

- 影响代码：
  - 后端：`src/modules/problems/problems.controller.ts`、`src/modules/problems/problems.service.ts`
  - 前端：题库列表页面组件、筛选 UI 组件
- 影响 API：`GET /problems` 接口新增查询参数
- 影响用户体验：用户可快速搜索和筛选题目
- 依赖：无新增依赖
