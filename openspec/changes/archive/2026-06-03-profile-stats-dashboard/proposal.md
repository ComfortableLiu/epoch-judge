## Why

个人资料页目前仅支持查看账号信息与修改昵称/密码，用户无法直观了解自己在平台上的练习与比赛成果。增加数据面板可帮助刷题用户复盘进度、对比通过率，并快速跳转到已通过题目或参与过的比赛。

## What Changes

- 在个人资料页新增「数据面板」区域（与现有资料编辑、改密分区并列），展示当前登录用户的聚合统计与可浏览列表。
- 新增 API `GET /users/me/stats`（或等价路径），返回练习与比赛维度的结构化统计数据。
- 统计维度（首版）包括但不限于：
  - **题目**：已通过题目数量；已通过题目列表（题号、标题、首次 AC 时间，可分页）；总体提交数；按终态分布（AC/WA/TLE 等）；练习通过率（定义见 design）。
  - **比赛**：参加过的比赛列表（比赛 ID、标题、时间范围、报名/参与状态）；各场比赛提交数或 AC 题数（若可算）。
- 数据面板支持从统计项跳转到题目详情、提交记录、比赛详情等已有页面。
- 中英文 i18n；仅本人可查看自己的面板数据（管理员不默认查看他人面板，除非后续单独需求）。

## Capabilities

### New Capabilities

- `user-profile-stats`: 用户个人练习与比赛统计的 API 契约、聚合规则与 Web 数据面板展示要求。

### Modified Capabilities

- `auth-users`: 扩展「用户资料」能力，要求个人资料页提供统计数据面板入口与只读展示。

## Impact

- **API**：`apps/api` 用户模块新增 stats 查询与聚合逻辑（基于 `Submission`、`Problem`、`Contest`、`ContestRegistration`）。
- **Web**：`ProfilePage` 或拆分子组件；Ant Design `Statistic` / `Table` / `Card` 布局；React Query 拉取 stats。
- **DB**：无必须 schema 变更；首版实时聚合查询，数据量大时再考虑缓存或物化（design 说明）。
- **性能**：需对 `userId` 索引友好查询，列表分页，避免全表扫描。
