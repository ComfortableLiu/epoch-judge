## Context

当前没有任何 CI/CD 流程，代码质量无法保障。需要添加 GitHub Actions。

## Goals / Non-Goals

**Goals:**
- PR 触发 lint + test + build
- 主分支合并触发 Docker 镜像构建
- 依赖缓存加速 CI

**Non-Goals:**
- 不做自动部署到生产环境
- 不做金丝雀发布
- 不做性能测试

## Decisions

### 1. CI 触发条件
- **选择**：PR 和 push to main
- **理由**：覆盖开发和合并两个关键节点

### 2. 镜像仓库
- **选择**：GitHub Container Registry (GHCR)
- **理由**：与 GitHub 集成紧密，免费

## Risks / Trade-offs

- [CI 时间] 完整流程可能较慢 → 使用缓存优化
- [密钥管理] Docker Hub token 需要配置 → 使用 GitHub Secrets

## Migration Plan

1. 创建 .github/workflows/ci.yml
2. 创建 .github/workflows/deploy.yml
3. 配置 GitHub Secrets
