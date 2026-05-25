## Why

OI/ACM 刷题社区长期依赖闭源或难自建的 OJ 平台，自建成本高、判题安全与扩展性难兼顾。纪元（EpochJudge）旨在提供一套可开源部署、功能对标主流 OJ、且判题可分布式扩展的现代在线评测系统，降低学校、社团与个人搭建训练环境的门槛。

## What Changes

- 新建完整 OJ 平台：品牌为「纪元」，英文全名 EpochJudge
- 技术栈：全栈 **TypeScript**；包管理 **Yarn 4+**；运行时 **Node.js 18+**；后端 NestJS，前端 React + Rspack；**严禁 Tailwind**；UI 采用 Ant Design；图标使用 **IconPark 官方图标库**
- 用户与权限：注册登录、个人主页、提交记录、评级/统计（按常见 OJ 架构）
- 题库：题目 CRUD、标签/难度、公开/隐藏、测试数据管理；**支持文件批量导入**并提供示例模板
- 评测：支持 **JavaScript、C/C++、Python、Java**；沙箱隔离与指令/语法防护；**可配置并发**；**默认单机判题部署**，架构保留分布式扩展（传入 in/out、代码，经 SSE 或 gRPC 回传结果）；**结果实时展示**
- 评测模式：**OI 模式**（按测试点评分/部分分）与 **ACM 模式**（通过与否）
- 比赛：创建/报名/榜单/封榜/题目集与权限隔离
- 国际化：**中英文切换**
- 主题：**浅色 / 深色 / 跟随系统**
- 数据层：**MySQL** 为主存储；必要时 **Redis**（会话、队列、缓存、限流）
- 测试数据：**默认本地目录存储**，可通过配置切换 **S3 兼容对象存储**
- 运维：账号 **批量导入**及导入模板；**一键部署脚本**（用户单次执行即可完成环境、构建、启动，无需手动打包）；判题节点可水平扩展（可选）

## Capabilities

### New Capabilities

- `platform-foundation`:  monorepo/工程结构、配置、日志、健康检查、部署约定
- `auth-users`: 用户注册登录、角色权限、个人资料、批量账号导入与模板
- `i18n-theme`: 中英文切换、浅色/深色/系统主题
- `problems`: 题目管理、测试数据、文件导入与导入模板
- `submissions`: 提交记录、代码存储、评测状态与实时结果展示
- `judge-engine`: 沙箱判题、多语言支持、指令防护、并发配置、分布式判题 API（SSE/gRPC）
- `contests`: 比赛创建、赛程、榜单、OI/ACM 模式在比赛中的行为
- `admin-ops`: 管理后台、系统配置、判题节点与并发配置

### Modified Capabilities

（无：本项目为从零新建，无既有 spec 需变更。）

## Impact

- 新建仓库结构与多包/多服务布局（API、Web、Judge Worker）
- 引入 MySQL、Redis；测试数据默认本地目录，可选 S3；`scripts/deploy` 一键部署（默认单机判题 Compose 拓扑）
- 判题依赖容器/沙箱运行时（如 isolate、nsjail 或等价方案，在设计阶段选定）
- 对外 API：REST + SSE；判题服务间 gRPC
- 无破坏性变更（绿field 项目）
