## ADDED Requirements

### Requirement: Two-stage scanning architecture

The system SHALL perform security scanning in two stages: a fast regex pre-check for all languages, followed by an AST-based deep scan for JavaScript when the regex pre-check does not find violations.

#### Scenario: Regex pre-check catches simple pattern

- **WHEN** submitted source code contains a literal forbidden pattern (e.g., `require('fs')`) matching an existing regex rule
- **THEN** the system returns the violation immediately without running AST analysis

#### Scenario: Regex passes, AST scans JavaScript

- **WHEN** submitted JavaScript source code passes the regex pre-check
- **THEN** the system performs AST-level analysis to detect obfuscated or variable-aliased violations

#### Scenario: Non-JavaScript language with regex pass

- **WHEN** submitted source code in Python, Java, C, or C++ passes the regex pre-check
- **THEN** the system does not perform AST analysis and allows the submission

### Requirement: Detect dangerous function calls via AST

The system SHALL detect calls to dangerous functions in JavaScript source code by analyzing the AST, including functions accessed through variable aliases.

#### Scenario: Direct dangerous function call

- **WHEN** JavaScript source contains `exec('rm -rf /')` or similar dangerous function calls
- **THEN** the system reports a violation with the function name, line number, and code snippet

#### Scenario: Dangerous call via variable alias

- **WHEN** JavaScript source declares `const cp = require('child_process')` and later calls `cp.exec('...')`
- **THEN** the system traces the variable alias and reports the violation

#### Scenario: Dangerous call via destructuring

- **WHEN** JavaScript source uses `const { exec } = require('child_process'); exec('...')`
- **THEN** the system detects the destructured import and reports the violation

### Requirement: Detect dynamic execution via AST

The system SHALL detect dynamic code execution patterns in JavaScript source code.

#### Scenario: eval() call detected

- **WHEN** JavaScript source contains a call to `eval()`
- **THEN** the system reports a violation

#### Scenario: Function constructor detected

- **WHEN** JavaScript source contains `new Function('...')`
- **THEN** the system reports a violation

#### Scenario: Dynamic import detected

- **WHEN** JavaScript source contains `import('fs')` (dynamic import expression)
- **THEN** the system reports a violation

### Requirement: Detect global object access via AST

The system SHALL detect access to restricted global objects in JavaScript source code.

#### Scenario: process object accessed

- **WHEN** JavaScript source accesses `process.env`, `process.exit()`, or any `process` property
- **THEN** the system reports a violation

#### Scenario: global/globalThis object accessed

- **WHEN** JavaScript source accesses `global` or `globalThis` objects
- **THEN** the system reports a violation

#### Scenario: __dirname/__filename accessed

- **WHEN** JavaScript source references `__dirname` or `__filename`
- **THEN** the system reports a violation

### Requirement: Detect restricted module imports via AST

The system SHALL detect imports of restricted modules in JavaScript source code via both `require()` and `import` statements.

#### Scenario: require() with restricted module

- **WHEN** JavaScript source contains `require('fs')`, `require('net')`, `require('http')`, or `require('child_process')`
- **THEN** the system reports a violation with the module name

#### Scenario: import statement with restricted module

- **WHEN** JavaScript source contains `import fs from 'fs'` or `import { readFile } from 'fs'`
- **THEN** the system reports a violation with the module name

### Requirement: Structured scan output

The system SHALL return structured scan results including violation type, line number, column number, and code snippet.

#### Scenario: Scan result with violations

- **WHEN** the scanner detects one or more violations
- **THEN** the result object contains `blocked: true` and a `violations` array with each violation's `type`, `line`, `column`, `snippet`, and `rule` fields

#### Scenario: Clean scan result

- **WHEN** the scanner detects no violations
- **THEN** the result object contains `blocked: false` and an empty `violations` array

### Requirement: Backward-compatible scan interface

The system SHALL maintain the existing `scanSourceCode(language, source)` function signature, with the return value adapted to the new structured format.

#### Scenario: Existing caller adapted

- **WHEN** `submissions.service.ts` calls `scanSourceCode()`
- **THEN** it checks `result.blocked` to determine whether to reject the submission, maintaining the same user-facing behavior
