## 1. 密码哈希核心逻辑

- [x] 1.1 在 `apps/api/src/contests/contests.service.ts` 中导入 `bcryptjs`，添加 `hashPassword(plain: string): Promise<string>` 辅助函数，使用 `BCRYPT_ROUNDS` 环境变量（默认 10）调用 `bcrypt.hash()`
- [x] 1.2 修改 `createAdmin()`：在写入数据库前对 `dto.accessPassword` 调用 `hashPassword()`，空值保持 null
- [x] 1.3 修改 `updateAdmin()`：当 `dto.accessPassword !== undefined` 且非空时调用 `hashPassword()`，空字符串/null 保持 null

## 2. 密码验证逻辑

- [x] 2.1 修改 `verifyPassword()`：将 `password !== contest.accessPassword` 替换为 `await bcrypt.compare(password, contest.accessPassword)`，比较失败时抛出 ForbiddenException

## 3. API 响应剥离密码字段

- [x] 3.1 修改 `listAdmin()`：在返回结果中删除 `accessPassword` 字段（保留 `requiresPassword` 逻辑不变）
- [x] 3.2 修改 `getAdminById()`：在返回结果中删除 `accessPassword` 字段
- [x] 3.3 确认 `list()` 公开接口仅返回 `requiresPassword` 布尔值，不暴露密码（验证当前逻辑已满足）

## 4. 迁移脚本

- [x] 4.1 创建 `scripts/migrate-contest-passwords.ts`：查询所有 `accessPassword` 非空的 Contest 记录，通过 bcrypt 哈希前缀（`$2a$`/`$2b$`）检测是否为明文，对明文密码执行哈希并回写，已哈希的跳过
- [x] 4.2 在 `package.json`（根目录或 `apps/api`）中添加 `migrate:contest-passwords` 脚本命令

## 5. 环境变量与文档

- [x] 5.1 更新 `.env.example`，添加 `BCRYPT_ROUNDS` 环境变量及注释
- [x] 5.2 更新部署文档，说明迁移脚本的使用方式及执行时机

## 6. 验证

- [ ] 6.1 手动验证：创建比赛带密码，数据库中存储为 bcrypt 哈希而非明文
- [ ] 6.2 手动验证：使用正确密码报名验证成功，错误密码被拒绝
- [ ] 6.3 手动验证：管理员 API 响应中不包含 `accessPassword` 字段
- [ ] 6.4 手动验证：迁移脚本对已有明文密码执行哈希，重复执行不重复哈希
