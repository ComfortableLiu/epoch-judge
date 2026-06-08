## Context

当前 `SubmissionDetailPage` 已从 API 获取完整的 `testcaseResults` 数组，但仅用其计算聚合统计（`maxRuntimeStats`、`formatOiScore`）。`SubmissionTestcaseResult` 模型包含 `verdict`、`score`、`timeMs`、`memoryKb`、`message` 字段，`ProblemTestcase` 包含 `ordinal`（测例编号）和 `isSample`（是否样例）字段。

后端 `getDetailByNumber` 已 include `testcase: true`，但返回映射时丢弃了 `message` 和 `testcase.ordinal`。

ACM 模式下，评判在首个失败测例后停止，后续测例状态为 `SKIPPED`。

## Goals / Non-Goals

**Goals:**
- OI 模式：展示所有测例的逐条结果表格
- ACM 模式：仅展示第一个失败测例（如有）
- 表格列：测例编号、判定结果（带颜色标签）、运行时间、内存占用、错误信息
- 样例测例（`isSample`）需有视觉区分
- 判定结果使用 Ant Design `Tag` 组件，复用 `submissionStatusColor` 的配色逻辑

**Non-Goals:**
- 不修改评判逻辑
- 不修改 ACM/OI 模式切换逻辑
- 不在提交列表页（`SubmissionsPage`）展示逐测例结果

## Decisions

1. **ACM 模式仅显示首个失败测例**：ACM 评判在首个失败后停止，后续测例为 SKIPPED 状态，展示它们没有意义且可能造成困惑。只展示首个失败测例即可帮助用户定位问题。

2. **后端补充 `message` 和 `ordinal`**：当前返回映射已包含 `verdict`、`score`、`timeMs`、`memoryKb`、`testcaseId`、`testcase.isSample`。需补充 `message`（错误信息，如 RE/WA 的详情）和 `testcase.ordinal`（测例编号，用于展示 "#1"、"#2" 等）。

3. **前端新增 `TestcaseResultTable` 组件**：内联在 `SubmissionDetailPage.tsx` 中，使用 Ant Design `Table` 组件。根据 `judgeMode` 过滤数据：OI 显示全部，ACM 只保留首个非 ACCEPTED 的测例。

4. **判定结果标签复用 `submissionStatusColor`**：`TestcaseVerdict` 枚举值与 `SubmissionStatus` 枚举值命名一致（ACCEPTED、WRONG_ANSWER 等），可直接复用现有配色函数。

5. **i18n 键名放在 `submissions` 命名空间下**：如 `submissions.testcaseNumber`、`submissions.testcaseVerdict` 等，保持与现有翻译结构一致。

## Risks / Trade-offs

- **ACM 模式下信息量有限**：只显示首个失败测例，用户无法看到后续被跳过的测例。这是有意为之——ACM 模式的语义就是"首个失败即终止"。
- **`message` 字段可能为 null**：并非所有测例都有错误信息（如 ACCEPTED），需做好空值处理。
