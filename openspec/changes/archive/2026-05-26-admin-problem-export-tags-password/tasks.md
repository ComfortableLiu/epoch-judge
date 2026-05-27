## 1. 数据库与共享校验

- [x] 1.1 Prisma：`User.mustResetPassword`；`Problem.tags` JSON 默认 `[]`
- [x] 1.2 迁移 + `packages/shared` 实现 `normalizeProblemTags()`（≤5 个、每标签 1–10 字符、trim、去重）
- [x] 1.3 更新 `problem-import.zip` 模板与 `docs/developer.md` 中 `tags`、导出说明

## 2. 题目标签与 CRUD API

- [x] 2.1 `POST /problems` 管理端创建；`PATCH`/`import`/`export` 读写 `tags`
- [x] 2.2 导入 ZIP 解析 `problem.yaml` 的 `tags` 并校验
- [x] 2.3 `GET /problems/:id/export?testdata=` 生成与导入布局一致的 ZIP（含/不含 testdata）
- [x] 2.4 抽取 `buildProblemZip` / 与 `importFromManifest` 共用 YAML 字段

## 3. 账号密码

- [x] 3.1 `PATCH /users/me/password`（校验旧密码）
- [x] 3.2 `POST /admin/users/:id/reset-password`（置 `mustResetPassword`、不可登录哈希）
- [x] 3.3 `POST /auth/register` 支持待重设用户接管；登录拒绝 `mustResetPassword` 用户并提示
- [x] 3.4 i18n 文案（改密、重置、注册接管、登录被拒）

## 4. 管理后台 Web

- [x] 4.1 `admin-url` / `AdminPage`：Tab 顺序 **题目→比赛→重判→用户→判题→配置**，默认 `problems`
- [x] 4.2 `AdminProblemPanel`：新建题目按钮 + 创建表单；编辑/创建表单标签输入（Select tags 模式，≤5）
- [x] 4.3 `AdminProblemPanel`：导出按钮 + 是否包含测试数据确认/选项
- [x] 4.4 `AdminUserPanel`：重置密码 + `Modal.confirm` 二次确认
- [x] 4.5 `ProfilePage`：修改密码表单

## 5. 验收

- [x] 5.1 导出含/不含 testdata 的 ZIP 可再导入；标签 round-trip
- [x] 5.2 管理员重置后用户用原用户名注册设新密码可登录；重置前登录失败
- [x] 5.3 `yarn build` 通过；冒烟：新建题、改密、Tab 默认与顺序
