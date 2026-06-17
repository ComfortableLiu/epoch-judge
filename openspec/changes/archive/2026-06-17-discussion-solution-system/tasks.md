# Tasks

## 数据库
- [x] 创建 Discussion 模型（id, problemId, userId, type, title, content, isPinned, createdAt, updatedAt）
- [x] 创建 DiscussionReply 模型（id, discussionId, userId, content, createdAt, updatedAt）
- [x] 创建 DiscussionVote 模型（id, userId, discussionId, replyId, createdAt）
- [x] 运行 Prisma 迁移

## API
- [x] 创建 DiscussionsModule、DiscussionsController、DiscussionsService
- [x] 实现 POST /discussions（创建帖子）
- [x] 实现 GET /discussions（按题目分页查询）
- [x] 实现 POST /discussions/:id/replies（创建回复）
- [x] 实现 POST /discussions/:id/vote（点赞/取消）
- [x] 实现 PATCH /discussions/:id/pin（置顶，管理员）
- [x] 实现 DELETE /discussions/:id（删除，管理员）

## 前端
- [x] 创建 DiscussionTab 组件
- [x] 创建 PostForm 组件（Markdown 编辑器）
- [x] 创建 PostList 组件（带排序和分页）
- [x] 创建 ReplyList 组件
- [x] 题目详情页集成 DiscussionTab
