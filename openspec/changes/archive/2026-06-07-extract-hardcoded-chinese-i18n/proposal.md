## Why

前端已支持 i18n（zh-CN / en-US），但部分页面存在大量硬编码中文文本，如 ContestDetailPage.tsx 中的"官方榜单"、"打星队伍"、"比赛密码"，以及管理后台中的各种文案。这导致切换语言后仍有中文显示，影响国际化体验。需要全面扫描并提取硬编码文本到 i18n 翻译文件，确保中英文双语完整覆盖。

## What Changes

- 扫描所有前端页面组件，识别硬编码的中文字符串
- 将硬编码中文提取到 i18n 翻译文件（zh-CN.json 和 en-US.json）
- 在组件中使用 i18n 的 t() 函数替代硬编码文本
- 确保所有页面在切换语言后完全显示目标语言
- 保持现有 i18n 架构和翻译文件结构不变

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `i18n-theme`: 补充现有规格，明确要求所有 UI 文本必须使用 i18n 翻译，禁止硬编码字符串

## Impact

- 影响代码：前端所有页面组件（src/pages/、src/components/）
- 影响翻译文件：src/locales/zh-CN.json、src/locales/en-US.json
- 影响用户体验：切换语言后页面完全翻译
- 依赖：无新增依赖
