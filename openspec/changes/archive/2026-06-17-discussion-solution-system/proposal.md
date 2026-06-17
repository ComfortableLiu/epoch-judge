## Why

EpochJudge 当前没有任何用户交流渠道，用户遇到难题无法讨论、无法查看题解，解题体验是孤立的。主流 OJ（洛谷、LeetCode、Codeforces）均有题解讨论区，这是用户留存的关键功能。

## What Changes

- 新增 Discussion 数据模型（关联 Problem、User，支持楼层/回复）
- 题目详情页底部添加讨论区 Tab
- 支持发帖（提问/题解）、回复、点赞
- 支持 Markdown 内容渲染（含代码块语法高亮）
- 管理员可置顶/删除不当内容
- 按时间/热度排序

## Capabilities

### New Capabilities

- `discussion-system`: 题目讨论与题解系统，支持发帖、回复、点赞、Markdown 渲染

### Modified Capabilities

（无）

## Impact

- **数据库**：新增 Discussion、DiscussionReply 表
- **API**：新增 discussions 模块（CRUD + 回复 + 点赞）
- **前端**：题目详情页新增 DiscussionTab 组件
- **依赖**：Markdown 渲染复用现有 react-markdown
