#!/usr/bin/env bash
# 纪元 EpochJudge — 远程判题机一键部署（仅 Judge Worker）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/deploy-common.sh
source "$ROOT/scripts/lib/deploy-common.sh"

ENV_FILE="${EPOCH_JUDGE_ENV_FILE:-$ROOT/.env.remote-judge}"
IMAGE_NAME="${EPOCH_JUDGE_IMAGE:-epoch-judge-judge:latest}"
CONTAINER_NAME="${EPOCH_JUDGE_CONTAINER:-epoch-judge-worker}"

usage() {
  cat <<'EOF'
用法: scripts/deploy-remote-judge.sh

  在【当前 Linux 机器】上构建并运行 Judge Worker 容器，
  连接已部署好的中心机（MySQL + Redis + API）。

环境变量（非交互，可选）:
  CENTER_HOST          中心机 IP 或域名（必填，非交互时）
  REDIS_PASSWORD       Redis 密码（默认 epoch_redis_secret）
  DB_PASSWORD          MySQL 密码（默认 epoch_secret）
  JUDGE_NODE_NAME      节点展示名（默认 主机名）
  JUDGE_WORKER_CONCURRENCY  本机并发（默认 4）
  STORAGE_TYPE         local 或 s3（多机推荐 s3）
  EPOCH_JUDGE_ENV_FILE 生成的 env 文件路径
  EPOCH_SKIP_BUILD=1   跳过 docker build

示例:
  yarn deploy:judge
  CENTER_HOST=10.0.0.10 JUDGE_NODE_NAME=judge-01 yarn deploy:judge
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

cd "$ROOT"
deploy_check_docker

echo ""
echo "=========================================="
echo "     纪元 EpochJudge 远程判题机部署"
echo "=========================================="
echo ""
echo "本脚本仅在【当前机器】运行 Judge Worker。"
echo "请确保中心机已部署 API，且本机可访问中心的 Redis 与 MySQL。"
echo ""

CENTER_HOST="${CENTER_HOST:-}"
REDIS_PASSWORD="${REDIS_PASSWORD:-epoch_redis_secret}"
DB_PASSWORD="${DB_PASSWORD:-epoch_secret}"
JUDGE_NODE_NAME="${JUDGE_NODE_NAME:-$(hostname 2>/dev/null || echo judge-node)}"
JUDGE_WORKER_CONCURRENCY="${JUDGE_WORKER_CONCURRENCY:-4}"
STORAGE_TYPE="${STORAGE_TYPE:-s3}"

if [ -z "$CENTER_HOST" ]; then
  read -r -p "请输入中心机（API 所在机器）的内网 IP 或域名: " CENTER_HOST
fi
[ -n "$CENTER_HOST" ] || deploy_fail "未填写中心机地址。"

if [ -z "${REDIS_PASSWORD+x}" ] || [ "$REDIS_PASSWORD" = epoch_redis_secret ]; then
  read -r -p "Redis 密码 [默认: epoch_redis_secret]: " _rp
  [ -n "$_rp" ] && REDIS_PASSWORD="$_rp"
fi

if [ -z "${DB_PASSWORD+x}" ] || [ "$DB_PASSWORD" = epoch_secret ]; then
  read -r -p "MySQL 密码 (用户 epoch) [默认: epoch_secret]: " _dp
  [ -n "$_dp" ] && DB_PASSWORD="$_dp"
fi

read -r -p "本判题节点名称（管理后台展示，建议唯一）[${JUDGE_NODE_NAME}]: " _hn
[ -n "$_hn" ] && JUDGE_NODE_NAME="$_hn"

read -r -p "本机沙箱并发数 JUDGE_WORKER_CONCURRENCY [${JUDGE_WORKER_CONCURRENCY}]: " _jc
[ -n "$_jc" ] && JUDGE_WORKER_CONCURRENCY="$_jc"

echo ""
echo "测例存储: 多机部署强烈建议使用 S3；单机试用可选 local（需与中心共享目录，一般不适用于远程）。"
read -r -p "存储类型 STORAGE_TYPE [s3/local，默认 s3]: " _st
case "$_st" in
  local|LOCAL) STORAGE_TYPE=local ;;
  s3|S3|'') STORAGE_TYPE=s3 ;;
  *) deploy_fail "STORAGE_TYPE 仅支持 s3 或 local" ;;
