# Tasks

## 数据库
- [ ] 创建 Class 模型（id, name, description, teacherId, invitationCode, createdAt）
- [ ] 创建 ClassMember 模型（id, classId, userId, joinedAt）
- [ ] 创建 Homework 模型（id, classId, title, description, deadline, createdAt）
- [ ] 创建 HomeworkProblem 模型（id, homeworkId, problemId, ordinal）
- [ ] 运行 Prisma 迁移

## API - 班级管理
- [ ] 创建 ClassesModule、ClassesController、ClassesService
- [ ] 实现 POST /classes（创建班级）
- [ ] 实现 POST /classes/join（通过邀请码加入）
- [ ] 实现 GET /classes/:id/members（成员列表）
- [ ] 实现 DELETE /classes/:id/members/:userId（移除成员）

## API - 作业系统
- [ ] 创建 HomeworkModule、HomeworkController、HomeworkService
- [ ] 实现 POST /homework（创建作业）
- [ ] 实现 GET /homework（查询作业列表）
- [ ] 实现 GET /homework/:id/stats（作业统计）

## 前端
- [ ] 创建 ClassManagementPage
- [ ] 创建 JoinClassPage（邀请码输入）
- [ ] 创建 HomeworkListPage
- [ ] 创建 HomeworkStatsPage（教师视图）
