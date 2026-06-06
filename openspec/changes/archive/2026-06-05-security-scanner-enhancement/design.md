## Context

EpochJudge 当前的安全扫描器（`apps/api/src/judge/security.scanner.ts`）仅包含 5 条正则规则，按语言匹配 `child_process`、`require('fs')`、`os.system`、`subprocess`、`Runtime.getRuntime()`、`system(` 等字面量模式。攻击者可通过 Base64 编码、字符串拼接（`child_` + `process`）、变量重命名（`const cp = require('child_process')`）等方式轻松绕过，沙箱安全形同虚设。

现状关键点：
- 扫描器入口为 `scanSourceCode(language: string, source: string): string | null`，在 `submissions.service.ts:47` 调用，返回违规标签或 null。
- 支持的语言：`JAVASCRIPT`、`PYTHON`、`JAVA`、`C`、`CPP`（定义于 `@epoch-judge/shared` 的 `Language` 枚举）。
- `typescript` 已在 `apps/api/package.json` 的 devDependencies 中（`^5.7.3`），但需移至 dependencies 以在运行时可用。
- 提交频率受提交端点限流（10 次/分钟）约束，单次扫描增加 10-50ms 可接受。

## Goals / Non-Goals

**Goals:**
- 为 JavaScript 提供基于 TypeScript Compiler API 的 AST 级深度扫描，检测：危险函数调用（含变量追踪）、动态执行（eval/Function/require/import()）、全局对象访问（process/global/__dirname）、受限模块导入（fs/net/http/child_process）。
- 保留现有正则作为快速预检（所有语言），AST 作为 JavaScript 的深度扫描第二阶段。
- 扫描结果结构化输出：违规类型、行号、匹配代码片段。
- 扫描架构可扩展，便于后续为 Python/Java/C/C++ 添加 AST 分析。

**Non-Goals:**
- 不为 Python/Java/C/C++ 实现 AST 分析（这些语言在 Node.js 生态中缺乏成熟的 AST 库，且沙箱本身已通过 Docker cgroup/namespace 隔离）。
- 不实现污点追踪（taint analysis）或跨过程分析（inter-procedural analysis）——仅做单文件内分析。
- 不改变扫描接口的外部签名（`scanSourceCode` 仍为入口，返回值兼容）。
- 不拦截所有可能的恶意代码（AST 扫描是纵深防御的一层，不是唯一防线）。

## Decisions

### 决策 1：TypeScript Compiler API 作为 JavaScript AST 分析引擎
使用 TypeScript 内置的 Compiler API（`ts.createSourceFile`）解析 JavaScript 源码为 AST，遍历节点检测危险模式。
- **为什么**：TypeScript 已是项目依赖（devDependencies），零新依赖；Compiler API 稳定、性能好（单文件解析 <10ms）；能处理现代 JS 语法（ES2020+）。
- **替代方案**：`acorn`/`esprima`（需新增依赖，功能类似但生态更小）；`babel-parser`（同上，且 Babel 生态庞大但此处只需解析）。均被否决——TypeScript 已在项目中。

### 决策 2：两阶段扫描架构——正则预检 + AST 深度扫描
扫描流程分两阶段：
1. **快速预检（正则）**：对所有语言执行现有正则规则，命中即返回（<1ms）。
2. **深度扫描（AST）**：仅对 JavaScript，在正则未命中时执行 AST 遍历（~10-50ms）。
- **为什么**：正则对简单攻击模式（字面量匹配）极快，AST 对绕过模式（编码、拼接、重命名）有效；两阶段避免对非 JS 语言引入不必要的 AST 开销。
- **替代方案**：仅 AST（对 Python/Java/C/C++ 不可行）；仅增强正则（无法覆盖变量追踪）。均被否决。

### 决策 3：AST 检测规则分类
JavaScript AST 扫描检测以下四类违规：
1. **危险函数调用**：`exec`、`spawn`、`execSync`、`spawnSync`、`eval`、`Function`（构造器）。追踪变量声明，若 `const x = require('child_process'); x.exec(...)` 也能检测。
2. **动态执行**：`eval()`、`new Function()`、`import()`（动态导入）。
3. **全局对象访问**：`process`、`global`、`globalThis`、`__dirname`、`__filename`。
4. **受限模块导入**：`require('fs')`、`require('net')`、`require('http')`、`require('child_process')` 等，以及对应的 `import ... from 'fs'` 语法。
- **为什么**：覆盖提案中列出的所有攻击向量；分类便于结构化输出和后续规则扩展。

### 决策 4：变量追踪——简单别名映射
在 AST 遍历中维护一个 `Map<string, string>` 映射（变量名 → 原始模块/函数名）。例如 `const cp = require('child_process')` 将 `cp` 映射为 `child_process`，后续 `cp.exec(...)` 被识别为危险调用。
- **为什么**：覆盖最常见的绕过方式（变量别名），实现简单（仅追踪顶层 const/let/var 声明）。
- **限制**：不追踪跨函数传递、对象属性解构等复杂场景——这些属于完整污点分析范畴，超出本变更范围。

### 决策 5：`typescript` 从 devDependencies 移至 dependencies
`typescript` 当前在 `apps/api/package.json` 的 devDependencies 中，需移至 dependencies 以确保运行时可用。
- **为什么**：Compiler API 在运行时调用，devDependencies 在 `yarn install --production` 时不安装。
- **替代方案**：使用 `@typescript/vfs` 或单独安装 `typescript` 的运行时子集——不存在此类包。或使用 `acorn` 替代（需新依赖）。均被否决。

### 决策 6：结构化扫描结果
将 `scanSourceCode` 返回值从 `string | null` 改为 `ScanResult` 对象，包含 `blocked: boolean`、`violations: Array<{type, line, column, snippet, rule}>`。上层调用点适配：检查 `result.blocked` 而非 `result !== null`。
- **为什么**：结构化输出便于日志记录、前端展示违规详情、后续扩展（如警告 vs 拦截）。
- **兼容性**：调用点仅 `submissions.service.ts:47` 一处，改动量小。

## Risks / Trade-offs

- **TypeScript Compiler API 体积大（~10MB）** → 已在 devDependencies 中，移至 dependencies 增加打包体积但零新依赖；可通过 tree-shaking 优化（但 Compiler API 难以 tree-shake）。
- **变量追踪仅覆盖简单别名** → 覆盖最常见的绕过方式；更复杂的攻击（多层传递、动态属性访问）需依赖沙箱隔离作为最终防线。
- **AST 扫描增加延迟（~10-50ms）** → 仅对 JavaScript 且仅在正则未命中时执行；受提交限流约束（10 次/分钟），对用户体验无感知影响。
- **正则规则与 AST 规则可能存在重复检测** → 正则作为快速路径，AST 作为补充；重复检测不影响正确性，仅微增开销。
