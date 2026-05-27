export type TestcaseResultRow = {
  verdict: string;
  timeMs: number | null;
  memoryKb: number | null;
};

export function maxRuntimeStats(results: TestcaseResultRow[]) {
  return {
    maxTimeMs: results.reduce((m, r) => Math.max(m, r.timeMs ?? 0), 0),
    maxMemoryKb: results.reduce((m, r) => Math.max(m, r.memoryKb ?? 0), 0),
  };
}

/** OI：按通过测例数百分制，如 15/20 → 75分（15/20） */
export function formatOiScore(results: TestcaseResultRow[]): string | null {
  const total = results.length;
  if (!total) return null;
  const passed = results.filter((r) => r.verdict === 'ACCEPTED').length;
  const percent = Math.round((passed / total) * 100);
  return `${percent}分（${passed}/${total}）`;
}
