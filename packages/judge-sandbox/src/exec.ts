import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ExecOptions {
  cwd: string;
  timeoutMs: number;
  maxBufferBytes: number;
  env?: Record<string, string>;
  /** When set, program stdin receives this data (required for competitive programming runs). */
  stdin?: Buffer;
}

function timeLimitError(start: number): Error {
  return Object.assign(new Error('TIME_LIMIT'), { timeMs: Date.now() - start });
}

function execWithStdin(
  file: string,
  args: string[],
  opts: ExecOptions,
): Promise<{ stdout: string; stderr: string; timeMs: number }> {
  const start = Date.now();
  const env = { ...process.env, ...opts.env, PATH: opts.env?.PATH ?? process.env.PATH };

  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd: opts.cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(() => reject(timeLimitError(start)));
    }, opts.timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > opts.maxBufferBytes) child.kill('SIGKILL');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > opts.maxBufferBytes) child.kill('SIGKILL');
    });

    child.on('error', (err) => {
      finish(() => reject(err));
    });

    child.on('close', (code, signal) => {
      const timeMs = Date.now() - start;
      if (signal === 'SIGKILL' || signal === 'SIGTERM') {
        finish(() => reject(timeLimitError(start)));
        return;
      }
      finish(() =>
        resolve({
          stdout,
          stderr: stderr || (code !== 0 ? `exit ${code}` : ''),
          timeMs,
        }),
      );
    });

    child.stdin?.write(opts.stdin!);
    child.stdin?.end();
  });
}

export async function execCommand(
  file: string,
  args: string[],
  opts: ExecOptions,
): Promise<{ stdout: string; stderr: string; timeMs: number }> {
  if (opts.stdin) {
    return execWithStdin(file, args, opts);
  }

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
      throw timeLimitError(start);
    }
    return {
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? err.message ?? '',
      timeMs: Date.now() - start,
    };
  }
}
