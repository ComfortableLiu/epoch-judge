import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageProvider, StorageReadResult } from './types';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly prefix: string;

  constructor(
    private readonly bucket: string,
    config: {
      endpoint?: string;
      accessKey: string;
      secretKey: string;
      prefix?: string;
      region?: string;
    },
  ) {
    this.prefix = config.prefix ? `${config.prefix.replace(/\/$/, '')}/` : '';
    this.client = new S3Client({
      region: config.region ?? 'us-east-1',
      endpoint: config.endpoint || undefined,
      forcePathStyle: Boolean(config.endpoint),
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }

  private objectKey(key: string): string {
    return `${this.prefix}${key.replace(/^\/+/, '')}`;
  }

  async read(key: string): Promise<StorageReadResult> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key) }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Empty object: ${key}`);
    const content = Buffer.from(bytes);
    return { content, size: content.length };
  }

  async write(key: string, content: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.objectKey(key),
        Body: content,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key) }),
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key) }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
