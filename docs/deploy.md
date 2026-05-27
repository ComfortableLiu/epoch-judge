# 部署指南

## 一键部署（推荐）

```bash
chmod +x scripts/deploy.sh scripts/deploy-remote-judge.sh
yarn deploy
```

脚本为**全中文交互**，会在本机部署 **MySQL、Redis、API、Web**（API 与前端同机）。随后询问：

| 你的选择 | 本机启动内容 | 判题 |
|----------|--------------|------|
| **否**（默认推荐远程） | MySQL + Redis + API + Web | 不启动；结束时打印远程判题指引 |
| **是**（单机全栈） | 上述 + Judge Worker | 判题与本机同机 |

非交互示例：

```bash
# 仅控制面（远程判题）
yarn deploy -- --仅控制面
# 或: EPOCH_DEPLOY_JUDGE=0 yarn deploy

# 含本机判题
yarn deploy -- --含本机判题
# 或: EPOCH_DEPLOY_JUDGE=1 yarn deploy
```

## 远程判题机一键部署

中心机执行 `yarn deploy` 并选择「远程判题」后，在**每台 Linux 判题机**上：

```bash
git clone <仓库> && cd epoch-judge
chmod +x scripts/deploy-remote-judge.sh
yarn deploy:judge
```

按提示填写中心机 IP、Redis/MySQL 密码、节点名称；多机请使用 **S3** 存储（与中心 `.env` 一致）。

非交互示例：

```bash
CENTER_HOST=10.0.0.10 \
JUDGE_NODE_NAME=judge-01 \
REDIS_PASSWORD=你的密码 \
DB_PASSWORD=你的密码 \
yarn deploy:judge
```

生成配置默认保存在 `.env.remote-judge`，容器名默认 `epoch-judge-worker`。

## 手动步骤

1. `cp .env.example .env` 并按需修改
2. `yarn install && yarn build`
3. `docker compose up -d --build`
4. `yarn db:migrate && yarn db:seed`

## 单机判题（默认）

`docker-compose.yml` 中 `judge` 服务默认 `replicas: 1`，与 API 共享 `./data/testcases` 卷。适合个人试用或小规模校内环境。

---

## 分布式判题

EpochJudge **支持多台判题机**并行工作。所有 Worker 从**同一 Redis 队列**（BullMQ，`judge-tasks` + `REDIS_KEY_PREFIX`）拉取任务，自动负载均衡，无需在 API 上配置「某台机器 IP」。

### 架构

```text
                    ┌─────────────┐
                    │  Web + API  │  入队判题任务、写 MySQL、SSE 推送
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐   ┌────────┐   ┌────────┐
         │ MySQL  │   │ Redis  │   │ 存储   │  测试数据 / 题目资源
         └────────┘   └───┬────┘   └────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
    Judge Worker A     Judge Worker B     Judge Worker C
    (本机 / 远程)       (远程机房)          (远程机房)
```

| 组件 | 角色 |
|------|------|
| **API** | 接收提交、校验、入队、全局限流（`JUDGE_GLOBAL_MAX_INFLIGHT`） |
| **Redis** | BullMQ 队列 + 判题事件 pub/sub（前端 SSE） |
| **MySQL** | 提交状态、测例结果、`judge_nodes` 心跳 |
| **存储** | 测例 `.in` / `.out`、题面图片；多机必须用**共享**方案（见下文） |
| **Judge Worker** | 消费队列、沙箱评测、回写结果 |

每台 Worker 启动后会定期写入 `judge_nodes`（节点 ID 默认取 `HOSTNAME`）。管理员可在后台 **判题节点** 列表查看在线状态与并发配置。

### 部署模式对比

| 模式 | 适用场景 | 测试数据存储 |
|------|----------|--------------|
| 单机 1× Judge | 默认、`yarn deploy` | 本地卷 `./data/testcases` |
| 同机多副本 | 一台机器 CPU 够、加并发 | 同上，Compose 共享卷 |
| **多机远程 Judge** | 跨机房 / 弹性扩容 | **必须** `STORAGE_TYPE=s3`（或 NFS 等共享盘） |

> 多台远程判题机若各自使用独立的 `STORAGE_LOCAL_ROOT`，会读不到测例文件，导致判题失败。

