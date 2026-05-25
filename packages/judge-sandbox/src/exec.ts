import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ExecOptions {
  cwd: string;
  timeoutMs: number;
  maxBufferBytes: number;
  env?: Record<string, string>;
}

export async function execCommand(
  file: string,
  args: string[],
  opts: ExecOptions,
): Promise<{ stdout: string; stderr: string; timeMs: number }> {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs,
      maxBuffer: opts.maxBufferBytes,
      env: { ...process.env, ...opts.env, PATH: opts.env?.PATH ?? process.env.PATH },
      shell: false,
    });
    return {
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      timeMs: Date.now() - start,
    };
  } catch (e: unknown) {
    const err = e as {
      stdout?: Buffer;
      stderr?: Buffer;
      killed?: boolean;
      signal?: string;
      code?: number;
      message?: string;
    };
    if (err.killed || err.signal === 'SIGTERM' || err.signal === 'SIGKILL') {
      throw Object.assign(new Error('TIME_LIMIT'), { timeMs: Date.now() - start });
    }
    return {
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? err.message ?? '',
      timeMs: Date.now() - start,
    };
  }
}
