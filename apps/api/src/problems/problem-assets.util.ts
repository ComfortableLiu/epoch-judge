import { BadRequestException } from '@nestjs/common';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

export function normalizeAssetPath(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    throw new BadRequestException('Invalid asset path');
  }
  const normalized = decoded.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
  if (!normalized || normalized.includes('..')) {
    throw new BadRequestException('Invalid asset path');
  }
  return normalized;
}

export function mimeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

export function isZipAssetEntry(entryName: string): boolean {
  const name = entryName.replace(/\\/g, '/');
  if (!name || name.endsWith('/')) return false;
  if (name === 'statement.md' || name === 'problem.yaml') return false;
  if (name.startsWith('testdata/')) return false;
  if (name.startsWith('assets/')) return true;
  return IMAGE_EXT.test(name);
}
