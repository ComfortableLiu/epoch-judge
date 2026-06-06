## Why

当前 `security.scanner.ts` 仅用正则匹配 5 个危险模式（`system()`、`child_process` 等），攻击者可通过 Base64 编码、字符串拼接、变量重命名等方式轻松绕过，沙箱安全形同虚设。

## What Changes

- 引入 TypeScript Compiler API 对提交代码进行 AST 级分析
- 检测危险函数调用（不限于字面量匹配，支持变量追踪）
- 检测 `eval()`、`Function()`、`require()`、`import()` 等动态执行
- 检测 `process`、`global`、`__dirname` 等全局对象访问
- 检测文件系统 / 网络相关模块导入（`fs`、`net`、`http`、`child_process`）
- 保留正则扫描作为快速预检，AST 分析作为深度扫描
- 扫描结果结构化输出（违规类型、行号、代码片段）

## Capabilities

### New Capabilities

- `ast-security-scanner`: 基于 AST 的代码安全扫描引擎，替代纯正则方案

### Modified Capabilities

（无现有 spec 需修改）

## Impact

- **代码**：`apps/api/src/problems/security.scanner.ts`（重写扫描逻辑）
- **依赖**：新增 `typescript`（项目已有，作为 Compiler API 使用）
- **性能**：AST 分析比正则慢约 10-50ms，对单次提交可接受
- **API**：扫描接口入参/出参不变，仅内部实现升级