---

### 方式一：同一台机器扩容（Docker Compose）

不增加机器，只增加本机 Judge 容器数：

```bash
docker compose up -d --scale judge=3
```

注意：

- 各副本共享 `docker-compose.yml` 中的 `./data/testcases` 挂载，无需 S3。
- 总并发约等于 `副本数 × JUDGE_WORKER_CONCURRENCY`（还受 `JUDGE_GLOBAL_MAX_INFLIGHT` 限制）。
- 建议 Linux 宿主机，镜像内已包含 gcc / g++ / Python / OpenJDK。

---

### 方式二：多台远程判题机

#### 1. 中心节点（控制面）

至少运行：

- MySQL
- Redis
- API（+ Web 可选）

可使用仓库自带 Compose，或自建 K8s / 云主机。确保 **Redis、MySQL 对远程判题机可达**（内网/VPN/安全组放行）。

中心 `.env` 关键项示例：

```env
# 与所有 Judge 必须一致
REDIS_KEY_PREFIX=epoch-judge

# 全站同时判题中的提交上限（API 侧）
JUDGE_GLOBAL_MAX_INFLIGHT=20

# 多机时中心也应使用 S3，保证新上传测例对所有 Worker 可见
STORAGE_TYPE=s3
S3_ENDPOINT=https://...
S3_BUCKET=epoch-judge
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PREFIX=testcases
```

中心机可以 **不跑** Judge，也可以 **同时跑** Judge 与远程机一起消费队列。

#### 2. 远程判题节点

在每台远程 Linux 机器上部署 **仅 Judge Worker**（不必部署 Web/API）。

**方式 A：Docker（推荐）**

```bash
# 在仓库根目录，使用与中心相同的 .env（或单独 env 文件指向中心 Redis/MySQL/S3）
docker build -f docker/Dockerfile.judge -t epoch-judge-judge .
docker run -d --name epoch-judge-worker-1 \
  --env-file .env \
  -e HOSTNAME=judge-sg-01 \
  -e JUDGE_WORKER_CONCURRENCY=4 \
  -e JUDGE_MOCK=false \
  epoch-judge-judge
```

**方式 B：源码运行**

```bash
yarn install && yarn build
# .env 中 REDIS_HOST / DB_HOST 指向中心机
HOSTNAME=judge-sg-01 yarn start:judge
```

每台机器设置 **不同的 `HOSTNAME`**（或容器 hostname），便于在管理后台区分节点。

#### 3. 远程节点环境变量清单

以下变量必须与中心 **逻辑上一致**（连接同一 Redis 前缀、同一数据库、同一对象存储）：

| 变量 | 说明 |
|------|------|
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | 中心 Redis 地址 |
| `REDIS_KEY_PREFIX` | 与 API 相同，否则进错队列 |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | 中心 MySQL（Worker 会更新提交状态） |
| `STORAGE_TYPE` | 多机请用 `s3` |
| `S3_*` | 与中心相同 bucket/前缀 |
| `JUDGE_WORKER_CONCURRENCY` | 本机沙箱并行数，按 CPU/内存调整 |
| `JUDGE_MOCK` | 生产为 `false` |
| `HOSTNAME` | 节点展示名，每台唯一 |
| `DB_AUTO_MIGRATE` | 远程 Worker 可设 `false`（仅中心跑迁移） |

无需对公网暴露 `JUDGE_GRPC_PORT`，除非你有自定义 gRPC 集成；默认提交流程只依赖 Redis 队列。

远程 `.env` 示例（中心 IP `10.0.0.10`）：

```env
REDIS_HOST=10.0.0.10
REDIS_PORT=6379
REDIS_PASSWORD=epoch_redis_secret
REDIS_KEY_PREFIX=epoch-judge

DB_HOST=10.0.0.10
DB_PORT=3306
DB_USER=epoch
DB_PASSWORD=epoch_secret
DB_NAME=epoch_judge
DB_AUTO_MIGRATE=false

STORAGE_TYPE=s3
S3_ENDPOINT=https://s3.example.com
S3_BUCKET=epoch-judge
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PREFIX=testcases
S3_REGION=us-east-1

JUDGE_MOCK=false
JUDGE_WORKER_CONCURRENCY=4
HOSTNAME=judge-node-02
```

