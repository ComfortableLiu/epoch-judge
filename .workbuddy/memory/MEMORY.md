# EpochJudge 项目备忘

## 项目概述
- 在线评测系统（Online Judge），类似 LeetCode/Codeforces
- 技术栈：NestJS (API) + React + Rspack (Web) + Prisma (ORM) + MySQL + Redis
- 单体仓库（monorepo），使用 Yarn 4 workspaces

## 关键端口
- 前端：`localhost:8080`（rspack serve）
- 后端 API：`localhost:3000`
- 数据库：远程 MySQL (123.56.201.124:6100)
- Redis：远程 (123.56.201.124:6110)

## 用户角色
- `USER`：普通用户，可查看题目、提交代码
- `PROBLEM_EDITOR`：题目编辑员，可管理题目（CRUD、导入导出、测试用例）
- `ADMIN`：管理员，全权限（用户管理、题目管理、比赛管理、系统配置）

## 测试用户（冒烟测试用）
- admin / admin123（ADMIN）
- smoke_editor / Smoke@123456（PROBLEM_EDITOR）
- smoke_user / Smoke@123456（USER）

## 开发命令
- `yarn dev:api`：启动 API 开发服务器
- `yarn dev:web`：启动 Web 开发服务器
- `yarn db:seed`：运行数据库种子（创建 admin 用户 + 示例题目）
- `yarn db:migrate`：运行数据库迁移

## 飞书文档规范
- 文档存放路径：飞书云空间 → 开源项目 → epoch-judge（token: CFPif6uCClToaqdok0dcv9A3ncf）
- 命名规范：按"工作流类型-主题-日期"命名，如 system-analysis-roadmap-2026-06-05

## 回归测试规范
- **回归测试文档**：https://my.feishu.cn/docx/XXmrd1bCLoC0YGxneoXcecK2nWc
- **强制要求**：每次迭代发布前必须执行全面回归测试，按照上述飞书文档中的测试用例逐项验证
- **文档更新**：每次迭代完成后，必须更新飞书回归测试文档，补充新增功能的测试用例
- **测试脚本**：`/tmp/regression-test-final.sh` 可用于自动化 API 测试
- **测试覆盖**：认证系统、用户管理、题目管理、代码提交、比赛系统、管理后台、安全特性（限流/CORS/凭证检查/安全扫描/SSE连接限制）
