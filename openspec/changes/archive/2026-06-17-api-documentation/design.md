## Context

当前 Swagger 文档缺少详细描述，开发者对接成本高。需要完善 API 文档。

## Goals / Non-Goals

**Goals:**
- 为所有端点添加 @ApiOperation、@ApiResponse 装饰器
- 按模块分组
- 导出 OpenAPI JSON

**Non-Goals:**
- 不做独立文档站
- 不做 SDK 生成
- 不做版本管理

## Decisions

### 1. 文档方式
- **选择**：Swagger 装饰器 + 自动生成
- **理由**：代码即文档，维护成本低

### 2. 分组方式
- **选择**：按 API 模块分组（Auth、Problems、Submissions 等）
- **理由**：与代码结构一致，易于导航

## Risks / Trade-offs

- [维护成本] 装饰器需要随代码更新 → 在 Code Review 中强制要求

## Migration Plan

1. 为所有 Controller 添加 Swagger 装饰器
2. 导出 openapi.json
3. 更新文档
