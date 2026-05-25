import * as fs from 'fs/promises';
import * as path from 'path';
import { execCommand } from './exec';

export interface IsolateConfig {
  binary: string;
  boxId: number;
}

export async function detectIsolate(): Promise<IsolateConfig | null> {
  const binary = process.env.ISOLATE_PATH ?? 'isolate';
  try {
    await execCommand(binary, ['--version'], {
      cwd: process.cwd(),
      timeoutMs: 3000,
      maxBufferBytes: 1024,
    });
    return { binary, boxId: Number(process.env.ISOLATE_BOX_ID ?? 1) };
  } catch {
    return null;
  }
}

export async function isolateRun(
  cfg: IsolateConfig,
  command: string[],
  opts: {
    cwd: string;
    timeLimitMs: number;
    memoryLimitKb: number;
    stdinPath?: string;
    stdoutPath: string;
    stderrPath: string;
  },
): Promise<{ timeMs: number; memoryKb: number; exitCode: number }> {
  const metaPath = path.join(opts.cwd, 'meta.txt');
  const args = [
    '--run',
    `-b${cfg.boxId}`,
    `-M${opts.memoryLimitKb}`,
    `-t${Math.ceil(opts.timeLimitMs / 1000) || 1}`,
    '-o',
    opts.stdoutPath,
    '-r',
    opts.stderrPath,
    '-m',
    metaPath,
    '--share-dir',
    opts.cwd,
    '--',
    ...command,
  ];
  if (opts.stdinPath) {
    args.splice(args.indexOf('--'), 0, '-i', opts.stdinPath);
  }

  await fs.mkdir(opts.cwd, { recursive: true });
  const start = Date.now();
  try {
    await execCommand(cfg.binary, args, {
      cwd: opts.cwd,
      timeoutMs: opts.timeLimitMs + 2000,
      maxBufferBytes: 1024 * 1024,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'TIME_LIMIT') {
      return { timeMs: opts.timeLimitMs, memoryKb: 0, exitCode: 124 };
    }
  }

  let memoryKb = 0;
  try {
    const meta = await fs.readFile(metaPath, 'utf-8');
    const m = meta.match(/max-rss:\s*(\d+)/);
    if (m) memoryKb = Math.ceil(Number(m[1]) / 1024);
  } catch {
    /* ignore */
  }

  const stdout = await fs.readFile(opts.stdoutPath, 'utf-8').catch(() => '');
  void stdout;
  return {
    timeMs: Date.now() - start,
    memoryKb,
    exitCode: 0,
  };
}
