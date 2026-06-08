## 1. 后端 - 数据模型与迁移

- [x] 1.1 创建 Announcement Entity（apps/api/src/modules/announcements/announcement.entity.ts）
- [x] 1.2 创建数据库迁移文件（announcements 表）
- [x] 1.3 运行迁移验证表结构

## 2. 后端 - 管理端 API

- [x] 2.1 创建 AnnouncementsModule、AnnouncementsService
- [x] 2.2 实现管理端 AnnouncementsAdminController（CRUD 操作）
- [x] 2.3 添加 Admin Guard 权限控制
- [x] 2.4 实现分页查询与排序逻辑

## 3. 后端 - 用户端 API

- [x] 3.1 实现用户端 AnnouncementsController（GET /active）
- [x] 3.2 实现有效公告查询逻辑（时间过滤 + 置顶排序）

## 4. 前端 - 管理后台公告管理页面

- [x] 4.1 创建公告管理页面组件（apps/web/src/pages/admin/announcements/）
- [x] 4.2 实现公告列表表格（分页、筛选）
- [x] 4.3 实现新增/编辑公告弹窗表单
- [x] 4.4 实现删除公告确认对话框
- [x] 4.5 添加路由和导航菜单项

## 5. 前端 - 用户首页公告 Banner

- [x] 5.1 创建 AnnouncementBanner 组件
- [x] 5.2 实现公告列表获取与展示
- [x] 5.3 实现置顶公告优先排序显示
- [x] 5.4 实现单条公告关闭功能（localStorage 存储）
- [x] 5.5 实现 Banner 展开/收起功能
- [x] 5.6 将 Banner 组件集成到首页顶部

## 6. 测试

- [x] 6.1 编写管理端 API 单元测试
- [x] 6.2 编写用户端 API 单元测试
- [x] 6.3 编写前端组件单元测试
