## Why

EpochJudge 面向高校和培训机构的核心场景是"布置作业 + 跟踪进度"，但当前没有班级管理和作业系统，教师无法组织教学活动。这是从"工具"升级为"教学平台"的关键一步。

## What Changes

- 新增 Class（班级）模型：名称、教师、学生列表、邀请码
- 新增 Homework（作业）模型：关联班级+题目集、截止时间、分数策略
- 学生通过邀请码加入班级，教师查看作业完成情况和成绩统计
- 作业列表页：按班级筛选、显示完成进度和得分
- 教师仪表盘：班级平均分、题目通过率、未提交学生列表

## Capabilities

### New Capabilities

- `class-management`: 班级管理（创建、邀请码、成员管理）
- `homework-system`: 作业系统（布置、提交、成绩统计）

### Modified Capabilities

（无）

## Impact

- **数据库**：新增 Class、ClassMember、Homework、HomeworkProblem 表
- **API**：新增 classes、homework 模块
- **前端**：新增班级管理页、作业列表页、教师仪表盘
- **权限**：新增 TEACHER 角色或复用 PROBLEM_EDITOR
