import type { Language } from '@epoch-judge/shared';

export type VerdictCode =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR'
  | 'SYSTEM_ERROR';

export interface RunLimits {
  timeLimitMs: number;
  memoryLimitKb: number;
  outputLimitKb: number;
}

export interface RunResult {
  verdict: VerdictCode;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timeMs: number;
  memoryKb: number;
  message?: string;
}

export interface TestcaseRunInput {
  language: Language;
  sourceCode: string;
  input: Buffer;
  expectedOutput: Buffer;
  limits: RunLimits;
  workDir: string;
}
