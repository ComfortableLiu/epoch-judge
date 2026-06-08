## Why

当前 `scoreboard()` 实现仅查询 `ACCEPTED` 状态的提交来计算罚时，这不符合 ACM 模式的标准规则。ACM 模式下，罚时应包含失败提交的贡献：每道题的罚时 = 首次通过时间 + 20分钟 × 该题之前的失败提交次数。现有实现遗漏了失败提交（WA、TLE 等），导致罚时计算不准确，排行榜排名失真。

## What Changes

- 修改 `scoreboard()` 函数，查询所有提交记录（包含 ACCEPTED、WRONG_ANSWER、TIME_LIMIT_EXCEEDED 等状态）
- 按用户和题目分组提交记录，统计每道题在首次 AC 前的失败提交次数
- 修正罚时计算公式：`penalty = first_ac_time + 20 * failed_count_before_ac`
- 保持 OI 模式计分逻辑不变

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `contests`: 更新计分板规格，明确 ACM 模式下罚时计算规则必须包含失败提交的贡献

## Impact

- 影响代码：`src/modules/contests/contests.service.ts` 中的 `scoreboard()` 方法
- 影响 API：`GET /contests/:id/scoreboard` 返回的罚时数据将更准确
- 影响前端：排行榜显示的罚时和排名可能发生变化
- 依赖：无新增依赖
