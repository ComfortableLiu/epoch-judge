## Why

当前仅支持 JavaScript、Python、Java、C、C++ 五种语言。用户有 Rust、Go、Kotlin 等新兴语言的评测需求，特别是 Go 在国内编程教育中使用率持续增长。

## What Changes

- 判题沙箱新增 Go、Rust、Kotlin 的编译和运行支持
- Docker 镜像中安装 Go、Rust、Kotlin 编译器
- Language 枚举新增 GO、RUST、KOTLIN
- 代码编辑器语法高亮适配新语言
- 前端语言选择器更新

## Capabilities

### New Capabilities

- `language-extensions`: 评测语言扩展（Go、Rust、Kotlin）

### Modified Capabilities

（无）

## Impact

- **数据库**：Prisma Schema Language 枚举新增值，需迁移
- **判题**：`packages/judge-sandbox` 新增语言编译/运行配置
- **Docker**：`docker/Dockerfile.judge` 安装新编译器
- **前端**：语言选择器、Monaco Editor 语法高亮
