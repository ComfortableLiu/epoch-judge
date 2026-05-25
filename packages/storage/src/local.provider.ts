import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageProvider, StorageReadResult } from './types';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const full = path.join(this.root, normalized);
    if (!full.startsWith(path.resolve(this.root))) {
      throw new Error('Invalid storage key');
    }
    return full;
  }

  async read(key: string): Promise<StorageReadResult> {
    const full = this.resolve(key);
    const content = await fs.readFile(full);
    return { content, size: content.length };
  }

  async write(key: string, content: Buffer): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
  }

  async delete(key: string): Promise<void> {
    const full = this.resolve(key);
    await fs.unlink(full).catch(() => undefined);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}
