## 1. 凭证检查模块

- [x] 1.1 创建 `apps/api/src/common/startup/credential-check.ts`，定义已知默认值列表（`JWT_SECRET`、`DB_PASSWORD`、`REDIS_PASSWORD`、`SEED_ADMIN_PASSWORD` 及其默认值）
- [x] 1.2 实现 `checkDefaultCredentials()` 函数：遍历列表，逐一比对 `process.env`，收集检测到的默认凭证
- [x] 1.3 实现警告输出：使用 ANSI 颜色代码（TTY 检测）输出醒目警告，列出所有检测到的默认凭证及建议修改的说明
- [x] 1.4 实现强制模式：当 `ENFORCE_SECURE_CREDENTIALS=true` 时，输出错误日志后调用 `process.exit(1)`

## 2. 启动集成

- [x] 2.1 在 `apps/api/src/main.ts` 的 `bootstrap()` 开头、`NestFactory.create()` 之前调用 `checkDefaultCredentials()`

## 3. 环境变量与文档

- [x] 3.1 更新 `.env.example`：对 `JWT_SECRET`、`DB_PASSWORD`、`REDIS_PASSWORD`、`SEED_ADMIN_PASSWORD` 添加注释说明必须修改，添加 `ENFORCE_SECURE_CREDENTIALS` 环境变量及注释
- [x] 3.2 更新部署文档（`docs/developer.md`），说明凭证检查机制和强制模式用法

## 4. 验证

- [x] 4.1 手动验证：使用默认 `.env` 启动时，控制台输出醒目警告列出所有默认凭证
- [x] 4.2 手动验证：修改所有凭证后启动，无警告输出
- [x] 4.3 手动验证：设置 `ENFORCE_SECURE_CREDENTIALS=true` 且保留默认凭证时，应用拒绝启动并退出
- [x] 4.4 手动验证：`ENFORCE_SECURE_CREDENTIALS=true` 且所有凭证已修改时，应用正常启动
