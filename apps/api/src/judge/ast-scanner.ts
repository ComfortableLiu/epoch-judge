/**
 * AST-level security scanner for JavaScript source code.
 * Uses TypeScript Compiler API to parse and traverse the AST,
 * detecting obfuscated attacks that bypass regex checks.
 */

import ts from 'typescript';
import type { ScanViolation, ViolationType } from './security.scanner';

/** Restricted modules that must not be imported */
const RESTRICTED_MODULES = new Set([
  'fs',
  'net',
  'http',
  'https',
  'child_process',
  'dgram',
  'cluster',
  'worker_threads',
  'vm',
]);

/** Dangerous function names that must not be called */
const DANGEROUS_FUNCTIONS = new Set([
  'exec',
  'execSync',
  'spawn',
  'spawnSync',
  'execFile',
  'execFileSync',
]);

/** Global objects that must not be accessed */
const RESTRICTED_GLOBALS = new Set([
  'process',
  'global',
  'globalThis',
  '__dirname',
  '__filename',
]);

function getLineInfo(
  source: string,
  node: ts.Node,
): { line: number; column: number; snippet: string } {
  const sourceFile = node.getSourceFile();
  const start = node.getStart(sourceFile);
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
  const lines = source.split('\n');
  const snippet = lines[line] ?? '';
  return { line: line + 1, column: character + 1, snippet };
}

function makeViolation(
  source: string,
  node: ts.Node,
  type: ViolationType,
  rule: string,
): ScanViolation {
  const { line, column, snippet } = getLineInfo(source, node);
  return { type, line, column, snippet, rule };
}

/**
 * Track variable aliases from require() calls.
 * Maps variable name → module name.
 * e.g., `const cp = require('child_process')` → cp → child_process
 */
function buildAliasMap(sourceFile: ts.SourceFile): Map<string, string> {
  const aliases = new Map<string, string>();

  function visit(node: ts.Node) {
    // const x = require('module')
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          ts.isCallExpression(decl.initializer) &&
          ts.isIdentifier(decl.initializer.expression) &&
          decl.initializer.expression.text === 'require' &&
          decl.initializer.arguments.length >= 1 &&
          ts.isStringLiteral(decl.initializer.arguments[0])
        ) {
          aliases.set(decl.name.text, decl.initializer.arguments[0].text);
        }

        // const { exec, spawn } = require('module')
        if (
          ts.isObjectBindingPattern(decl.name) &&
          decl.initializer &&
          ts.isCallExpression(decl.initializer) &&
          ts.isIdentifier(decl.initializer.expression) &&
          decl.initializer.expression.text === 'require' &&
          decl.initializer.arguments.length >= 1 &&
          ts.isStringLiteral(decl.initializer.arguments[0])
        ) {
          const moduleName = decl.initializer.arguments[0].text;
          for (const element of decl.name.elements) {
            if (ts.isIdentifier(element.name)) {
              // Map destructured function name to "module:function"
              aliases.set(element.name.text, `${moduleName}:${element.name.text}`);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return aliases;
}

export function astScan(source: string): ScanViolation[] {
  const violations: ScanViolation[] = [];
  const sourceFile = ts.createSourceFile(
    'input.js',
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.JS,
  );

  const aliases = buildAliasMap(sourceFile);

  function visit(node: ts.Node) {
    // 1. Restricted module imports: require('fs') or import ... from 'fs'
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length >= 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const moduleName = node.arguments[0].text;
      if (RESTRICTED_MODULES.has(moduleName)) {
        violations.push(
          makeViolation(source, node, 'restricted-import', `require('${moduleName}')`),
        );
      }
    }

    // import ... from 'module'
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleName = node.moduleSpecifier.text;
      if (RESTRICTED_MODULES.has(moduleName)) {
        violations.push(
          makeViolation(source, node, 'restricted-import', `import from '${moduleName}'`),
        );
      }
    }

    // 2. Dynamic import()
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      violations.push(
        makeViolation(source, node, 'dynamic-exec', 'import()'),
      );
    }

    // 3. eval() calls
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'eval'
    ) {
      violations.push(
        makeViolation(source, node, 'dynamic-exec', 'eval()'),
      );
    }

    // 4. new Function() — dynamic code execution
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Function'
    ) {
      violations.push(
        makeViolation(source, node, 'dynamic-exec', 'new Function()'),
      );
    }

    // 5. Dangerous function calls: exec(), spawn(), etc.
    if (ts.isCallExpression(node)) {
      let funcName: string | undefined;
      let isAliased = false;

      // Direct call: exec(...)
      if (ts.isIdentifier(node.expression)) {
        funcName = node.expression.text;
      }

      // Property call: cp.exec(...) or child_process.exec(...)
      if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) {
        const propName = node.expression.name.text;

        // Check if the object is a known alias
        if (ts.isIdentifier(node.expression.expression)) {
          const objName = node.expression.expression.text;
          const aliasTarget = aliases.get(objName);
          if (aliasTarget) {
            // aliasTarget could be 'child_process' or 'child_process:exec'
            if (RESTRICTED_MODULES.has(aliasTarget) || aliasTarget.includes(':')) {
              isAliased = true;
              funcName = propName;
            }
          }
          // Also check direct module access: child_process.exec(...)
          if (RESTRICTED_MODULES.has(objName)) {
            isAliased = true;
            funcName = propName;
          }
        }

        if (!funcName) {
          funcName = propName;
        }
      }

      if (funcName && DANGEROUS_FUNCTIONS.has(funcName)) {
        // Check if it's a known safe usage (e.g., RegExp.exec)
        // Only flag if it's a direct call or aliased from a restricted module
        if (isAliased || !isPropertyCallOnSafeObject(node)) {
          violations.push(
            makeViolation(source, node, 'dangerous-call', funcName),
          );
        }
      }
    }

    // 6. Global object access: process.exit(), global.x, __dirname, __filename
    if (ts.isPropertyAccessExpression(node)) {
      if (ts.isIdentifier(node.expression) && RESTRICTED_GLOBALS.has(node.expression.text)) {
        violations.push(
          makeViolation(source, node, 'global-access', node.expression.text),
        );
      }
    }

    // Direct reference to __dirname, __filename (not as property access)
    if (ts.isIdentifier(node) && (node.text === '__dirname' || node.text === '__filename')) {
      // Only flag if it's not part of a property access (those are caught above)
      if (!ts.isPropertyAccessExpression(node.parent)) {
        violations.push(
          makeViolation(source, node, 'global-access', node.text),
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

/**
 * Heuristic: check if the call is on a safe object (like RegExp, Array, etc.)
 * to avoid false positives for methods like arr.exec() or regex.exec().
 */
function isPropertyCallOnSafeObject(node: ts.CallExpression): boolean {
  if (!ts.isPropertyAccessExpression(node.expression)) return false;
  const obj = node.expression.expression;

  // String literal method calls: 'hello'.match(...)
  if (ts.isStringLiteral(obj) || ts.isNoSubstitutionTemplateLiteral(obj)) return true;

  // Numeric literal: (0).toString()
  if (ts.isNumericLiteral(obj)) return true;

  // Array/object literal methods: [].push(...)
  if (ts.isArrayLiteralExpression(obj)) return true;
  if (ts.isObjectLiteralExpression(obj)) return true;

  // Regex literal: /pattern/.exec(...)
  if (ts.isRegularExpressionLiteral(obj)) return true;

  return false;
}
