# Design: 管理后台 CRUD

## API

- `POST /users` — 管理员创建用户（bcrypt 密码）
- `PATCH /users/:id` — 更新邮箱、昵称、角色、可选重置密码
- `DELETE /users/:id` — 删除用户（禁止删自己、保留至少一名 ADMIN）
- `PATCH /problems/:id` — 扩展字段：难度、时限、内存、默认评测模式

## 前端

- 用户 Tab：`新建` 按钮 + 行内 `编辑` / `删除` + Modal 表单
- 题目 Tab：行内 `编辑` + Modal（大文本题面 + 数值/枚举字段）
- 编辑题目时 `GET /problems/:slug?` 需 staff 权限（管理员已满足）
