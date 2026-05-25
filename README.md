# 纪元 EpochJudge

面向 OI / ACM 的开源在线评测（OJ）平台。

## 技术栈

- **TypeScript** 全栈
- **Yarn 4+** monorepo · **Node.js 18+**
- 后端 **NestJS** · 前端 **React + Rspack**
- **Ant Design 5** · **IconPark**（`@icon-park/react`）
- **MySQL** + **Prisma** · **Redis** + **BullMQ**
- 测试数据默认 **本地目录**，可选 **S3**
- 默认 **单机 1× Judge Worker**（`JUDGE_MOCK=true` 可用于冒烟）

## 一键部署

只需执行一次（需已安装 Node 18+、Docker、Docker Compose）：

```bash
chmod +x scripts/deploy.sh
yarn deploy
```

脚本将自动：安装依赖 → 构建 → 启动 Compose（MySQL、Redis、API、Judge、Web）→ 迁移数据库 → 种子管理员。

| 服务 | 地址 |
|------|------|
| 站点 | http://localhost:8080 |
| API | http://localhost:3000/api/v1 |
| OpenAPI | http://localhost:3000/api/docs |

默认管理员见 `.env` 中 `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`。

## 本地开发

```bash
yarn install
cp .env.example .env
docker compose up -d mysql redis
yarn db:setup   # 手动迁移 + 种子数据（可选，首次建议执行）
```

**启动时自动迁移**：`yarn dev:api` / `yarn dev:judge` 默认会执行 `prisma migrate deploy`（`DB_AUTO_MIGRATE=true`）。关闭可设 `DB_AUTO_MIGRATE=false`。

种子数据（管理员账号）仍需手动执行一次：`yarn db:seed`。

**分别启动（推荐开三个终端）：**

```bash
yarn dev:api      # 后端 API → http://localhost:3000
yarn dev:web      # 前端页面 → http://localhost:8080
yarn dev:judge    # 判题 Worker（消费队列 + gRPC）
```

或一条命令并行启动三者：`yarn dev`

**生产模式（需先 `yarn build`）：**

```bash
yarn start:api
yarn start:judge
```

- Web：http://localhost:8080（开发时代理 `/api` → API）
- API：http://localhost:3000
- OpenAPI：http://localhost:3000/api/docs

## 目录结构

```
apps/api      # REST + SSE + Swagger
apps/web      # React 用户端 / 管理入口
apps/judge    # 判题 Worker（BullMQ 消费）
packages/db   # Prisma schema
packages/shared
packages/storage  # local / S3
```

## 配置说明

| 变量 | 说明 |
|------|------|
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL 连接项（自动拼成 Prisma 用的 `DATABASE_URL`） |
| `DATABASE_URL` | 可选，设置后覆盖上述拼接 |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis 连接项 |
| `REDIS_KEY_PREFIX` | 所有 Redis key 的前缀（默认 `epoch-judge`，如 `epoch-judge:judge:tasks`） |
| `REDIS_URL` | 可选，设置后覆盖 Redis 分项拼接 |
| `STORAGE_TYPE` | `local`（默认）或 `s3` |
| `STORAGE_LOCAL_ROOT` | 本地测试数据根目录 |
| `JUDGE_MOCK` | `true` 时模拟 AC；生产 Docker 默认 `false` 并安装 gcc/python/java |
| `ISOLATE_PATH` | Linux 上可选 isolate 二进制路径 |
| `JUDGE_WORKER_CONCURRENCY` | Worker 沙箱并发 |

进阶：扩展 Judge 副本、切换 S3，见 [docs/deploy.md](docs/deploy.md)。

## License

MIT — 见 [LICENSE](LICENSE)
