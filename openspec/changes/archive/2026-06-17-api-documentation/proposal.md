## Why

当前 Swagger 自动生成的 API 文档缺少详细描述、示例和分组，开发者对接或二次开发时需要逐个读源码。完善的 API 文档是开源项目吸引贡献者的基础。

## What Changes

- 为所有 Controller 端点添加 `@ApiOperation`、`@ApiResponse` 装饰器，补充描述和示例
- 按模块分组（Auth、Problems、Submissions、Contests、Admin、Judge）
- 添加认证说明（Bearer Token、刷新机制）
- 导出 OpenAPI JSON 文件，提交到仓库
- 添加 API 变更日志

## Capabilities

### New Capabilities

- `api-documentation`: 完善的 Swagger/OpenAPI 文档

### Modified Capabilities

（无）

## Impact

- **代码**：所有 Controller 文件添加 Swagger 装饰器
- **配置**：`apps/api/src/main.ts` Swagger 配置增强
- **文档**：新增 `docs/api.md` 或导出 `openapi.json`
- **无运行时影响**
