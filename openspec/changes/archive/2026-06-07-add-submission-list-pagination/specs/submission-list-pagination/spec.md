## ADDED Requirements

### Requirement: Submission list pagination API

提交列表 API SHALL 支持分页查询，接受 `page` 和 `limit` 查询参数，返回分页数据和总数。

#### Scenario: Default pagination

- **WHEN** 用户请求提交列表且未指定分页参数
- **THEN** API 返回第 1 页，每页 20 条记录，包含总数和总页数

#### Scenario: Custom page and limit

- **WHEN** 用户请求 `?page=2&limit=10`
- **THEN** API 返回第 2 页的 10 条记录，包含正确的分页元数据

#### Scenario: Page exceeds total pages

- **WHEN** 用户请求的页码超过总页数
- **THEN** API 返回空数据数组，分页元数据中的 `page` 为请求的页码

#### Scenario: Invalid pagination parameters

- **WHEN** 用户请求 `?page=0` 或 `?limit=-1` 或 `?limit=101`
- **THEN** API 返回 400 错误，提示参数无效

### Requirement: Pagination response format

API 响应 SHALL 包含标准化的分页元数据，包括总数、当前页、每页条数和总页数。

#### Scenario: Response structure

- **WHEN** API 返回分页数据
- **THEN** 响应格式为 `{ data: [...], pagination: { total, page, limit, totalPages } }`

#### Scenario: Total count accuracy

- **WHEN** 用户有 N 条提交记录
- **THEN** `pagination.total` 返回准确的 N 值

### Requirement: Frontend pagination component

前端提交列表页面 SHALL 显示分页控件，支持翻页和每页条数选择。

#### Scenario: Pagination controls visible

- **WHEN** 用户查看提交列表页面
- **THEN** 列表底部显示分页组件，包含页码导航和每页条数选择器

#### Scenario: Navigate to specific page

- **WHEN** 用户点击页码或使用页码跳转
- **THEN** 列表更新为对应页的数据，URL 可选同步更新

#### Scenario: Change page size

- **WHEN** 用户通过下拉菜单选择每页条数（如 10, 20, 50）
- **THEN** 列表重新加载，显示第 1 页，每页条数为用户选择的值

#### Scenario: Loading state during pagination

- **WHEN** 用户翻页时数据正在加载
- **THEN** 显示加载状态（如 skeleton 或 spinner），避免页面闪烁
