import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { LocalStorageProvider } from './local.provider';
import { createStorageProvider, resolveLocalStorageRoot } from './factory';

test('local storage read/write', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'epoch-storage-'));
  const storage = new LocalStorageProvider(root);
  await storage.write('p1/t1.in', Buffer.from('1 2'));
  const r = await storage.read('p1/t1.in');
  assert.equal(r.content.toString(), '1 2');
  assert.equal(await storage.exists('p1/t1.in'), true);
  await storage.delete('p1/t1.in');
  assert.equal(await storage.exists('p1/t1.in'), false);
});

test('factory defaults to local', () => {
  const p = createStorageProvider({ type: 'local', localRoot: '/tmp/epoch' });
  assert.ok(p);
});

test('resolveLocalStorageRoot uses absolute paths as-is', () => {
  assert.equal(resolveLocalStorageRoot('/var/epoch/data'), '/var/epoch/data');
});
