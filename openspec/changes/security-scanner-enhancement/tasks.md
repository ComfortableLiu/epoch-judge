## 1. 依赖与类型准备

- [x] 1.1 将 `typescript` 从 `apps/api/package.json` 的 `devDependencies` 移至 `dependencies`
- [x] 1.2 定义 `ScanViolation` 和 `ScanResult` 类型接口（`type`、`line`、`column`、`snippet`、`rule` 字段）

## 2. 正则预检层重构

- [x] 2.1 将现有 `scanSourceCode` 中的正则逻辑提取为 `regexPreCheck(language, source): ScanViolation[]` 函数，返回违规数组而非单个标签
- [x] 2.2 保留并整理现有 5 条规则，确保每条规则的 `label` 对应结构化的违规类型

## 3. JavaScript AST 深度扫描器

- [x] 3.1 创建 `apps/api/src/judge/ast-scanner.ts`，实现 `astScan(source: string): ScanViolation[]` 函数，使用 `ts.createSourceFile` 解析 JavaScript 源码为 AST
- [x] 3.2 实现变量别名追踪：维护 `Map<string, string>` 映射，追踪 `const x = require('module')` 和 `const { fn } = require('module')` 的别名关系
- [x] 3.3 实现危险函数调用检测：遍历 `CallExpression` 节点，检查 `exec`、`spawn`、`execSync`、`spawnSync`、`eval`、`Function` 等函数调用（含通过别名调用）
- [x] 3.4 实现动态执行检测：检测 `eval()` 调用、`new Function()` 构造、`import()` 动态导入表达式
- [x] 3.5 实现全局对象访问检测：检测 `process`、`global`、`globalThis`、`__dirname`、`__filename` 的属性访问或方法调用
- [x] 3.6 实现受限模块导入检测：检测 `require('fs/net/http/child_process')` 和 `import ... from 'fs/net/http/child_process'` 语句
- [x] 3.7 为每个检测到的违规生成行号、列号和代码片段（从源码中截取对应行）

## 4. 扫描流程整合

- [x] 4.1 重构 `apps/api/src/judge/security.scanner.ts` 的 `scanSourceCode` 函数：先执行正则预检，命中则返回；对 JavaScript 语言执行 AST 深度扫描
- [x] 4.2 统一返回 `ScanResult` 对象（`blocked` + `violations`），替代原来的 `string | null`

## 5. 调用点适配

- [x] 5.1 修改 `apps/api/src/submissions/submissions.service.ts`：将 `scanSourceCode` 返回值检查从 `result !== null` 改为 `result.blocked`，并在日志中记录违规详情

## 6. 测试与验证

- [ ] 6.1 手动验证：简单正则可检测的模式（如直接 `require('fs')`）仍然被正则快速拦截
- [ ] 6.2 手动验证：变量别名绕过（如 `const cp = require('child_process'); cp.exec('...')`）被 AST 扫描检测
- [ ] 6.3 手动验证：动态执行（`eval()`、`new Function()`）被检测
- [ ] 6.4 手动验证：全局对象访问（`process.exit()`）被检测
- [ ] 6.5 手动验证：合法代码（纯算法解题）不被误报
- [ ] 6.6 手动验证：Python/Java/C/C++ 代码走正则路径，不触发 AST 扫描
