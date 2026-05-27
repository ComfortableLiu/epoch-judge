## 1. 数据库与模型

- [x] 1.1 Prisma：`Problem.createdById`（可空 FK → User）、新建默认 `PRIVATE`
- [x] 1.2 Prisma：`Contest.number` 自增唯一、`accessPassword` 可空；删除 `slug` 迁移
- [x] 1.3 Prisma：`ContestRegistration` 或等价字段记录密码已验证
- [x] 1.4 运行 `prisma migrate` 并更新种子/测试数据

## 2. 题目访问防护（API）

- [x] 2.1 实现 `ProblemAccessService`（staff、创建者、比赛上下文、未结束比赛锁、visibility）
- [x] 2.2 `ProblemsService.list` / `getBySlug` / `getSubmitContext` 接入鉴权
- [x] 2.3 `ContestsService` 嵌入题目列表时传入 `contestId` 上下文
- [x] 2.4 创建/导入题目：默认 `PRIVATE` + 写入 `createdById`
- [x] 2.5 补充鉴权相关单元或 e2e 冒烟用例（可选最小）

## 3. 比赛 API（数字 ID + 密码）

- [x] 3.1 路由与控制器：`/contests/:number` 解析 number → 内部 contest
- [x] 3.2 管理端 `admin/contests` DTO 移除 slug；返回 `number`
- [x] 3.3 `POST /contests/:number/verify-password` 与准入检查（管理员跳过）
- [x] 3.4 提交/榜单/报名流程校验密码已验证
- [x] 3.5 更新 Swagger / `docs/developer.md` BREAKING 说明

## 4. 管理端比赛表单（Web）

- [x] 4.1 移除 Slug 字段；列表展示 `number`；链接改为 `/contests/:number`
- [x] 4.2 开始时间 DatePicker 分钟精度（秒归零）
- [x] 4.3 结束时间：相对时长 ↔ 绝对时间双向绑定，默认 +3 小时
- [x] 4.4 封榜：距结束的分钟/小时 offset
- [x] 4.5 比赛题目：可拖拽排序列表 + 增删
- [x] 4.6 可选密码表单项（明文提示）

## 5. 前台比赛体验（Web）

- [x] 5.1 `ContestDetailPage` / 列表 / 提交链路由 slug 改为 number
- [x] 5.2 密码保护比赛：未验证时展示密码 Modal，验证后刷新数据
- [x] 5.3 比赛内题目链接携带 contest 上下文；题库链接遵守访问规则

## 6. 收尾

- [x] 6.1 全局搜索 `contests/` slug 引用并修复
- [x] 6.2 `yarn workspace @epoch-judge/api build` 与 web build 通过
- [x] 6.3 冒烟：私有新题、比赛内可见、赛中题库不可见、密码赛、时间表单、拖拽排序
