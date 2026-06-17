## Context

EpochJudge 当前没有任何用户交流功能。用户在解题过程中遇到困难时无法寻求帮助，也无法分享自己的解题思路。需要新增讨论/题解系统，让用户可以在题目详情页进行交流。

## Goals / Non-Goals

**Goals:**
- 在题目详情页新增讨论区 Tab
- 支持发帖（提问/题解）、回复、点赞
- 支持 Markdown 渲染（含代码块语法高亮）
- 管理员可置顶/删除不当内容

**Non-Goals:**
- 不做实时聊天（异步讨论即可）
- 不做用户私信
- 不做内容审核系统（后续可扩展）

## Decisions

### 1. 数据模型设计
- **选择**：Post + Reply 两层结构
- **理由**：简单直接，Post 为一级内容，Reply 为回复，不嵌套
- **替代方案**：树形评论（嵌套回复）——复杂度高，OJ 场景不需要

### 2. Markdown 渲染
- **选择**：复用现有 react-markdown + rehype-highlight
- **理由**：项目已有依赖，代码块高亮开箱即用

### 3. 点赞存储
- **选择**：DiscussionVote 表记录用户-帖子点赞关系
- **理由**：支持取消点赞，避免重复点赞

## Risks / Trade-offs

- [内容质量] 用户可能发布低质量内容 → 初期依赖管理员手动管理，后续可加举报机制
- [性能] 大量讨论时列表加载慢 → 分页加载，默认每页 20 条

## Migration Plan

1. 创建 Discussion、DiscussionReply、DiscussionVote 表
2. 前端新增 DiscussionTab 组件
3. API 新增 discussions 模块

## Open Questions

- 是否需要支持 Markdown 图片上传？
- 是否需要支持代码运行结果分享？
