#!/usr/bin/env bash
# 纪元 EpochJudge — 一键部署（API + 前端 + MySQL + Redis，可选本机判题）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/deploy-common.sh
source "$ROOT/scripts/lib/deploy-common.sh"

DEPLOY_JUDGE=""
CENTER_IP_HINT=""

usage() {
  cat <<'EOF'
用法: scripts/deploy.sh [选项]

  在当前机器部署 MySQL、Redis、API、Web 前端。
  默认会询问是否在远程单独部署判题机；也可通过参数跳过询问。

选项:
  --含本机判题, --with-judge    同时在本机启动 Judge Worker（单机全栈）
  --仅控制面, --no-judge         不启动 Judge（用于远程判题架构）
  -h, --help                     显示本帮助

环境变量（非交互）:
  EPOCH_DEPLOY_JUDGE=1           等同 --含本机判题
  EPOCH_DEPLOY_JUDGE=0           等同 --仅控制面

示例:
  yarn deploy
  yarn deploy -- --仅控制面
  EPOCH_DEPLOY_JUDGE=1 yarn deploy
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --含本机判题|--with-judge)
      DEPLOY_JUDGE=1
      shift
      ;;
    --仅控制面|--no-judge)
      DEPLOY_JUDGE=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      deploy_fail "未知参数: $1（使用 --help 查看说明）"
      ;;
  esac
done

if [ -z "$DEPLOY_JUDGE" ] && [ -n "${EPOCH_DEPLOY_JUDGE:-}" ]; then
  case "${EPOCH_DEPLOY_JUDGE}" in
    1|true|yes|YES|是) DEPLOY_JUDGE=1 ;;
    0|false|no|NO|否) DEPLOY_JUDGE=0 ;;
    *) deploy_fail "EPOCH_DEPLOY_JUDGE 仅支持 0 或 1" ;;
  esac
fi

if [ -z "$DEPLOY_JUDGE" ]; then
  echo ""
  echo "=========================================="
  echo "       纪元 EpochJudge 部署向导"
  echo "=========================================="
  echo ""
  echo "将在【本机】部署:"
  echo "  · MySQL 数据库"
  echo "  · Redis 队列"
  echo "  · API 服务"
  echo "  · Web 前端（与 API 同机，通过 8080 访问）"
  echo ""
  echo "判题机 (Judge Worker) 可以:"
  echo "  A) 与本脚本一起部署在本机（适合试用、小规模）"
  echo "  B) 在其它 Linux 机器上单独部署（适合扩容、多核机房）"
  echo ""
  read -r -p "是否在【远程机器】单独部署判题机？(y/N): " _ans
  case "$_ans" in
    y|Y|yes|YES|是)
      DEPLOY_JUDGE=0
      ;;
    *)
      DEPLOY_JUDGE=1
      ;;
  esac
  echo ""
fi

cd "$ROOT"

deploy_check_node
deploy_check_docker
corepack enable 2>/dev/null || true

deploy_ensure_env "$ROOT"
mkdir -p data/testcases

deploy_info "安装依赖 …"
yarn install

deploy_info "构建工作区 …"
yarn build

if [ "$DEPLOY_JUDGE" = 1 ]; then
  deploy_info "启动 Docker 服务: MySQL、Redis、API、Web、本机判题机 …"
  docker compose up -d --build
else
  deploy_info "启动 Docker 服务: MySQL、Redis、API、Web（不含判题机）…"
  docker compose up -d --build mysql redis api web
  deploy_warn "未启动判题服务；请按脚本结束时的说明部署远程判题机。"
fi

deploy_wait_mysql "$ROOT"
deploy_run_migrate_and_seed "$ROOT"
deploy_health_check_api

if [ "$DEPLOY_JUDGE" = 1 ]; then
  deploy_print_full_stack_urls
else
  # 尝试提示中心机内网 IP
  if command -v hostname >/dev/null 2>&1; then
    CENTER_IP_HINT="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  [ -z "$CENTER_IP_HINT" ] && CENTER_IP_HINT="<请填写本机内网IP>"
  deploy_print_control_plane_urls
  deploy_print_remote_judge_next_steps "$CENTER_IP_HINT"
fi
