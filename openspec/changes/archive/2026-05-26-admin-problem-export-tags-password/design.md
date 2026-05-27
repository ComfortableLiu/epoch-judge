## Context

- 题目 ZIP 导入已固定布局：`problem.yaml`、`statement.md`、`testdata/*.in|out`、可选 `assets/**`（见 `ProblemsController.importZip`）。
- 管理端题目 Tab 仅支持 ZIP 导入与编辑已有题目，无「新建」与「导出」。
- 用户注册在用户名已存在时一律 `409`；密码仅能通过登录校验，无改密/重置流程。
- 管理 Tab 顺序为 `users, problems, ...`，默认落在用户 Tab。
- 数据库尚无题目标签字段。

## Goals / Non-Goals

**Goals:**

- 导出 ZIP 与导入模板**字节级布局兼容**（可 round-trip：导出 → 再导入）。
- 标签规则在 API、导入、导出、管理表单四处一致校验。
- 管理员重置密码后，用户用**原用户名 + 新密码**完成一次性「注册接管」，无需临时密码泄露。
- 个人改密、管理重置、注册接管均有明确 API 与 UI。

**Non-Goals:**

- 标签的全局词库、搜索筛选、多语言标签名规范（首期仅存储与展示）。
- 批量导出多题为一个 ZIP（首期单题导出）。
- 邮件/短信发送临时密码。
- 非管理员自助重置（忘记密码）流程。

## Decisions

### 1. 导出格式与选项

- **决策**：`GET /api/v1/problems/:id/export?testdata=true|false`，默认 `testdata=true`；响应 `application/zip`，文件名 `problem-{number}.zip`。
- **内容**：
  - `testdata=false`：`problem.yaml`、`statement.md`、`assets/**`（若有）；`problem.yaml` 中 `testcases` 节省略或为空数组，ZIP 内不含 `testdata/`。
  - `testdata=true`：与当前导入解析逻辑一致，从存储读取 in/out 写入 `testdata/`。
- **实现**：抽取 `buildProblemZip(manifest, opts)` 与导入共用 YAML 字段定义；`number` 写入 `problem.yaml` 以便再导入时 upsert。
- **备选**：独立 JSON 导出 — 拒绝，与「与导入完全一致」冲突。

### 2. 标签存储

- **决策**：`Problem.tags` 使用 `Json` 类型存 `string[]`（MySQL JSON），应用层校验；`problem.yaml` 增加 `tags: string[]`。
- **校验**：去首尾空白、去重（大小写敏感）、丢弃空串；最多 5 个；每个长度 1–10（Unicode 码点计或按 JS `length`，实现时统一为 UTF-8 字符数 ≤10）。
- **备选**：`ProblemTag` 关联表 — 首期无跨题标签检索，JSON 更简单。

### 3. 管理端新建题目

- **决策**：`POST /api/v1/problems`（ADMIN / PROBLEM_EDITOR），body 含 `title`（必填）、可选 `statement`、`visibility`、limits、`tags`；创建后返回 `{ id, number }`，前端打开编辑 Modal。
- **默认**：`visibility=PRIVATE`、`createdById=当前用户`、空 statement、默认时限/内存。

### 4. 个人修改密码

- **决策**：`PATCH /api/v1/users/me/password`，body `{ currentPassword, newPassword }`；校验当前密码后更新 `passwordHash`。
- **策略**：新密码长度 ≥8（与注册一致）；成功后可选使旧 JWT 失效（首期不强制 refresh 黑名单）。

### 5. 管理员重置与用户自取新密码

- **决策**：`User.mustResetPassword Boolean @default(false)`。
- **重置 API**：`POST /api/v1/admin/users/:id/reset-password`（仅 ADMIN）；将 `passwordHash` 设为不可登录的占位哈希（随机），`mustResetPassword=true`。
- **注册接管**：`POST /auth/register` 若用户名存在且 `mustResetPassword=true`，则校验邮箱可选规则后**更新** `passwordHash`、清除 `mustResetPassword`，返回 token（等同登录成功）；若 `mustResetPassword=false` 仍为 `409`。
- **UI**：重置前 `Modal.confirm` 二次确认，文案说明用户需自行用原用户名注册设置新密码。
- **备选**：管理员生成临时密码 — 拒绝，违反「不告知临时密码」需求。

### 6. 管理 Tab 顺序

- **决策**：`ADMIN_TABS = ['problems','contests','rejudge','users','judge','config']`；`parseAdminTab` 默认 `'problems'`；`AdminPage` 标签文案顺序同步。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 导出大测试数据 ZIP 超时/内存 | 流式写 ZIP 或限制单次导出体积；Nginx `proxy_read_timeout` 已配置 |
| `mustResetPassword` 期间用户无法登录 | 文档与重置确认文案说明须走注册；登录失败提示「请联系管理员重置密码后使用注册设置新密码」 |
| 标签 JSON 无 DB 约束 | DTO + 共享 `normalizeProblemTags()` 单点校验 |
| 再导入覆盖测试数据 | 导出 YAML 带 `number`；导入文档说明 upsert 行为 |

## Migration Plan

1. Prisma 迁移：`User.mustResetPassword`、`Problem.tags`（JSON 默认 `[]`）。
2. 更新 `templates/problem-import.zip` 与文档示例 `tags`。
3. 部署 API → Web；无数据回填必填。

## Open Questions

- 导出默认是否包含测试数据：建议 UI 默认勾选「包含测试数据」，与完整备份场景一致。
- 待重设用户是否允许登录：建议 **禁止**（仅 register 接管），避免旧密码猜测。