esac

if [ "$STORAGE_TYPE" = s3 ]; then
  echo ""
  deploy_warn "请确认中心机 .env 中 STORAGE_TYPE=s3，且下列 S3 配置与中心一致。"
  S3_ENDPOINT="${S3_ENDPOINT:-}"
  S3_BUCKET="${S3_BUCKET:-}"
  S3_ACCESS_KEY="${S3_ACCESS_KEY:-}"
  S3_SECRET_KEY="${S3_SECRET_KEY:-}"
  S3_PREFIX="${S3_PREFIX:-testcases}"
  S3_REGION="${S3_REGION:-us-east-1}"
  [ -z "$S3_ENDPOINT" ] && read -r -p "S3_ENDPOINT: " S3_ENDPOINT
  [ -z "$S3_BUCKET" ] && read -r -p "S3_BUCKET: " S3_BUCKET
  [ -z "$S3_ACCESS_KEY" ] && read -r -p "S3_ACCESS_KEY: " S3_ACCESS_KEY
  [ -z "$S3_SECRET_KEY" ] && read -r -p "S3_SECRET_KEY: " S3_SECRET_KEY
fi

deploy_info "生成判题机配置: $ENV_FILE"
cat >"$ENV_FILE" <<EOF
# 由 scripts/deploy-remote-judge.sh 生成 — 远程判题机专用
REDIS_HOST=${CENTER_HOST}
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_KEY_PREFIX=epoch-judge

DB_HOST=${CENTER_HOST}
DB_PORT=3306
DB_USER=epoch
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=epoch_judge
DB_AUTO_MIGRATE=false

STORAGE_TYPE=${STORAGE_TYPE}
STORAGE_LOCAL_ROOT=./data/testcases

JUDGE_MOCK=false
JUDGE_WORKER_CONCURRENCY=${JUDGE_WORKER_CONCURRENCY}
HOSTNAME=${JUDGE_NODE_NAME}
EOF

if [ "$STORAGE_TYPE" = s3 ]; then
  cat >>"$ENV_FILE" <<EOF

S3_ENDPOINT=${S3_ENDPOINT}
S3_BUCKET=${S3_BUCKET}
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}
S3_PREFIX=${S3_PREFIX}
S3_REGION=${S3_REGION}
EOF
fi

if [ "${EPOCH_SKIP_BUILD:-}" != 1 ]; then
  deploy_info "构建判题镜像（首次可能较慢）…"
  docker build -t "$IMAGE_NAME" -f docker/Dockerfile.judge .
else
  deploy_info "跳过构建（EPOCH_SKIP_BUILD=1）"
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  deploy_info "停止并移除已有容器: $CONTAINER_NAME"
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

deploy_info "启动判题容器 …"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -e "HOSTNAME=${JUDGE_NODE_NAME}" \
  "$IMAGE_NAME"

sleep 2
if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  deploy_info "判题容器已运行: $CONTAINER_NAME"
else
  deploy_fail "容器未保持运行，请查看: docker logs $CONTAINER_NAME"
fi

cat <<EOF

========================================
  远程判题机部署完成
========================================
  节点名称: ${JUDGE_NODE_NAME}
  中心机:   ${CENTER_HOST}
  配置文件: ${ENV_FILE}
  容器名:   ${CONTAINER_NAME}

【验证】
  1. 中心机网站提交代码，观察是否开始判题
  2. 中心机管理后台 → 判题 → 查看节点是否在线

【常用命令】
  查看日志:   docker logs -f ${CONTAINER_NAME}
  重启:       docker restart ${CONTAINER_NAME}
  停止:       docker rm -f ${CONTAINER_NAME}
  修改配置后: 编辑 ${ENV_FILE} 后重新执行 yarn deploy:judge

【注意】
  · REDIS_KEY_PREFIX 必须与中心机一致（当前: epoch-judge）
  · 多机请勿使用互不相通的本地磁盘存测例，请用 S3 或共享存储
  · 详细说明见 docs/deploy.md
========================================
EOF
