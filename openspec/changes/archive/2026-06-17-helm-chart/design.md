## Context

当前仅支持 Docker Compose 单机部署，无法满足大规模场景。需要提供 Helm Chart 支持 K8s 部署。

## Goals / Non-Goals

**Goals:**
- 创建 Helm Chart 部署所有组件
- 支持外部数据库配置
- 支持 Judge Worker 水平扩缩容

**Non-Goals:**
- 不做 Operator
- 不做自动扩缩容（HPA 可选）
- 不做多集群部署

## Decisions

### 1. 数据库部署
- **选择**：默认使用外部数据库，可选内置 StatefulSet
- **理由**：生产环境通常有独立数据库服务

### 2. 配置管理
- **选择**：values.yaml + ConfigMap + Secret
- **理由**：标准 K8s 配置方式

## Risks / Trade-offs

- [复杂度] K8s 部署比 Docker Compose 复杂 → 提供详细文档
- [资源消耗] 内置 MySQL/Redis 需要额外资源 → 默认使用外部

## Migration Plan

1. 创建 deploy/helm/epoch-judge/ 目录
2. 编写 Chart.yaml、values.yaml、templates/
3. 编写安装文档
