## Why

管理端与账号自助能力仍不完整：题目只能 ZIP 导入、无法按同一格式导出备份或迁移；题目标签缺失；管理员无法在页面上新建空题目；用户无法自助改密，管理员重置密码后缺少安全的「用户自取新密码」流程。同时管理后台 Tab 顺序与日常操作习惯不一致。

## What Changes

- **题目导出**：管理员可导出题目为与 `problem-import.zip` 布局一致的 ZIP；导出时可选择「仅题目元数据/题面/资源」或「包含测试数据」。
- **题目标签**：题目创建、编辑、ZIP 导入/导出支持标签；单标签最多 10 字符，每题最多 5 个标签。
- **管理端新建题目**：题目 Tab 提供「新建题目」入口，表单创建后可继续编辑题面与测试数据。
- **个人资料改密**：登录用户在个人资料页修改当前密码（需校验旧密码）。
- **管理员重置密码**：用户管理支持重置密码；操作前二次确认；重置后用户记录「待重设密码」标记；该用户可使用**原用户名**走注册接口一次以设置新密码（无需管理员告知临时密码）。
- **管理 Tab 顺序**：调整为 **题目 → 比赛 → 重判 → 用户 → 判题 → 配置**（默认进入题目 Tab）。

## Capabilities

### New Capabilities

- `problem-tags`: 题目标签的存储、校验规则（长度/数量）及在导入导出 manifest 中的序列化约定。

### Modified Capabilities

- `problems`: 题目 ZIP 导出（含可选测试数据）、导入/导出 manifest 中的 `tags` 字段、管理端页面新建题目 API/UI。
- `auth-users`: 个人资料修改密码；管理员重置密码与「待重设 + 注册接管」流程。
- `admin-ops`: 管理后台 Tab 顺序与默认 Tab；用户重置密码二次确认；题目 Tab 新建入口。

## Impact

- **数据库**：`Problem` 与标签关联（新表或 JSON 字段）；`User` 增加 `mustResetPassword`（或等价）布尔字段。
- **API**：`GET /problems/:id/export`（或 `export.zip`）、`POST /problems` 管理创建；`PATCH /users/me/password`；`POST /admin/users/:id/reset-password`；`POST /auth/register` 行为扩展（待重设用户）。
- **Web**：`AdminProblemPanel`、`AdminUserPanel`、`ProfilePage`、`AdminPage` Tabs；`admin-url` 默认 Tab。
- **模板**：`problem.yaml` / 官方 import ZIP 示例增加 `tags` 字段说明。
