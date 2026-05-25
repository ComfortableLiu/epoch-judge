import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JudgeMode, ProblemVisibility, Role } from '@epoch-judge/db';
import { problemAssetKey, testcaseKey } from '@epoch-judge/storage';
import {
  mimeFromFilename,
  normalizeAssetPath,
} from './problem-assets.util';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateProblemDto, UpdateProblemDto } from './problems.dto';

@Injectable()
export class ProblemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(publicOnly = true) {
    return this.prisma.client.problem.findMany({
      where: publicOnly ? { visibility: ProblemVisibility.PUBLIC } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        visibility: true,
        defaultJudgeMode: true,
        timeLimitMs: true,
        memoryLimitKb: true,
        createdAt: true,
      },
    });
  }

  async getBySlug(slug: string, isStaff = false) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { slug },
      include: {
        testcases: { orderBy: { ordinal: 'asc' } },
      },
    });
    if (!problem) throw new NotFoundException();
    if (!isStaff && problem.visibility !== ProblemVisibility.PUBLIC) {
      throw new NotFoundException();
    }
    return {
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      statement: problem.statement,
      difficulty: problem.difficulty,
      visibility: problem.visibility,
      defaultJudgeMode: problem.defaultJudgeMode,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
      testcases: isStaff
        ? problem.testcases
        : problem.testcases
            .filter((t) => t.isSample)
            .map((t) => ({
              id: t.id,
              ordinal: t.ordinal,
              isSample: t.isSample,
              score: t.score,
            })),
    };
  }

  async create(dto: CreateProblemDto) {
    return this.prisma.client.problem.create({ data: dto });
  }

  async update(id: string, dto: UpdateProblemDto) {
    return this.prisma.client.problem.update({ where: { id }, data: dto });
  }

  async addTestcase(
    problemId: string,
    ordinal: number,
    input: Buffer,
    output: Buffer,
    score: number,
    isSample: boolean,
  ) {
    const id = crypto.randomUUID();
    const inputKey = testcaseKey(problemId, id, 'in');
    const outputKey = testcaseKey(problemId, id, 'out');
    await this.storage.provider.write(inputKey, input);
    await this.storage.provider.write(outputKey, output);
    return this.prisma.client.problemTestcase.create({
      data: {
        id,
        problemId,
        ordinal,
        inputKey,
        outputKey,
        inputSize: input.length,
        outputSize: output.length,
        checksum: crypto.createHash('sha256').update(input).digest('hex'),
        score,
        isSample,
      },
    });
  }

  async syncAssets(
    problemId: string,
    assets: { path: string; content: Buffer; mimeType: string }[],
  ) {
    const existing = await this.prisma.client.problemAsset.findMany({
      where: { problemId },
    });
    for (const row of existing) {
      try {
        await this.storage.provider.delete(row.storageKey);
      } catch {
        /* ignore missing objects */
      }
    }
    await this.prisma.client.problemAsset.deleteMany({ where: { problemId } });

    for (const asset of assets) {
      const path = normalizeAssetPath(asset.path);
      const storageKey = problemAssetKey(problemId, path);
      await this.storage.provider.write(storageKey, asset.content);
      await this.prisma.client.problemAsset.create({
        data: {
          problemId,
          path,
          storageKey,
          mimeType: asset.mimeType,
          size: asset.content.length,
        },
      });
    }
  }

  async getAssetBySlug(slug: string, assetPath: string, isStaff = false) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { slug },
    });
    if (!problem) throw new NotFoundException();
    if (!isStaff && problem.visibility !== ProblemVisibility.PUBLIC) {
      throw new NotFoundException();
    }
    const path = normalizeAssetPath(assetPath);
    const asset = await this.prisma.client.problemAsset.findUnique({
      where: { problemId_path: { problemId: problem.id, path } },
    });
    if (!asset) throw new NotFoundException();
    const { content } = await this.storage.provider.read(asset.storageKey);
    return { content, mimeType: asset.mimeType };
  }

  async importFromManifest(manifest: {
    slug: string;
    title: string;
    statement: string;
    timeLimitMs: number;
    memoryLimitKb: number;
    defaultJudgeMode: JudgeMode;
    visibility: ProblemVisibility;
    testcases: { input: Buffer; output: Buffer; score: number; isSample?: boolean }[];
    assets?: { path: string; content: Buffer; mimeType: string }[];
  }) {
    const problem = await this.prisma.client.problem.upsert({
      where: { slug: manifest.slug },
      create: {
        slug: manifest.slug,
        title: manifest.title,
        statement: manifest.statement,
        timeLimitMs: manifest.timeLimitMs,
        memoryLimitKb: manifest.memoryLimitKb,
        defaultJudgeMode: manifest.defaultJudgeMode,
        visibility: manifest.visibility,
      },
      update: {
        title: manifest.title,
        statement: manifest.statement,
        timeLimitMs: manifest.timeLimitMs,
        memoryLimitKb: manifest.memoryLimitKb,
        defaultJudgeMode: manifest.defaultJudgeMode,
        visibility: manifest.visibility,
      },
    });

    await this.prisma.client.problemTestcase.deleteMany({
      where: { problemId: problem.id },
    });

    let ordinal = 0;
    for (const tc of manifest.testcases) {
      await this.addTestcase(
        problem.id,
        ordinal++,
        tc.input,
        tc.output,
        tc.score,
        tc.isSample ?? false,
      );
    }

    await this.syncAssets(problem.id, manifest.assets ?? []);
    return problem;
  }

  canEdit(role: Role) {
    return role === Role.ADMIN || role === Role.PROBLEM_EDITOR;
  }
}