#### 4. 验证

1. 启动远程 Worker 后，管理员登录 → **管理后台** → 查看判题节点是否 **在线**、`lastHeartbeat` 是否刷新。
2. 提交一道带测例的题目，在提交详情页观察状态是否由 `QUEUED` → `JUDGING` → 终态。
3. 若长期 `QUEUED`，检查 Redis 连通性与 `REDIS_KEY_PREFIX` 是否一致。

---

### 并发与限流

| 变量 | 位置 | 含义 |
|------|------|------|
| `JUDGE_WORKER_CONCURRENCY` | 每台 Judge | 单进程内同时运行的沙箱数 |
| `JUDGE_GLOBAL_MAX_INFLIGHT` | API（中心 `.env`） | 全站「判题中」提交上限，超出返回队列满 |

粗略容量：同时判题数 ≤ `min(JUDGE_GLOBAL_MAX_INFLIGHT, Σ(各 Worker 副本数 × JUDGE_WORKER_CONCURRENCY))`（实际还受单机性能影响）。

种子数据中的 `judge.global_max_inflight`（`yarn db:seed`）为库内配置项；当前以环境变量 `JUDGE_GLOBAL_MAX_INFLIGHT` 为准，可按需与代码演进对齐。

---

### 存储：本地与 S3

**单机 / Compose 多副本**

```env
STORAGE_TYPE=local
STORAGE_LOCAL_ROOT=./data/testcases
```

**多机分布式（必选共享存储）**

```env
STORAGE_TYPE=s3
S3_ENDPOINT=https://...
S3_BUCKET=epoch-judge
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

修改存储类型后，重启 **API 与所有 Judge**。新上传的测例与题目资源走新存储；已有本地文件需自行迁移到 bucket。

若使用 NFS / Ceph 等共享文件系统，可继续 `STORAGE_TYPE=local`，但需保证所有 API/Judge 挂载**同一路径**。

---

### 安全与网络

- Redis、MySQL 建议仅内网访问，不要对公网无密码暴露。
- 远程判题机需要 **出站** 访问中心 Redis、MySQL、S3；一般 **不需要** 对入站开放判题端口。
- 生产环境修改默认 `JWT_SECRET`、数据库与 Redis 密码。
- 判题沙箱依赖 Linux 环境；`JUDGE_MOCK=true` 仅用于开发联调。

---

### 能力说明与限制

**已支持**

- 任意多台 Worker 水平扩展，任务自动抢队列。
- 同机 Docker `scale` 与跨机房远程节点混合部署。
- 管理端查看 `judge_nodes` 心跳。

**当前不支持**

- 按地区 / 标签将某题固定路由到指定 Worker（无亲和调度）。
- 通过 API 指定「只由某 IP 判题」；调度完全由 BullMQ 消费竞争完成。
- 远程 Worker 使用互不相通的本地磁盘存测例（需 S3 或共享盘）。

**gRPC（`JUDGE_GRPC_PORT`，默认 50051）**

Worker 暴露 gRPC 主要用于状态查询类集成；日常用户提交 → API 入队 → Worker 消费 Redis，**不依赖**向远程机直连 gRPC。

---

### 常见问题

| 现象 | 可能原因 |
|------|----------|
| 提交一直 `QUEUED` | 无在线 Worker；Redis 连不上；`REDIS_KEY_PREFIX` 不一致 |
| `SYSTEM_ERROR` / 读文件失败 | 远程机未配 S3，或 bucket 与中心不一致 |
| 判题很慢 | `JUDGE_GLOBAL_MAX_INFLIGHT` 过小；Worker 太少；`JUDGE_WORKER_CONCURRENCY` 过低 |
| 后台看不到某节点 | `HOSTNAME` 冲突；Worker 未连上 MySQL；进程未启动 |
| 队列满 | 提高 `JUDGE_GLOBAL_MAX_INFLIGHT` 或增加 Worker |

---

## S3 测试数据（摘要）

```env
STORAGE_TYPE=s3
S3_ENDPOINT=https://...
S3_BUCKET=epoch-judge
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

重启 `api` 与所有 `judge` 服务后，新上传的测试数据与题目资源写入对象存储。分布式部署下此为**推荐默认**配置。
