## Why

`Contest.accessPassword` 当前以明文存储在 MySQL 数据库中，一旦数据库泄露或被未授权访问，所有比赛密码直接暴露。需使用 bcrypt 哈希存储，验证时比对哈希值。

## What Changes

- 比赛创建/更新时，对 `accessPassword` 执行 bcrypt 哈希后存储
- 比赛报名验证时，使用 `bcrypt.compare()` 比对用户输入与数据库哈希值
- 数据库迁移：将现有明文密码批量哈希（一次性迁移脚本）
- API 响应中不再返回密码字段（即使哈希值也不应暴露）

## Capabilities

### New Capabilities

- `contest-password-hashing`: 比赛密码 bcrypt 哈希存储与验证能力

### Modified Capabilities

（无现有 spec 需修改）

## Impact

- **代码**：`apps/api/src/contests/contests.service.ts`（密码哈希/验证逻辑）、`apps/api/src/contests/contests.controller.ts`（去除密码明文返回）
- **数据库**：Prisma Schema 不变（字段类型仍为 String），需一次性迁移脚本哈希现有密码
- **依赖**：`bcrypt` 已在项目中（Auth 模块使用），无需新增
- **API**：创建/更新比赛接口入参不变，报名接口验证逻辑变更
