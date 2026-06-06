import { Language } from '@epoch-judge/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execCommand } from '../exec';
import type { RunLimits, RunResult, TestcaseRunInput } from '../types';

function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, '\n').trimEnd();
}

function compareOutput(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

async function writeSource(workDir: string, language: Language, source: string) {
  const files: Record<string, string> = {
    [Language.JAVASCRIPT]: 'main.mjs',
    [Language.PYTHON]: 'main.py',
    [Language.JAVA]: 'Main.java',
    [Language.C]: 'main.c',
    [Language.CPP]: 'main.cpp',
  };
  const name = files[language];
  await fs.writeFile(path.join(workDir, name), source, 'utf-8');
  return name;
}

async function compileIfNeeded(
  workDir: string,
  language: Language,
  limits: RunLimits,
): Promise<RunResult | null> {
  const timeoutMs = limits.timeLimitMs + 5000;
  const maxBuf = limits.outputLimitKb * 1024;

  if (language === Language.C) {
    const { stderr, timeMs } = await execCommand(
      'gcc',
      ['-O2', '-std=c17', 'main.c', '-o', 'main'],
      { cwd: workDir, timeoutMs, maxBufferBytes: maxBuf },
    );
    if (stderr.includes('error:')) {
      return {
        verdict: 'COMPILE_ERROR',
        stdout: '',
        stderr,
        exitCode: 1,
        timeMs,
        memoryKb: 0,
        message: stderr.slice(0, 2000),
      };
    }
  } else if (language === Language.CPP) {
    const { stderr, timeMs } = await execCommand(
      'g++',
      ['-O2', '-std=c++17', 'main.cpp', '-o', 'main'],
      { cwd: workDir, timeoutMs, maxBufferBytes: maxBuf },
    );
    if (stderr.includes('error:')) {
      return {
        verdict: 'COMPILE_ERROR',
        stdout: '',
        stderr,
        exitCode: 1,
        timeMs,
        memoryKb: 0,
        message: stderr.slice(0, 2000),
      };
    }
  } else if (language === Language.JAVA) {
    const { stderr, timeMs } = await execCommand(
      'javac',
      ['Main.java'],
      { cwd: workDir, timeoutMs, maxBufferBytes: maxBuf },
    );
    if (stderr.includes('error') || stderr.includes('错误')) {
      return {
        verdict: 'COMPILE_ERROR',
        stdout: '',
        stderr,
        exitCode: 1,
        timeMs,
        memoryKb: 0,
        message: stderr.slice(0, 2000),
      };
    }
  }
  return null;
}

function runCommand(language: Language): { bin: string; args: string[] } {
  switch (language) {
    case Language.JAVASCRIPT:
      return { bin: 'node', args: ['--no-deprecation', 'main.mjs'] };
    case Language.PYTHON:
      return { bin: 'python3', args: ['main.py'] };
    case Language.JAVA:
      return { bin: 'java', args: ['-Xmx256m', 'Main'] };
    case Language.C:
    case Language.CPP:
      return { bin: './main', args: [] };
    default:
      return { bin: 'false', args: [] };
  }
}

export async function runTestcase(input: TestcaseRunInput): Promise<RunResult> {
  const limits = input.limits;
  await fs.mkdir(input.workDir, { recursive: true });
  await writeSource(input.workDir, input.language, input.sourceCode);
  const compileErr = await compileIfNeeded(input.workDir, input.language, limits);
  if (compileErr) return compileErr;

  const { bin, args } = runCommand(input.language);
  const maxBuf = limits.outputLimitKb * 1024;
  const timeoutMs = limits.timeLimitMs + 500;

  try {
    const { stdout, stderr, timeMs } = await execCommand(bin, args, {
      cwd: input.workDir,
      timeoutMs,
      maxBufferBytes: maxBuf,
      stdin: input.input,
      env: {
        PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
        NODE_OPTIONS: '--max-old-space-size=256',
      },
    });

    if (timeMs > limits.timeLimitMs) {
      return {
        verdict: 'TIME_LIMIT_EXCEEDED',
        stdout,
        stderr,
        exitCode: null,
        timeMs,
        memoryKb: 0,
      };
    }

    const expected = input.expectedOutput.toString('utf-8');
    if (compareOutput(stdout, expected)) {
      return {
        verdict: 'ACCEPTED',
        stdout,
        stderr,
        exitCode: 0,
        timeMs,
        memoryKb: 256,
      };
    }
    return {
      verdict: 'WRONG_ANSWER',
      stdout,
      stderr,
      exitCode: 0,
      timeMs,
      memoryKb: 256,
    };
  } catch (e) {
    if (e instanceof Error && e.message === 'TIME_LIMIT') {
      const timeMs = (e as { timeMs?: number }).timeMs ?? limits.timeLimitMs;
      return {
        verdict: 'TIME_LIMIT_EXCEEDED',
        stdout: '',
        stderr: '',
        exitCode: null,
        timeMs,
        memoryKb: 0,
      };
    }
    return {
      verdict: 'RUNTIME_ERROR',
      stdout: '',
      stderr: e instanceof Error ? e.message : 'runtime error',
      exitCode: 1,
      timeMs: limits.timeLimitMs,
      memoryKb: 0,
    };
  }
}
