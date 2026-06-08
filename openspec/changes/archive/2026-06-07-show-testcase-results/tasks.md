## 1. 后端 API 补充字段

- [x] 1.1 在 `submissions.service.ts` 的 `getDetailByNumber` 返回映射中，补充 `message` 字段（从 `SubmissionTestcaseResult.message`）
- [x] 1.2 在返回映射中，补充 `testcase.ordinal` 字段（从 `ProblemTestcase.ordinal`）

## 2. 前端类型与 i18n

- [x] 2.1 更新 `SubmissionDetailPage.tsx` 中 `SubmissionDetail` 类型定义，`testcaseResults` 元素新增 `message: string | null` 和 `testcase.ordinal: number`
- [x] 2.2 在 `zh-CN.json` 的 `submissions` 命名空间下新增测例结果相关翻译键（testcaseNumber、testcaseVerdict、testcaseTime、testcaseMemory、testcaseMessage、testcaseSample）
- [x] 2.3 在 `en-US.json` 的 `submissions` 命名空间下新增对应英文翻译键

## 3. 前端测例结果表格组件

- [x] 3.1 在 `SubmissionDetailPage.tsx` 中新增 `TestcaseResultTable` 组件：使用 Ant Design `Table`，列包括测例编号、判定结果（Tag）、运行时间、内存占用、错误信息
- [x] 3.2 实现 OI/ACM 模式数据过滤逻辑：OI 显示全部测例，ACM 仅保留首个非 ACCEPTED 测例
- [x] 3.3 样例测例行添加视觉标识（"样例" Tag）
- [x] 3.4 判定结果列复用 `submissionStatusColor` 函数为 Tag 着色

## 4. 集成到提交详情页

- [x] 4.1 在 `SubmissionDetailPage` 的结果展示区域（`!judging && data` 分支）中插入 `TestcaseResultTable` 组件
- [x] 4.2 仅在提交已终态时展示测例结果表格
