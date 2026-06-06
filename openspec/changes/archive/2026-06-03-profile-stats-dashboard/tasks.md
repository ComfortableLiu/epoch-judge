## 1. API — 统计聚合

- [x] 1.1 定义 `UserStatsSummaryDto`、solved-problems 分页 DTO 与 Swagger 注解
- [x] 1.2 实现 `UsersService.getMyStats()`：总提交、终态分布、通过率、比赛参与列表
- [x] 1.3 实现 `UsersService.listMySolvedProblems(page, pageSize)`：按题去重、首次 AC 时间排序
- [x] 1.4 新增 `GET /users/me/stats` 与 `GET /users/me/stats/solved-problems`（JwtAuthGuard）

## 2. Web — 数据面板

- [x] 2.1 `ProfilePage` 增加 Tabs：资料 / 数据面板（或等价分区）
- [x] 2.2 新建 `ProfileStatsPanel`：`Statistic` 概览、终态分布、比赛表、已通过题目表（分页）
- [x] 2.3 表格行跳转题目详情、比赛详情；i18n `profile.stats.*`（zh-CN / en-US）

## 3. 文档与验证

- [x] 3.1 `docs/developer.md` 补充 stats API 字段说明
- [x] 3.2 冒烟：登录 → 个人资料 → 数据面板有数据；`yarn build` 通过
