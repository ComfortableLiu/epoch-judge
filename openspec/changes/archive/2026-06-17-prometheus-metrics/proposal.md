## Why

当前没有任何可观测性指标，无法监控 API 响应时间、错误率、队列深度、判题延迟等关键运维指标。添加 Prometheus 指标端点是运维和性能优化的基础。

## What Changes

- 新增 `/metrics` 端点，暴露 Prometheus 格式指标
- HTTP 指标：请求总数、响应时间 histogram、状态码分布
- 判题指标：队列深度、判题延迟、成功率、Worker 在线数
- 系统指标：内存使用、CPU 使用、Redis 连接数
- 使用 `prom-client` 库实现

## Capabilities

### New Capabilities

- `prometheus-metrics`: Prometheus 格式的应用指标暴露

### Modified Capabilities

（无）

## Impact

- **API**：新增 metrics 模块 + NestJS 拦截器收集 HTTP 指标
- **依赖**：新增 `prom-client`
- **端点**：`GET /metrics`（无需认证）
- **部署**：可选配合 Grafana + Prometheus 搭建监控面板
