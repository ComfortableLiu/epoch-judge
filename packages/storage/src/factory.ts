import { LocalStorageProvider } from './local.provider';
import { S3StorageProvider } from './s3.provider';
import type { StorageConfig, StorageProvider } from './types';

export function createStorageProvider(config: StorageConfig): StorageProvider {
  if (config.type === 's3') {
    if (!config.s3?.bucket || !config.s3.accessKey || !config.s3.secretKey) {
      throw new Error('S3 storage requires bucket, access key, and secret key');
    }
    return new S3StorageProvider(config.s3.bucket, config.s3);
  }
  const root = config.localRoot ?? './data/testcases';
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
    localRoot: env.STORAGE_LOCAL_ROOT ?? './data/testcases',
  };
}
