import { ProblemVisibility } from '@epoch-judge/db';
import { normalizeProblemTags } from '@epoch-judge/shared';
import AdmZip from 'adm-zip';
import * as yaml from 'yaml';
import { isZipAssetEntry, mimeFromFilename } from './problem-assets.util';

export type ProblemZipManifest = {
  number?: number;
  title: string;
  statement: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  visibility: ProblemVisibility;
  difficulty?: number;
  tags?: string[];
  testcases: {
    input: Buffer;
    output: Buffer;
    score: number;
    isSample?: boolean;
  }[];
  assets?: { path: string; content: Buffer; mimeType: string }[];
};

export function parseProblemZip(buffer: Buffer): ProblemZipManifest {
  const zip = new AdmZip(buffer);
  const metaEntry = zip.getEntry('problem.yaml');
  if (!metaEntry) throw new Error('problem.yaml missing');

  const meta = yaml.parse(metaEntry.getData().toString('utf-8')) as {
    number?: number;
    title: string;
    timeLimitMs: number;
    memoryLimitKb: number;
    visibility: ProblemVisibility;
    difficulty?: number;
    tags?: string[];
  };

  const statement =
    zip.getEntry('statement.md')?.getData().toString('utf-8') ?? '';

  const tags =
    meta.tags !== undefined ? normalizeProblemTags(meta.tags) : undefined;

  const testcases: ProblemZipManifest['testcases'] = [];
  const entries = zip.getEntries().filter((e) => e.entryName.startsWith('testdata/'));
  const inputs = entries.filter((e) => e.entryName.endsWith('.in'));
  for (const inp of inputs) {
    const base = inp.entryName.replace(/\.in$/, '');
    const out = zip.getEntry(`${base}.out`);
    if (!out) continue;
    testcases.push({
      input: inp.getData(),
      output: out.getData(),
      score: 100 / Math.max(inputs.length, 1),
    });
  }

  const assets = zip
    .getEntries()
    .filter((e) => isZipAssetEntry(e.entryName))
    .map((e) => ({
      path: e.entryName.replace(/\\/g, '/'),
      content: e.getData(),
      mimeType: mimeFromFilename(e.entryName),
    }));

  return {
    ...meta,
    tags,
    statement,
    testcases,
    assets,
  };
}

export function buildProblemZip(
  manifest: ProblemZipManifest,
  opts: { includeTestdata: boolean },
): Buffer {
  const zip = new AdmZip();

  const yamlMeta: Record<string, unknown> = {
    ...(manifest.number != null ? { number: manifest.number } : {}),
    title: manifest.title,
    timeLimitMs: manifest.timeLimitMs,
    memoryLimitKb: manifest.memoryLimitKb,
    visibility: manifest.visibility,
    ...(manifest.difficulty != null ? { difficulty: manifest.difficulty } : {}),
    ...(manifest.tags?.length ? { tags: manifest.tags } : {}),
  };

  zip.addFile('problem.yaml', Buffer.from(yaml.stringify(yamlMeta), 'utf-8'));
  zip.addFile('statement.md', Buffer.from(manifest.statement ?? '', 'utf-8'));

  for (const asset of manifest.assets ?? []) {
    zip.addFile(asset.path, asset.content);
  }

  if (opts.includeTestdata) {
    let i = 0;
    for (const tc of manifest.testcases) {
      i += 1;
      zip.addFile(`testdata/${i}.in`, tc.input);
      zip.addFile(`testdata/${i}.out`, tc.output);
    }
  }

  return zip.toBuffer();
}
