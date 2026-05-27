# shellcheck shell=bash
# 纪元 EpochJudge 部署脚本公共函数（由 deploy.sh / deploy-remote-judge.sh source）

deploy_root() {
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[1]}")/../.." && pwd)"
  printf '%s' "$dir"
}

deploy_info() { echo "[纪元部署] $*"; }
deploy_warn() { echo "[纪元部署] 警告: $*" >&2; }
deploy_fail() { echo "[纪元部署] 错误: $*" >&2; exit 1; }

deploy_check_node() {
  if ! command -v node >/dev/null 2>&1; then
    deploy_fail "未检测到 Node.js，请先安装 Node.js 18 或更高版本。"
  fi
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [ "$major" -lt 18 ]; then
    deploy_fail "需要 Node.js 18+，当前版本为 $(node -v)。"
  fi
}

deploy_check_docker() {
  command -v docker >/dev/null 2>&1 || deploy_fail "未检测到 Docker，请先安装 Docker。"
  docker compose version >/dev/null 2>&1 || deploy_fail "未检测到 Docker Compose v2（docker compose）。"
}

deploy_ensure_env() {
  local root="$1"
  if [ ! -f "$root/.env" ]; then
    deploy_info "正在从 .env.example 创建 .env …"
    cp "$root/.env.example" "$root/.env"
    deploy_warn "请在生产环境修改 .env 中的 JWT_SECRET、数据库与 Redis 密码。"
  fi
}

deploy_wait_mysql() {
  local root="$1"
  deploy_info "等待 MySQL 就绪 …"
  local i
  for i in $(seq 1 60); do
    if docker compose -f "$root/docker-compose.yml" exec -T mysql \
      mysqladmin ping -h localhost -u epoch -pepoch_secret --silent 2>/dev/null; then
      return 0
    fi
    sleep 2
  done
  deploy_fail "MySQL 在超时时间内未就绪，请执行: docker compose logs mysql"
}

deploy_run_migrate_and_seed() {
  local root="$1"
  deploy_info "执行数据库迁移 …"
  # shellcheck disable=SC1091
  set -a
  # shellcheck source=/dev/null
  source "$root/.env" 2>/dev/null || true
  set +a
  (cd "$root" && yarn db:migrate)
  deploy_info "写入种子数据（管理员账号、示例题目）…"
  (cd "$root" && yarn db:seed) || deploy_warn "种子数据写入失败或已存在，可忽略后手动执行 yarn db:seed"
}

deploy_health_check_api() {
  sleep 3
  if curl -sf http://localhost:3000/api/v1/health >/dev/null; then
    deploy_info "API 健康检查通过"
  else
    deploy_warn "API 尚未就绪，请稍后访问或查看日志: docker compose logs api"
  fi
}

deploy_print_control_plane_urls() {
  cat <<'EOF'

========================================
  控制面部署完成（API + 前端）
========================================
  网站:  http://localhost:8080
  API:   http://localhost:3000/api/v1
  文档:  http://localhost:3000/api/docs

  默认管理员（见 .env 中 SEED_ADMIN_*）:
    用户名: admin
    密码:   admin123

  再次部署控制面: yarn deploy
  仅本机判题:     yarn deploy -- --含本机判题
========================================
EOF
}

deploy_print_full_stack_urls() {
  cat <<'EOF'

========================================
  全栈部署完成（含本机判题机）
========================================
  网站:  http://localhost:8080
  API:   http://localhost:3000/api/v1
  文档:  http://localhost:3000/api/docs

  默认管理员（见 .env 中 SEED_ADMIN_*）:
    用户名: admin
    密码:   admin123

  扩容本机判题副本: docker compose up -d --scale judge=3
  再次部署:         yarn deploy
========================================
EOF
}

deploy_print_remote_judge_next_steps() {
  local center_hint="${1:-<中心机内网IP>}"
  cat <<EOF

========================================
  下一步：部署远程判题机
========================================
当前机器仅运行 MySQL、Redis、API、Web，【未】启动判题 Worker。
提交会停留在「排队中」，直到有判题机连接同一 Redis 队列。

【重要】多机部署时测例存储请使用 S3（或 NFS 共享盘），
请在中心机 .env 中设置 STORAGE_TYPE=s3 并配置 S3_*，
详见 docs/deploy.md。

一、在【判题机所在 Linux 机器】上准备
  1. 安装 Docker
  2. 克隆本仓库或拷贝 docker/Dockerfile.judge 与依赖文件
  3. 确保判题机可访问中心机端口:
     - Redis: ${center_hint}:6379
     - MySQL: ${center_hint}:3306
     - 若使用 S3: 判题机需能访问对象存储 endpoint

二、一键部署远程判题（推荐）
  cd epoch-judge
  chmod +x scripts/deploy-remote-judge.sh
  yarn deploy:judge

  按提示输入中心机地址、Redis/MySQL 密码、本节点名称等。

三、手动部署（可选）
  参见 docs/deploy.md 章节「方式二：多台远程判题机」

四、验证
  1. 管理员登录 → 管理后台 →「判题」Tab，查看节点是否在线
  2. 提交一道题目，状态应由「排队中」变为「判题中」再至终态

中心机防火墙请放行内网 Redis(6379) 与 MySQL(3306)。
生产环境请修改默认密码与 JWT_SECRET。
========================================
EOF
}
