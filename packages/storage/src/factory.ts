import { findMonorepoEnvPath, loadMonorepoEnv } from '@epoch-judge/shared';
import { dirname, isAbsolute, resolve } from 'path';
import { LocalStorageProvider } from './local.provider';
import { S3StorageProvider } from './s3.provider';
import type { StorageConfig, StorageProvider } from './types';

/**
 * Resolve STORAGE_LOCAL_ROOT relative to monorepo root (directory containing `.env`),
 * not process.cwd(), so API and Judge workers share the same files.
 */
export function resolveLocalStorageRoot(
  localRoot?: string,
  cwd = process.cwd(),
): string {
  const raw = localRoot ?? './data/testcases';
  if (isAbsolute(raw)) return resolve(raw);
  loadMonorepoEnv();
  const envPath = findMonorepoEnvPath(cwd);
  const base = envPath ? dirname(envPath) : cwd;
  return resolve(base, raw);
}

export function createStorageProvider(config: StorageConfig): StorageProvider {
  if (config.type === 's3') {
    if (!config.s3?.bucket || !config.s3.accessKey || !config.s3.secretKey) {
      throw new Error('S3 storage requires bucket, access key, and secret key');
    }
    return new S3StorageProvider(config.s3.bucket, config.s3);
  }
  const root = resolveLocalStorageRoot(config.localRoot);
  return new LocalStorageProvider(root);
}

export function storageConfigFromEnv(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const type = (env.STORAGE_TYPE ?? 'local') as 'local' | 's3';
  if (type === 's3') {
    return {
      type: 's3',
      s3: {
        endpoint: env.S3_ENDPOINT,
        bucket: env.S3_BUCKET ?? '',
        accessKey: env.S3_ACCESS_KEY ?? '',
        secretKey: env.S3_SECRET_KEY ?? '',
        prefix: env.S3_PREFIX,
        region: env.S3_REGION,
      },
    };
  }
  return {
    type: 'local',
    localRoot: resolveLocalStorageRoot(env.STORAGE_LOCAL_ROOT),
  };
}
