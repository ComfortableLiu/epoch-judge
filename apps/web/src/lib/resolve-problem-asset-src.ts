/** 将 Markdown 内相对图片路径解析为题目资源 API */
export function resolveProblemAssetSrc(
  slug: string,
  src: string | undefined,
): string | undefined {
  if (!src) return src;
  const trimmed = src.trim();
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/api/')) return trimmed;

  const relative = trimmed.replace(/^\.\//, '');
  const encoded = relative
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `/api/v1/problems/${encodeURIComponent(slug)}/assets/${encoded}`;
}
