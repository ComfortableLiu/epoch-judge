## Why

EpochJudge 当前没有任何公告或通知机制，管理员无法向用户发布比赛通知、系统维护公告、版本更新等重要信息。用户只能通过外部渠道（如 QQ 群、邮件）获取通知，效率低且容易遗漏。需要实现站内公告系统，让管理员能在后台管理公告，用户在首页即可看到重要通知。

## What Changes

- 新增公告数据模型（Announcement Entity），支持标题、内容、置顶状态、起止时间、创建者等字段
- 新增管理端公告 CRUD API（创建、编辑、删除、列表、排序）
- 新增用户端公告查询 API（获取当前有效公告列表）
- 管理后台新增公告管理页面（表格列表 + 新增/编辑表单弹窗）
- 用户首页顶部新增公告 Banner 组件，支持关闭/展开、置顶公告优先显示

## Capabilities

### New Capabilities

- `site-announcements`: 站内公告系统，包括公告数据模型、管理端 CRUD API、用户端查询 API、管理后台 UI、首页 Banner 展示

### Modified Capabilities

- `platform-foundation`: 首页布局需要调整以容纳公告 Banner 区域

## Impact

- **后端**: 新增 Announcement 模块（Entity、Service、Controller），需要数据库迁移创建 announcements 表
- **前端**: 新增管理端公告管理页面，用户端首页新增 Banner 组件
- **API**: 新增 `/api/announcements` 相关路由（管理端 + 用户端）
- **依赖**: 无新增外部依赖，使用现有 TypeORM + Ant Design 技术栈
