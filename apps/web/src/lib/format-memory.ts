/** 内存限制/占用（KiB 为基准）优先整 MiB 或整 KiB，避免 0.25 MiB、1024 KiB 等别扭写法 */
export function formatMemoryKiB(kib: number): string {
  if (kib <= 0) return '—';
  if (kib >= 1024 && kib % 1024 === 0) {
    return `${kib / 1024} MiB`;
  }
  return `${kib} KiB`;
}
