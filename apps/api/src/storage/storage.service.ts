import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createStorageProvider,
  storageConfigFromEnv,
  type StorageProvider,
} from '@epoch-judge/storage';

@Injectable()
export class StorageService {
  readonly provider: StorageProvider;

  constructor(config: ConfigService) {
    this.provider = createStorageProvider(
      storageConfigFromEnv({
        STORAGE_TYPE: config.get('STORAGE_TYPE'),
        STORAGE_LOCAL_ROOT: config.get('STORAGE_LOCAL_ROOT'),
        S3_ENDPOINT: config.get('S3_ENDPOINT'),
        S3_BUCKET: config.get('S3_BUCKET'),
        S3_ACCESS_KEY: config.get('S3_ACCESS_KEY'),
        S3_SECRET_KEY: config.get('S3_SECRET_KEY'),
        S3_PREFIX: config.get('S3_PREFIX'),
        S3_REGION: config.get('S3_REGION'),
      }),
    );
  }
}
