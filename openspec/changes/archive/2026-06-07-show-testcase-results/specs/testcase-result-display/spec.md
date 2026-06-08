## ADDED Requirements

### Requirement: 后端 API 返回测例错误信息和编号

`GET /submissions/:number` 返回的 `testcaseResults` 数组中每个元素需包含：
- `message`: string | null — 测例级别的错误信息（如运行时错误输出、编译错误信息等）
- `testcase.ordinal`: number — 测例在题目中的编号（从 1 开始）

#### Scenario: OI 模式提交详情包含完整测例信息
- **WHEN** 请求 OI 模式提交的详情
- **THEN** 返回的 `testcaseResults` 每个元素包含 `verdict`、`score`、`timeMs`、`memoryKb`、`message`、`testcase.ordinal`、`testcase.isSample`

#### Scenario: ACM 模式提交详情包含测例信息
- **WHEN** 请求 ACM 模式提交的详情
- **THEN** 返回的 `testcaseResults` 包含所有已评判测例的信息（含 SKIPPED 状态的测例）

### Requirement: OI 模式展示全部测例结果

在 `SubmissionDetailPage` 中，当 `judgeMode === 'OI'` 且提交已终态时，展示一个测例结果表格。

#### Scenario: OI 模式展示所有测例
- **WHEN** 查看 OI 模式已终结提交的详情页
- **THEN** 页面展示一个表格，包含所有测例的逐条结果
- **AND** 表格列包括：测例编号、判定结果、运行时间、内存占用、错误信息

#### Scenario: 样例测例有视觉区分
- **WHEN** 测例的 `testcase.isSample === true`
- **THEN** 该行有视觉标识（如"样例"标签或不同背景色）

### Requirement: ACM 模式仅展示首个失败测例

在 `SubmissionDetailPage` 中，当 `judgeMode === 'ACM'` 且提交已终态时，仅展示第一个非 ACCEPTED 状态的测例。

#### Scenario: ACM 模式有失败测例
- **WHEN** 查看 ACM 模式已终结且非 ACCEPTED 的提交详情页
- **THEN** 页面仅展示第一个非 ACCEPTED 测例的结果

#### Scenario: ACM 模式全部通过
- **WHEN** 查看 ACM 模式已终结且 ACCEPTED 的提交详情页
- **THEN** 不展示测例结果表格（或展示为空）

### Requirement: 判定结果标签使用颜色区分

测例的判定结果使用 Ant Design `Tag` 组件展示，颜色与提交状态颜色一致。

#### Scenario: ACCEPTED 测例显示绿色标签
- **WHEN** 测例 verdict 为 ACCEPTED
- **THEN** 显示绿色（success）标签

#### Scenario: 非 ACCEPTED 测例显示对应颜色标签
- **WHEN** 测例 verdict 为 WRONG_ANSWER
- **THEN** 显示红色（error）标签
- **WHEN** 测例 verdict 为 TIME_LIMIT_EXCEEDED / MEMORY_LIMIT_EXCEEDED / RUNTIME_ERROR
- **THEN** 显示橙色（warning）标签

### Requirement: 国际化支持

新增的 UI 文本需支持中英文。

#### Scenario: 中文环境
- **WHEN** 用户语言为中文
- **THEN** 测例结果表格的列标题和标签显示中文

#### Scenario: 英文环境
- **WHEN** 用户语言为英文
- **THEN** 测例结果表格的列标题和标签显示英文
