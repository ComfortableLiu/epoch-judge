import { getToken } from './client';

/** SSE via fetch so Authorization Bearer can be sent (EventSource cannot). */
export async function subscribeSubmissionStream(
  submissionNumber: string | number,
  opts: {
    signal?: AbortSignal;
    onMessage: (data: string) => void;
    onError?: (err: Error) => void;
  },
): Promise<void> {
  const token = getToken();
  if (!token) {
    opts.onError?.(new Error('Not authenticated'));
    return;
  }

  let res: Response;
  try {
    res = await fetch(`/api/v1/submissions/${submissionNumber}/stream`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal: opts.signal,
    });
  } catch (e) {
    if (opts.signal?.aborted) return;
    opts.onError?.(e instanceof Error ? e : new Error(String(e)));
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    opts.onError?.(
      new Error(
        (err as { message?: string }).message ?? res.statusText ?? 'Stream failed',
      ),
    );
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        for (const line of block.split('\n')) {
          if (line.startsWith('data:')) {
            opts.onMessage(line.slice(5).trimStart());
          }
        }
      }
    }
  } catch (e) {
    if (opts.signal?.aborted) return;
    opts.onError?.(e instanceof Error ? e : new Error(String(e)));
  }
}
