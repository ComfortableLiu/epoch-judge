## Context

EpochJudge 的 `Contest.accessPassword` 字段当前以明文存储在 MySQL 中。所有涉及比赛密码的操作——创建/更新比赛（`createAdmin`、`updateAdmin`）、报名验证（`verifyPassword`）——均直接读写明文字符串。一旦数据库被泄露或未授权访问，所有比赛密码直接暴露。

现状关键点：
- `bcryptjs` 已在 `apps/api/package.json` 中（Auth 模块用于用户密码），无需新增依赖。
- `Contest.accessPassword` 在 Prisma Schema 中为 `String?` 类型，哈希后字段类型无需变更。
- `needsPassword()` 辅助函数通过 `contest.accessPassword?.length` 判断是否需要密码——bcrypt 哈希为固定长度非空字符串，此逻辑兼容。
- `listAdmin()` 和 `getAdminById()` 在查询中 `select: { accessPassword: true }` 并直接返回该字段——需要在响应中剥离。
- `verifyPassword()` 使用 `password !== contest.accessPassword` 直接比对——需改为 `bcrypt.compare()`。
- `problem-access.service.ts` 中通过 `contest.accessPassword?.length` 检查是否需要密码验证——不读取明文，兼容。

## Goals / Non-Goals

**Goals:**
- 比赛创建/更新时，对 `accessPassword` 执行 bcrypt 哈希后存储。
- 报名验证时，使用 `bcrypt.compare()` 比对用户输入与数据库哈希值。
- API 响应中不返回密码字段（包括哈希值）。
- 提供一次性迁移脚本，将数据库中已有的明文密码批量哈希。

**Non-Goals:**
- 不修改 Prisma Schema（字段类型仍为 `String?`）。
- 不为比赛密码添加"忘记密码"流程（比赛密码由管理员管理）。
- 不改变认证接口（`/auth/*`）的密码处理方式（已使用 bcrypt）。
- 不引入密码强度校验（当前业务上比赛密码通常为简单口令）。

## Decisions

### 决策 1：复用项目已有的 `bcryptjs`，不引入新依赖
项目已通过 `bcryptjs` 处理用户密码哈希（见 `apps/api/package.json`），直接复用。`bcryptjs` 为纯 JS 实现，无需编译原生模块。
- **为什么**：零新依赖，与现有 Auth 模块一致。
- **替代方案**：`bcrypt`（原生 C++ 绑定，需编译，在 Docker 中可用但增加构建复杂度）——被否决。

### 决策 2：在 Service 层哈希，不在 Prisma Middleware 中拦截
在 `contests.service.ts` 的 `createAdmin()` 和 `updateAdmin()` 中，显式对 `accessPassword` 调用 `bcrypt.hash()` 后再写入数据库。
- **为什么**：逻辑清晰、可测试、与用户密码处理方式一致；Prisma Middleware 增加隐式行为，调试困难。
- **替代方案**：Prisma `$use` 中间件自动哈希（隐式、难以区分"清除密码"与"设置空值"）——被否决。

### 决策 3：bcrypt 轮数使用环境变量配置，默认 10
哈希轮数通过 `BCRYPT_ROUNDS` 环境变量配置（默认 10），与 Auth 模块一致。
- **为什么**：10 轮在安全性和性能间取得平衡（~100ms/次），且可通过环境变量在不同环境调整。

### 决策 4：一次性迁移脚本作为独立脚本，不使用 Prisma Migration
创建 `scripts/migrate-contest-passwords.ts`，通过 tsx 直接运行。脚本读取所有 `accessPassword` 非空的记录，检测是否已是 bcrypt 哈希（`$2a$`/`$2b$` 前缀），对明文密码执行哈希并回写。
- **为什么**：bcrypt 哈希有明确前缀，可安全幂等执行；作为独立脚本便于在部署时手动运行一次，不影响 CI/CD 流水线。
- **替代方案**：Prisma SQL Migration（无法在 SQL 中调用 bcrypt）——不适用。

### 决策 5：API 响应中剥离密码字段而非不查询
在 `listAdmin()`、`getAdminById()` 的返回值中，显式删除 `accessPassword` 字段（或改用 `select` 排除）。公开 `list()` 接口已通过 `requiresPassword: Boolean(c.accessPassword?.length)` 返回布尔值，不暴露密码本身。
- **为什么**：即使哈希值也不应暴露给前端——暴露哈希值可被离线暴力破解（弱密码场景）。
- **替代方案**：前端仅隐藏——不安全，API 响应仍可被截获。

## Risks / Trade-offs

- **弱比赛密码的 bcrypt 哈希仍可能被离线破解** → 比赛密码通常为管理员设置的简单口令，bcrypt 增加了破解成本但不能完全消除风险。后续可考虑密码强度校验。
- **迁移脚本执行期间短暂影响比赛密码验证** → 脚本执行很快（仅更新有密码的记录），且为幂等操作；建议在低峰期执行。
- **`bcryptjs` 性能不如原生 `bcrypt`** → 单次哈希 ~100ms 可接受，比赛密码操作频率低；如需优化可切换为原生 `bcrypt`。
