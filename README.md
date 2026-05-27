# 纪元 EpochJudge

[English](#english) | 中文

**纪元（EpochJudge）** 是一套可自托管的开源在线评测系统（Online Judge），适用于信息学竞赛（OI）、ACM 练习、校内机考与训练营等场景。你可以在一台服务器上快速搭起完整的「题库 + 提交 + 判题 + 比赛」环境，数据与评测逻辑完全由自己掌控。

## 功能概览

- **题库**：题目浏览、Markdown 题面（支持内嵌图片）、限时/限内存、公开/隐藏可见性
- **提交**：多语言代码提交、提交记录列表（状态自动刷新）、单条提交详情与评测进度
- **评测**：OI / ACM 模式；队列调度；支持 JavaScript、Python、Java、C、C++
- **比赛**：比赛列表、题单、积分榜（OI / ACM）
- **管理**：题目 ZIP 导入、用户 CSV 导入、判题节点状态查看（需管理员/题目编辑权限）
- **体验**：中英文界面、浅色/深色主题、REST API 与 OpenAPI 文档

## 环境要求

- **Node.js** 18+
- **Yarn** 4+（仓库使用 Corepack，见 `packageManager` 字段）
- **Docker** 与 **Docker Compose**（推荐用于一键部署 MySQL / Redis / 全栈服务）
- 生产判题（非 Mock）建议在 **Linux** 上运行 Judge Worker，并安装对应语言编译/运行环境

## 快速开始（Docker）

适合第一次体验或生产试跑：

```bash
git clone <你的仓库地址>
cd epoch-judge
chmod +x scripts/deploy.sh scripts/deploy-remote-judge.sh
yarn deploy
```

脚本为中文向导：在本机部署 **MySQL、Redis、API、Web**（网站与 API 同机），并询问是否在**远程机器**单独部署判题机。

- 选 **否**：仅控制面，结束时提示如何执行 `yarn deploy:judge` 连接远程判题机  
- 选 **是**：同时在本机启动判题 Worker（单机全栈）

远程判题机（在另一台 Linux 上，中心机已部署完成后）：

```bash
yarn deploy:judge
```

| 服务 | 地址 |
|------|------|
| 网站 | http://localhost:8080 |
| API | http://localhost:3000/api/v1 |
| API 文档 | http://localhost:3000/api/docs |

首次部署后，使用 `.env` 中配置的管理员账号登录（默认见下方「默认账号」）。站点内可注册普通用户、浏览示例题目 `a-plus-b` 并提交代码。

## 默认账号

部署脚本执行 `yarn db:seed` 后会创建管理员（可在 `.env` 中修改后再部署）：

| 项目 | 默认值 |
|------|--------|
| 用户名 | `admin` |
| 密码 | `admin123` |
| 邮箱 | `admin@epoch.local` |

**请在生产环境中立即修改密码与 `JWT_SECRET` 等敏感配置。**

## 本地开发

适合二次开发或调试前后端：

```bash
yarn install
cp .env.example .env
docker compose up -d mysql redis
yarn db:setup    # 迁移 + 种子数据（首次建议执行）
```

分别启动（三个终端）：

```bash
yarn dev:api     # API  → http://localhost:3000
yarn dev:web     # 前端 → http://localhost:8080（/api 代理到 API）
yarn dev:judge   # 判题 Worker
```

或一条命令并行启动：`yarn dev`

开发时若不想在每次启动 API/Judge 时自动跑迁移，可在 `.env` 设置 `DB_AUTO_MIGRATE=false`，并手动执行 `yarn db:migrate`。

### 判题 Mock 模式

未配置完整沙箱时，可在 `.env` 中设置：

```env
JUDGE_MOCK=true
```

Worker 将模拟通过评测，便于联调前后端与提交流程。生产环境请关闭 Mock，并参考 [docs/deploy.md](docs/deploy.md) 配置真实判题环境。

## 题目导入

管理员可在后台通过 **ZIP** 导入题目，包结构示例：

```text
problem.yaml
statement.md
assets/              # 可选，题面图片
  diagram.png
testdata/
  1.in
  1.out
```

`statement.md` 中可用 Markdown 引用图片，例如 `![](assets/diagram.png)`。模板与字段说明见仓库 `templates/` 目录及 [docs/developer.md](docs/developer.md)。

## 常用命令

| 命令 | 说明 |
|------|------|
| `yarn deploy` | 一键部署（中文向导，可选本机/远程判题） |
| `yarn deploy:judge` | 远程判题机一键部署（仅 Worker） |
| `yarn dev` | 本地并行启动 API / Web / Judge |
| `yarn build` | 构建全部 workspace |
| `yarn db:migrate` | 执行数据库迁移 |
| `yarn db:seed` | 写入种子数据（管理员、示例题） |
| `yarn db:setup` | 迁移 + 种子 |
| `yarn lint` | TypeScript 检查 |

## 配置说明

复制 `.env.example` 为 `.env` 后按需修改。常用项：

| 变量 | 说明 |
|------|------|
| `DB_*` | MySQL 连接；未设置 `DATABASE_URL` 时由分项自动拼接 |
| `REDIS_*` / `REDIS_KEY_PREFIX` | Redis 与 key 前缀（BullMQ 队列等） |
| `JWT_SECRET` | 登录令牌密钥，**生产必改** |
| `STORAGE_TYPE` | `local`（默认）或 `s3` 存放测试数据/题目资源 |
| `STORAGE_LOCAL_ROOT` | 本地存储根目录 |
| `JUDGE_MOCK` | 是否模拟判题 |
| `JUDGE_WORKER_CONCURRENCY` | 单台 Worker 沙箱并发数 |
| `JUDGE_GLOBAL_MAX_INFLIGHT` | 全站同时判题上限（API） |
| `SEED_ADMIN_*` | 种子管理员账号 |

部署与运维文档见 [docs/deploy.md](docs/deploy.md)（含**同机扩容**与**多机远程判题机**配置）。API 约定与判题流程见 [docs/developer.md](docs/developer.md)。

## 仓库结构

```text
apps/api        # REST API、Swagger、鉴权、提交与比赛逻辑
apps/web        # React 前端（题库、提交、比赛、管理后台）
apps/judge      # 判题 Worker（BullMQ + gRPC）
packages/db     # Prisma 模型与迁移
packages/shared # 共享类型与工具
packages/storage # 测试数据 / 题目资源（本地或 S3）
packages/redis  # Redis key 约定
docs/           # 部署与开发文档
templates/      # 题目/用户导入模板
```

## 技术栈

TypeScript · Yarn workspaces · NestJS · React + Rspack · Ant Design · Prisma (MySQL) · Redis · BullMQ

## 参与贡献

欢迎通过 Issue 与 Pull Request 参与：缺陷反馈、文档改进、新语言支持、判题沙箱增强等。提交 PR 前请确保 `yarn lint` 与相关构建通过。

## 许可证

本项目采用 [MIT License](LICENSE) 发布。

---

## English

**EpochJudge** is a self-hostable, open-source online judge for OI/ACM practice, school labs, and training camps. Run your own problems, submissions, judging, and contests on infrastructure you control.

### Quick start

Requirements: Node.js 18+, Yarn 4+, Docker & Docker Compose.

```bash
git clone <your-repo-url>
cd epoch-judge
chmod +x scripts/deploy.sh
yarn deploy
```

| Service | URL |
|---------|-----|
| Web | http://localhost:8080 |
| API | http://localhost:3000/api/v1 |
| OpenAPI | http://localhost:3000/api/docs |

Default admin (change in production): username `admin`, password `admin123` — see `.env` (`SEED_ADMIN_*`).

### Local development

```bash
yarn install && cp .env.example .env
docker compose up -d mysql redis && yarn db:setup
yarn dev    # or: yarn dev:api / yarn dev:web / yarn dev:judge
```

Set `JUDGE_MOCK=true` in `.env` to simulate accepted verdicts without a full sandbox.

### Documentation

- [docs/deploy.md](docs/deploy.md) — deployment, multi-worker & remote judges  
- [docs/developer.md](docs/developer.md) — API & problem package format  

Licensed under [MIT](LICENSE).
