export interface StorageReadResult {
  content: Buffer;
  size: number;
}

export interface StorageProvider {
  read(key: string): Promise<StorageReadResult>;
  write(key: string, content: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface StorageConfig {
  type: 'local' | 's3';
  localRoot?: string;
  s3?: {
    endpoint?: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    prefix?: string;
    region?: string;
  };
}
