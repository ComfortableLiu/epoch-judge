## Why

当前仅支持 Docker Compose 单机部署，无法满足大规模场景（多节点判题、自动扩缩容、滚动更新）。Helm Chart 是 Kubernetes 生态的标准部署方式，降低 K8s 部署门槛。

## What Changes

- 创建 Helm Chart，包含以下组件：API Deployment + Service、Web Deployment + Service、Judge Worker Deployment（可配置副本数）、MySQL StatefulSet（或外部连接）、Redis StatefulSet（或外部连接）
- 支持 values.yaml 配置：副本数、资源限制、环境变量、Ingress、存储类
- 支持 S3 存储配置
- 支持 HPA（自动扩缩容 Judge Worker）
- 添加安装/升级/卸载文档

## Capabilities

### New Capabilities

- `helm-chart`: Kubernetes Helm Chart 部署方案

### Modified Capabilities

（无）

## Impact

- **新增目录**：`deploy/helm/epoch-judge/`
- **无代码变更**
- **部署**：`helm install epoch-judge ./deploy/helm/epoch-judge`
