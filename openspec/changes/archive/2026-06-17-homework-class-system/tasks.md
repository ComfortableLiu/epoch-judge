# Tasks

## 数据库
- [x] 创建 Class 模型（id, name, description, teacherId, invitationCode, createdAt）
- [x] 创建 ClassMember 模型（id, classId, userId, joinedAt）
- [x] 创建 Homework 模型（id, classId, title, description, deadline, createdAt）
- [x] 创建 HomeworkProblem 模型（id, homeworkId, problemId, ordinal）
- [x] 运行 Prisma 迁移

## API - 班级管理
- [x] 创建 ClassesModule、ClassesController、ClassesService
- [x] 实现 POST /classes（创建班级）
- [x] 实现 POST /classes/join（通过邀请码加入）
- [x] 实现 GET /classes/:id/members（成员列表）
- [x] 实现 DELETE /classes/:id/members/:userId（移除成员）

## API - 作业系统
- [x] 创建 HomeworkModule、HomeworkController、HomeworkService
- [x] 实现 POST /homework（创建作业）
- [x] 实现 GET /homework（查询作业列表）
- [x] 实现 GET /homework/:id/stats（作业统计）

## 前端
- [x] 创建 ClassManagementPage
- [x] 创建 JoinClassPage（邀请码输入）
- [x] 创建 HomeworkListPage
- [x] 创建 HomeworkStatsPage（教师视图）
