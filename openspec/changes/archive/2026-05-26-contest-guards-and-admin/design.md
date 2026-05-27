## Context

- `Problem` 仅有 `PUBLIC`/`PRIVATE`，默认 `PUBLIC`，无创建者字段；鉴权在 `problems.service` 以 `visibility` + `isStaff` 判断。
- `Contest` 使用 `cuid` 主键 + 唯一 `slug`；前台路由 `/contests/:slug`。
- 管理端 `AdminContestPanel` 要求手填 slug，结束/封榜为绝对 `DatePicker`，题目为多选 `Select`。
- 比赛准入仅有 `ContestVisibility`（PUBLIC/PRIVATE）与报名，无密码。

## Goals / Non-Goals

**Goals:**

- 实现题目「默认私有 + 比赛期防泄露 + 比赛内可见」的统一鉴权层。
- 比赛对外标识改为自增数字；去掉 slug 与表单 Slug 字段。
- 管理端比赛时间/封榜/题目列表 UX 按产品要求落地。
- 比赛支持明文密码准入（用户明确要求明文存储）。

**Non-Goals:**

- 密码哈希、邀请码、团队赛、题目在比赛外的「结束后自动公开」以外的复杂策略（除非 spec 已写明：比赛结束后恢复按 `visibility` 全局可见）。
- 题目 slug 体系变更。
- 非管理端比赛题目的内联 CRUD（比赛题目仍引用已有题库题目，不在此变更新建题面编辑器）。

## Decisions

### 1. 题目可见性：集中式 `ProblemAccessService`

在 API 层新增服务，所有「能否查看题面/元数据」路径统一调用：

| 调用方 | `context` |
|--------|-----------|
| `GET /problems`、`GET /problems/:slug` | 无 |
| `GET /contests/:id` 内嵌题目 | `{ contestId }` |
| 提交页 `submit-context` | `{ contestId? }` |

判定顺序（先满足即通过）：

1. **Staff**：`ADMIN` 或 `PROBLEM_EDITOR`（与现有 `isStaff` 一致）。
2. **创建者**：`problem.createdById === user.id`。
3. **比赛内**：`context.contestId` 存在，用户满足该比赛准入（已报名或 PUBLIC 且已注册规则不变），且题目属于该比赛的 `ContestProblem`。
4. **比赛未结束锁**：若存在任意 `endAt > now()` 的比赛关联该题 → **拒绝**全局浏览（无 `contestId` 时）。
5. **可见性枚举**：`PUBLIC` 允许；`PRIVATE` 拒绝（非 staff/创建者）。

新建/导入题目：`visibility` 默认 `PRIVATE`，`createdById` 设为当前用户（管理员代建时记操作者）。

**备选**：在各 controller 复制 if —— 否决，易漏路径。

### 2. 比赛数字 ID

- 在 `Contest` 增加 `number Int @unique @default(autoincrement())`（对外 ID），**保留** `id`（cuid）作外键，避免迁移所有 `contestId` 引用。
- 移除 `slug` 列；API/前端路径改为 `/contests/:number`（参数名可仍叫 `id` 但值为数字）。
- 列表与详情返回 `number` 作为主展示 ID；内部提交仍可用 cuid `contestId` 查询参数（或统一改为 number，设计任务中二选一并全局替换，**推荐**对外 API 查询参数也用 `contestNumber` 或数字 `contestId` 指 number，减少双 ID 困惑）。

**迁移**：删除 slug 前，若有种子数据，用 `number` 即可；无 slug 兼容期（**BREAKING** 一次切换）。

### 3. 比赛密码

- `Contest.accessPassword String?`（`null` 表示无密码）。
- `POST /contests/:number/verify-password` body `{ password }` → 成功则写入 `ContestRegistration` 或独立表 `contest_password_verified`（在 registration 上增加 `passwordOk Boolean` 更简单）。
- 明文比较（用户要求）；仅 HTTPS 部署建议写入运维文档，不作代码层加密。
- 进入比赛详情、提交、榜单前 middleware/guard 检查（管理员跳过）。

### 4. 管理端时间表单（前端状态机）

- **开始**：`DatePicker` `showTime` 且 `format` 到分钟（秒归零）。
- **结束**：双控件绑定同一 `endAt`：
  - **相对**：`InputNumber` + `Select`（分钟/小时），`endAt = startAt + duration`。
  - **绝对**：`DatePicker`（分钟精度）；任一变更同步另一侧。
  - 默认：`duration = 3h`。
- **封榜**：相对结束，`freezeAt = endAt - offset`；清空 offset 则 `freezeAt = null`。
- 提交 API 仍传 ISO `startAt`/`endAt`/`freezeAt`（服务端存 UTC）。

### 5. 比赛题目列表 UI

- 使用 `@dnd-kit` 或 Ant Design `Table` + 现有项目依赖：优先 **antd Table row drag** 或轻量 `@dnd-kit/sortable`（若已存在则复用）。
- 每行：题目标题、slug 链接、移除按钮；底部「添加题目」打开 `Select` 或搜索 Modal。
- 保存时 `problemIds: string[]` 顺序即 ordinal/label。

### 6. Slug 字段移除

- 新建比赛 Modal **删除** Slug `Form.Item`；列表列改为「ID」显示 `number`。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 双 ID（cuid + number）混淆 | API 文档与类型命名统一；对外仅暴露 number |
| 比赛期锁导致 PUBLIC 题在题库不可见 | 符合需求；比赛内链接仍可访问 |
| 明文密码泄露 | 管理端标注「明文存储」；部署强制 HTTPS |
| slug 移除破坏书签 | 发布说明 BREAKING；无 slug 重定向 |
| 创建者字段历史题为 null | 迁移：`createdById` 可空，null 时仅 staff 可维护；列表过滤保守 |

## Migration Plan

1. Prisma 迁移：`Problem.createdById`、`Contest.number`、`Contest.accessPassword`、drop `Contest.slug`。
2. 部署 API → 跑 migrate → 部署 Web。
3. 全局搜索替换 `/contests/${slug}` → `/contests/${number}`。
4. 冒烟：新建私有题、绑比赛、非参赛者不可见、参赛者比赛内可见、密码赛、管理端表单。

## Open Questions

- 对外提交参数 `contestId` 是否改为数字 number（推荐 yes，与 URL 一致）。
- `PROBLEM_EDITOR` 是否视为「管理员级可见」——当前按 staff 处理；若需仅 ADMIN，spec 已写管理员，实现时 ADMIN + 创建者，EDITOR 仅 staff 编辑权限可见所有题（与现网一致）。
