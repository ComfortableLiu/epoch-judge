## Why

当前没有任何 CI/CD 流程，代码推送后无自动测试、无自动构建、无自动部署。开源项目的可信度和贡献者信心很大程度取决于 CI 状态。

## What Changes

- GitHub Actions 工作流：PR 触发 lint + 单元测试 + 构建验证
- 主分支合并触发 Docker 镜像构建并推送到 Docker Hub / GHCR
- 可选：自动部署到演示环境
- 依赖缓存（Yarn）加速 CI
- 测试覆盖率报告（Codecov 集成）

## Capabilities

### New Capabilities

- `github-actions-cicd`: GitHub Actions CI/CD 流水线

### Modified Capabilities

（无）

## Impact

- **新增文件**：`.github/workflows/ci.yml`、`.github/workflows/deploy.yml`
- **无代码变更**
- **依赖**：GitHub Actions（免费）
