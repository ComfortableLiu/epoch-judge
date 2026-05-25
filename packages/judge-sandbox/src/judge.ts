import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { Language } from '@epoch-judge/shared';
import { runTestcase } from './languages';
import type { RunLimits, RunResult, VerdictCode } from './types';

export interface JudgeOneOptions {
  language: Language;
  sourceCode: string;
  input: Buffer;
  expectedOutput: Buffer;
  timeLimitMs: number;
  memoryLimitKb: number;
}

export async function judgeOneTestcase(opts: JudgeOneOptions): Promise<RunResult> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'epoch-judge-'));
  try {
    const limits: RunLimits = {
      timeLimitMs: opts.timeLimitMs,
      memoryLimitKb: opts.memoryLimitKb,
      outputLimitKb: Math.min(65536, opts.memoryLimitKb * 2),
    };
    return await runTestcase({
      language: opts.language,
      sourceCode: opts.sourceCode,
      input: opts.input,
      expectedOutput: opts.expectedOutput,
      limits,
      workDir,
    });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function toTestcaseVerdict(code: VerdictCode): string {
  return code;
}
