## Context

当前没有任何可观测性指标，无法监控系统运行状态。需要添加 Prometheus 指标端点。

## Goals / Non-Goals

**Goals:**
- 新增 /metrics 端点
- 暴露 HTTP、判题、系统指标
- 使用 prom-client 库

**Non-Goals:**
- 不做 Grafana 面板（仅暴露指标）
- 不做日志聚合
- 不做告警规则

## Decisions

### 1. 指标库
- **选择**：prom-client
- **理由**：Node.js 生态最成熟的 Prometheus 客户端

### 2. 指标收集方式
- **选择**：NestJS 拦截器自动收集 HTTP 指标
- **理由**：非侵入式，无需修改每个 Controller

## Risks / Trade-offs

- [性能] 指标收集有微小开销 → 可忽略，prom-client 高效
- [安全] /metrics 端点无需认证 → 通常内网访问，风险低

## Migration Plan

1. 安装 prom-client
2. 创建 MetricsModule 和 MetricsInterceptor
3. 注册 /metrics 端点
