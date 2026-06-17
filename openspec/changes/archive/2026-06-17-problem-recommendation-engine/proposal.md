## Why

用户刷题时不知道下一步练什么，只能盲目浏览题库。基于用户历史提交记录推荐合适难度的题目，可以提升刷题效率和用户粘性。LeetCode 的推荐系统是其核心竞争力之一。

## What Changes

- 基于用户提交历史计算"能力画像"（已掌握的标签、平均通过难度）
- 推荐算法：优先推荐用户未通过但能力范围内（难度略高于已通过最高难度）的题目
- 按标签差异化推荐：用户薄弱标签优先推荐
- 题目详情页和题库页添加"为你推荐"区域
- 推荐结果缓存（Redis），每小时更新一次

## Capabilities

### New Capabilities

- `recommendation-engine`: 基于提交历史的题目推荐引擎

### Modified Capabilities

（无）

## Impact

- **API**：新增 recommendations 模块，复用 submissions 和 problems 数据
- **Redis**：缓存推荐结果 `recommendations:{userId}`
- **前端**：题库页/题目详情页新增推荐区域
- **算法**：纯规则引擎，无需 ML 模型
