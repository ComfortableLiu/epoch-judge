export function resolveProblemAssetSrc(
  number: string,
  src: string,
  contestId?: string | null,
): string | null {
  if (!src || src.startsWith('http://') || src.startsWith('https://')) {
    return src || null;
  }
  const path = src.replace(/^\.?\//, '');
  const encoded = path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  const q = contestId ? `?contestId=${encodeURIComponent(contestId)}` : '';
  return `/api/v1/problems/${encodeURIComponent(number)}/assets/${encoded}${q}`;
}
