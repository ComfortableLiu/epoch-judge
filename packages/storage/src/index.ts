export * from './types';
export * from './local.provider';
export * from './s3.provider';
export * from './factory';

export function testcaseKey(problemId: string, testcaseId: string, ext: 'in' | 'out'): string {
  return `${problemId}/${testcaseId}.${ext}`;
}

/** 题目 Markdown 内嵌图片等资源 */
export function problemAssetKey(problemId: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${problemId}/assets/${normalized}`;
}
