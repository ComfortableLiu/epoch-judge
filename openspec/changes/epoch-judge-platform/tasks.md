## 1. 工程与基础设施

- [x] 1.1 初始化 Yarn 4 workspace monorepo（`apps/api`、`apps/web`、`apps/judge`、`packages/shared`、`packages/db`）
- [x] 1.2 配置根 `package.json` engines（Node ≥18）、`packageManager: yarn@4.x`、`.yarnrc.yml`
- [x] 1.3 配置 NestJS API 骨架、全局配置模块、健康检查（MySQL + Redis）
- [x] 1.4 配置 React + Rspack 前端骨架，确认无 Tailwind 依赖
- [x] 1.5 集成 Ant Design 5、**@icon-park/react** 封装、CSS Modules/SCSS 与主题 token
- [x] 1.6 配置 Prisma + MySQL 迁移与种子脚本
- [x] 1.7 配置 Redis 连接与 Docker Compose（默认单机：MySQL、Redis、API、1×Judge、Web）
- [x] 1.8 添加 OpenAPI 生成与 `/api/v1` 路由前缀

## 2. 一键部署

- [x] 2.1 编写 `scripts/deploy.sh`：环境检测（Node≥18、Docker、Compose）
- [x] 2.2 部署脚本：`.env` 生成（默认 `STORAGE_TYPE=local`、单机 judge、`STORAGE_LOCAL_ROOT`）
- [x] 2.3 部署脚本：`yarn install` + `yarn build` 全 workspace
- [x] 2.4 部署脚本：`docker compose up -d`、等待 MySQL、`yarn db:migrate`、健康检查与 URL 输出
- [x] 2.5 根目录 `yarn deploy` 指向部署脚本；README 仅文档化「执行一次 deploy」流程

## 3. 测试数据存储

- [x] 3.1 实现 `StorageProvider` 接口（local 驱动，默认根目录 `data/testcases`）
- [x] 3.2 实现 S3 兼容驱动（`STORAGE_TYPE=s3` 及 endpoint/bucket/凭证配置）
- [x] 3.3 题目 testcase 上传/读取/判题消费统一走 StorageProvider
- [x] 3.4 Compose 为 API 与 Judge 挂载同一本地 data 卷（单机默认）

## 4. 认证与用户

- [x] 4.1 实现 User 实体、注册、登录、JWT/refresh 流程
- [x] 4.2 实现 RBAC 守卫（user/admin）与管理员路由
- [x] 4.3 实现用户资料读取与更新 API
- [x] 4.4 实现用户 CSV 批量导入 API 与校验报告
- [x] 4.5 发布 `templates/user-import.csv` 及下载接口
- [x] 4.6 前端：登录/注册页、个人资料页（IconPark 图标）

## 5. 国际化与主题

- [x] 5.1 配置 react-i18next（zh-CN、en-US）与语言切换持久化
- [x] 5.2 实现 antd ConfigProvider 亮/暗/跟随系统主题切换
- [x] 5.3 API 错误消息 locale 头支持（与前端语言联动）
- [x] 5.4 前端：设置页（语言 + 主题）

## 6. 题库

- [x] 6.1 实现 Problem、Testcase 数据模型与 CRUD API
- [x] 6.2 实现题目列表/详情 API（可见性控制，隐藏测试数据内容）
- [x] 6.3 实现题目 ZIP 导入解析与校验
- [x] 6.4 发布 `templates/problem-import.zip` 与格式文档、下载接口
- [x] 6.5 前端：题目列表、题目详情（Markdown 渲染）、管理端题目编辑
- [x] 6.6 前端：Monaco 提交页语言模板（JS/C/C++/Python/Java）

## 7. 判题引擎

- [x] 7.1 定义 JudgeTask 队列消息格式与 Redis/BullMQ 入队消费
- [x] 7.2 搭建 Judge Worker 服务骨架与 gRPC proto（Submit、WatchStatus）
- [x] 7.3 集成 isolate（或选定沙箱）与资源限制配置 — `packages/judge-sandbox` + isolate 探测
- [x] 7.4 实现 C/C++ 编译运行流水线
- [x] 7.5 实现 Java 编译运行流水线
- [x] 7.6 实现 Python 3 运行流水线（标准库策略）
- [x] 7.7 实现 JavaScript（Node）运行流水线与危险 API 拦截
- [x] 7.8 实现源码危险模式预检与拒绝策略
- [x] 7.9 实现 OI 计分与 ACM 整体判定逻辑
- [x] 7.10 实现 Worker 并发环境变量与全局 inflight 限流
- [x] 7.11 实现 Worker 心跳写入与 admin 查询 API（为多机扩展预留）

## 8. 提交与实时结果

- [x] 8.1 实现 Submission 创建 API（语言、模式、代码存储）
- [x] 8.2 实现提交历史列表与详情 API（含逐 testcase 结果）
- [x] 8.3 实现判题状态机与结果持久化
- [x] 8.4 实现 SSE `/api/v1/submissions/:id/stream` 与 Redis pub/sub 桥接
- [x] 8.5 前端：提交页、提交详情、SSE 实时进度 UI
- [x] 8.6 前端：提交记录列表与状态筛选

## 9. 比赛

- [x] 9.1 实现 Contest、ContestProblem、Registration 模型与 CRUD
- [x] 9.2 实现比赛时间窗口校验与比赛提交关联
- [x] 9.3 实现 ACM 罚时榜单与 OI 总分榜单
- [x] 9.4 实现封榜与管理员全量榜视图
- [x] 9.5 前端：比赛列表、比赛主页、榜单页、比赛题目集

## 10. 管理后台

- [x] 10.1 前端：Admin 布局与路由守卫
- [x] 10.2 管理端：用户管理、题目管理、比赛管理页面
- [x] 10.3 管理端：判题节点状态、并发配置编辑
- [x] 10.4 管理端：批量用户导入、题目导入 UI

## 11. 品牌与文档

- [x] 11.1 应用品牌「纪元 / EpochJudge」：Logo、站点标题、README
- [x] 11.2 编写部署文档（以一键 deploy 为主，多 Worker/S3 为进阶）
- [x] 11.3 编写开发者文档（API、判题协议、导入格式、存储配置）
- [x] 11.4 添加 LICENSE 与贡献指南

## 12. 质量与验收

- [x] 12.1 端到端冒烟：一键 deploy → 注册 → 做题 → 提交 → SSE 结果 — `scripts/smoke-test.sh`
- [x] 12.2 安全测试：命令注入样例、资源超限样例、沙箱逃逸基线检查清单 — `docs/security-tests.md`
- [x] 12.3 存储测试：local 默认读写；配置 S3 后新上传走对象存储 — `yarn workspace @epoch-judge/storage test`
