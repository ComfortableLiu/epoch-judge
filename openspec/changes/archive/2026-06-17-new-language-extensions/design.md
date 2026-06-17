## Context

当前仅支持 5 种语言，用户有扩展语言需求。需要添加 Go、Rust、Kotlin 支持。

## Goals / Non-Goals

**Goals:**
- 判题沙箱支持 Go、Rust、Kotlin
- Docker 镜像安装对应编译器
- 前端语言选择器更新

**Non-Goals:**
- 不做语言版本管理
- 不做自定义编译参数
- 不做 WebAssembly 评测

## Decisions

### 1. 编译器安装
- **选择**：Docker 镜像中直接安装
- **理由**：简单直接，镜像体积增加可控

### 2. 评测流程
- **选择**：编译+执行两步走（与 C/C++ 类似）
- **理由**：Go/Rust/Kotlin 都是编译型语言

## Risks / Trade-offs

- [镜像体积] 安装 3 个编译器会增大镜像 → 使用多阶段构建优化
- [编译时间] 新语言编译可能较慢 → 设置合理的编译超时

## Migration Plan

1. 更新 Prisma Schema Language 枚举
2. 更新 judge-sandbox 语言配置
3. 更新 Dockerfile 安装编译器
4. 前端更新语言选择器
