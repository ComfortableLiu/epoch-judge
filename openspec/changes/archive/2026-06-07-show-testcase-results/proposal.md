## Why

OI 模式下测例结果已记录在 `SubmissionTestcaseResult` 表中，后端 API 也已返回完整的 `testcaseResults` 数组，但前端提交详情页（`SubmissionDetailPage`）仅展示汇总信息（总分、最长运行时间、最高内存占用），用户看不到每个测例的详细结果。ACM 模式同理——用户只知道"通过/未通过"，不知道哪个测例失败、失败原因是什么。

需要在提交详情页逐测例展示结果，让用户能快速定位问题。

## What Changes

在 `SubmissionDetailPage` 中新增一个测例结果列表/表格组件：

- **OI 模式**：展示所有测例的详细结果（测例编号、判定结果、运行时间、内存占用、错误信息）
- **ACM 模式**：只展示第一个失败测例（如有），因为 ACM 模式下后续测例被跳过（SKIPPED）

后端 API 已返回所需数据（`verdict`、`score`、`timeMs`、`memoryKb`、`testcase.isSample`），但缺少 `message`（错误信息）和 `testcase.ordinal`（测例编号）。需要补充这两个字段。

## Capabilities

### New Capabilities
- `testcase-result-display`: 在提交详情页逐测例展示判定结果，OI 显示全部、ACM 仅显示首个失败测例

### Modified Capabilities

## Impact

- **前端**：`SubmissionDetailPage.tsx` — 新增测例结果表格组件；`submission-detail-stats.ts` — 可能需要新增辅助函数
- **后端**：`submissions.service.ts` — `getDetailByNumber` 返回的 `testcaseResults` 需补充 `message` 和 `testcase.ordinal` 字段
- **i18n**：`zh-CN.json`、`en-US.json` — 新增测例结果相关翻译键
