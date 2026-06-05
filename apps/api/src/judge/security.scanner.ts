export type ViolationType =
  | 'dangerous-call'
  | 'dynamic-exec'
  | 'global-access'
  | 'restricted-import'
  | 'regex-match';

export interface ScanViolation {
  type: ViolationType;
  line: number;
  column: number;
  snippet: string;
  rule: string;
}

export interface ScanResult {
  blocked: boolean;
  violations: ScanViolation[];
}

const FORBIDDEN_PATTERNS: {
  lang: string;
  pattern: RegExp;
  label: string;
  type: ViolationType;
}[] = [
  {
    lang: 'JAVASCRIPT',
    pattern: /child_process|require\s*\(\s*['"]fs['"]\)/,
    label: 'nodejs-forbidden',
    type: 'restricted-import',
  },
  {
    lang: 'PYTHON',
    pattern: /\bos\.system\b|\bsubprocess\b/,
    label: 'python-forbidden',
    type: 'dangerous-call',
  },
  {
    lang: 'JAVA',
    pattern: /Runtime\.getRuntime\(\)/,
    label: 'java-forbidden',
    type: 'dangerous-call',
  },
  { lang: 'C', pattern: /\bsystem\s*\(/, label: 'c-forbidden', type: 'dangerous-call' },
  { lang: 'CPP', pattern: /\bsystem\s*\(/, label: 'cpp-forbidden', type: 'dangerous-call' },
];

function findLineColumn(
  source: string,
  match: RegExpExecArray,
): { line: number; column: number; snippet: string } {
  const before = source.slice(0, match.index);
  const line = (before.match(/\n/g)?.length ?? 0) + 1;
  const lastNewline = before.lastIndexOf('\n');
  const column = match.index - lastNewline;
  const lineStart = lastNewline + 1;
  const lineEnd = source.indexOf('\n', match.index);
  const snippet = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd).trimEnd();
  return { line, column, snippet };
}

function regexPreCheck(language: string, source: string): ScanViolation[] {
  const violations: ScanViolation[] = [];
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.lang !== language && rule.lang !== 'ALL') continue;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      const { line, column, snippet } = findLineColumn(source, match);
      violations.push({ type: rule.type, line, column, snippet, rule: rule.label });
    }
  }
  // Catch-all for system() across all languages
  if (language !== 'JAVASCRIPT' && language !== 'PYTHON' && language !== 'JAVA') {
    const sysRegex = /\bsystem\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = sysRegex.exec(source)) !== null) {
      const { line, column, snippet } = findLineColumn(source, match);
      violations.push({ type: 'dangerous-call', line, column, snippet, rule: 'shell-forbidden' });
    }
  }
  return violations;
}

let astScan: ((source: string) => ScanViolation[]) | null = null;

try {
  // Dynamic import — ast-scanner.ts uses TypeScript Compiler API
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  astScan = require('./ast-scanner').astScan;
} catch {
  // AST scanner not available (e.g., typescript not installed) — fall back to regex only
}

export function scanSourceCode(language: string, source: string): ScanResult {
  const violations = regexPreCheck(language, source);
  if (violations.length > 0) {
    return { blocked: true, violations };
  }

  if (language === 'JAVASCRIPT' && astScan) {
    const astViolations = astScan(source);
    if (astViolations.length > 0) {
      return { blocked: true, violations: astViolations };
    }
  }

  return { blocked: false, violations: [] };
}
