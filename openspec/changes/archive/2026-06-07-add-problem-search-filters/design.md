## Context

当前题库页面仅支持翻页浏览，用户无法快速搜索或筛选题目。随着题库数量增长，用户体验下降。现有 API `GET /problems` 仅支持分页参数，无搜索和筛选能力。

现有实现：
- 后端：`problems.controller.ts` 提供 `/problems` 端点，`problems.service.ts` 处理查询逻辑
- 前端：题库列表组件使用 Ant Design Table，仅支持分页
- 数据库：problems 表包含 title、tags、difficulty 等字段

## Goals / Non-Goals

**Goals:**
- 添加按标题/编号关键词搜索功能
- 添加按标签筛选功能
- 添加按难度区间筛选功能
- 保持现有分页功能不变
- 提供良好的用户体验（实时搜索、筛选联动）

**Non-Goals:**
- 不改变题目数据模型
- 不添加新的排序方式（保持现有排序）
- 不实现高级搜索语法（如布尔运算）
- 不添加搜索历史或保存筛选条件功能

## Decisions

### Decision 1: 搜索参数设计

**选择**: 使用独立的查询参数 `keyword`、`tags`、`difficultyMin`、`difficultyMax`

**理由**:
- 符合 RESTful API 设计规范
- 参数语义清晰，易于理解和使用
- 便于前端传递和后端解析

**替代方案**:
- 方案 A: 使用 JSON 格式的 `filter` 参数 → 解析复杂，不利于简单查询
- 方案 B: 使用 POST 请求的 body → 不符合 GET 语义
- 方案 C: 独立查询参数 → 语义清晰，易于使用 ✓

### Decision 2: 关键词搜索范围

**选择**: 搜索标题和题目编号（id）

**理由**:
- 标题是最主要的搜索目标
- 编号是精确查找的常用方式
- 语句（statement）内容过长，搜索效率低且结果不精准

**替代方案**:
- 方案 A: 仅搜索标题 → 可能遗漏编号查找
- 方案 B: 搜索标题、编号、语句 → 效率低，结果不精准
- 方案 C: 搜索标题和编号 → 平衡效率和实用性 ✓

### Decision 3: 标签筛选方式

**选择**: 支持多标签筛选，使用逗号分隔的标签名称

**理由**:
- 用户可能需要同时筛选多个标签
- 逗号分隔格式简单直观
- 便于前端传递和后端解析

**示例**: `?tags=dp,graph` 表示筛选包含 dp 或 graph 标签的题目

### Decision 4: 难度筛选方式

**选择**: 使用 `difficultyMin` 和 `difficultyMax` 参数定义区间

**理由**:
- 区间筛选比单值筛选更灵活
- 用户可以筛选特定难度范围的题目
- 符合常见的筛选模式

**示例**: `?difficultyMin=1000&difficultyMax=2000` 表示筛选难度在 1000-2000 之间的题目

### Decision 5: 前端 UI 组件

**选择**: 使用 Ant Design 的 Input.Search、Select、Slider 组件

**理由**:
- 与现有 UI 风格一致
- 组件成熟稳定，功能完善
- 支持中文本地化

**组件布局**:
- 顶部：搜索框（Input.Search）
- 左侧或顶部：标签选择器（Select mode="multiple"）
- 左侧或顶部：难度区间滑块（Slider range）

## Risks / Trade-offs

**[Risk] 搜索性能** → 缓解：对 title 字段添加索引，使用 LIKE 查询优化

**[Risk] 标签数据一致性** → 缓解：标签筛选使用精确匹配，避免模糊匹配导致的歧义

**[Risk] 前端状态管理** → 缓解：使用 URL 参数同步筛选状态，支持刷新和分享链接

**[Trade-off] 搜索范围** → 选择搜索标题和编号，牺牲搜索语句的能力换取更高的搜索效率和准确性

## Migration Plan

1. 后端：修改 `problems.service.ts`，添加搜索和筛选逻辑
2. 后端：修改 `problems.controller.ts`，添加查询参数定义
3. 前端：创建筛选 UI 组件
4. 前端：修改题库列表页面，集成筛选组件
5. 测试：验证搜索和筛选功能
6. 文档：更新 API 文档，说明新增参数

## Open Questions

- 是否需要对 title 字段添加数据库索引以优化搜索性能？
- 标签筛选是 OR 还是 AND 逻辑？（当前设计为 OR）
- 难度字段的取值范围和类型是什么？（假设为数值类型）
