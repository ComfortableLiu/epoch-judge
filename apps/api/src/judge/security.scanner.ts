const FORBIDDEN_PATTERNS: { lang: string; pattern: RegExp; label: string }[] = [
  { lang: 'JAVASCRIPT', pattern: /child_process|require\s*\(\s*['"]fs['"]\)/, label: 'nodejs-forbidden' },
  { lang: 'PYTHON', pattern: /\bos\.system\b|\bsubprocess\b/, label: 'python-forbidden' },
  { lang: 'JAVA', pattern: /Runtime\.getRuntime\(\)/, label: 'java-forbidden' },
  { lang: 'C', pattern: /\bsystem\s*\(/, label: 'c-forbidden' },
  { lang: 'CPP', pattern: /\bsystem\s*\(/, label: 'cpp-forbidden' },
];

export function scanSourceCode(language: string, source: string): string | null {
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.lang !== language && rule.lang !== 'ALL') continue;
    if (rule.pattern.test(source)) return rule.label;
  }
  if (/\bsystem\s*\(/.test(source)) return 'shell-forbidden';
  return null;
}
