import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProblemVisibility, Role, SubmissionStatus } from '@epoch-judge/db';
import {
  isSubmissionTerminal,
  normalizeProblemTags,
  ProblemTagsValidationError,
  tagsFromDb,
} from '@epoch-judge/shared';
import { problemAssetKey, testcaseKey } from '@epoch-judge/storage';
import {
  mimeFromFilename,
  normalizeAssetPath,
} from './problem-assets.util';
import * as crypto from 'crypto';
import { JudgeModeService } from '../judge/judge-mode.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  ProblemAccessService,
  type ProblemAccessContext,
  type ProblemAccessUser,
} from './problem-access.service';
import { parseEntityNumber } from '../common/parse-entity-number';
import {
  CreateProblemDto,
  CreateTestcaseDto,
  UpdateProblemDto,
  UpdateTestcaseDto,
} from './problems.dto';
import { buildProblemZip } from './problem-zip.util';

@Injectable()
export class ProblemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly judgeMode: JudgeModeService,
    private readonly problemAccess: ProblemAccessService,
  ) {}

  async list(publicOnly = true, user?: ProblemAccessUser) {
    const isStaff = user && this.problemAccess.isStaff(user.role);
    const locked = await this.problemAccess.getLockedProblemIds();
    const lockedArr = [...locked];

    const problems = await this.prisma.client.problem.findMany({
      where:
        isStaff && !publicOnly
          ? undefined
          : {
              OR: [
                ...(user ? [{ createdById: user.id }] : []),
                {
                  visibility: ProblemVisibility.PUBLIC,
                  ...(lockedArr.length > 0
                    ? { id: { notIn: lockedArr } }
                    : {}),
                },
              ],
            },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        number: true,
        title: true,
        difficulty: true,
        visibility: true,
        createdById: true,
        timeLimitMs: true,
        memoryLimitKb: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const withTags = problems.map((p) => ({
      ...p,
      tags: tagsFromDb(p.tags),
    }));

    if (!user?.id || !withTags.length) {
      return withTags.map((p) => ({ ...p, passStatus: null as string | null }));
    }

    const problemIds = withTags.map((p) => p.id);
    const userId = user.id;
    const terminal = Object.values(SubmissionStatus).filter((s) =>
      isSubmissionTerminal(s),
    ) as SubmissionStatus[];

    const submissions = await this.prisma.client.submission.findMany({
      where: {
        userId,
        problemId: { in: problemIds },
        status: { in: terminal },
      },
      select: { problemId: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    const passByProblem = new Map<string, 'PASSED' | 'FAILED'>();
    for (const s of submissions) {
      if (passByProblem.get(s.problemId) === 'PASSED') continue;
      if (s.status === SubmissionStatus.ACCEPTED) {
        passByProblem.set(s.problemId, 'PASSED');
      } else if (!passByProblem.has(s.problemId)) {
        passByProblem.set(s.problemId, 'FAILED');
      }
    }

    return withTags.map((p) => ({
      ...p,
      passStatus: passByProblem.get(p.id) ?? 'NONE',
    }));
  }

  private applyTagsInput(tags?: string[]) {
    if (tags === undefined) return undefined;
    try {
      return normalizeProblemTags(tags);
    } catch (e) {
      throw new BadRequestException(
        e instanceof ProblemTagsValidationError ? e.message : 'Invalid tags',
      );
    }
  }

  async resolveByNumber(raw: string) {
    const number = parseEntityNumber(raw, 'Problem');
    const problem = await this.prisma.client.problem.findUnique({
      where: { number },
    });
    if (!problem) throw new NotFoundException();
    return problem;
  }

  async getByNumber(
    numberParam: string,
    user?: ProblemAccessUser,
    context?: ProblemAccessContext,
  ) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { number: parseEntityNumber(numberParam, 'Problem') },
      include: {
        testcases: { orderBy: { ordinal: 'asc' } },
      },
    });
    if (!problem) throw new NotFoundException();
    await this.problemAccess.assertCanView(
      {
        id: problem.id,
        visibility: problem.visibility,
        createdById: problem.createdById,
      },
      user,
      context,
    );
    const isStaff = user && this.problemAccess.isStaff(user.role);
    return {
      id: problem.id,
      number: problem.number,
      title: problem.title,
      statement: problem.statement,
      difficulty: problem.difficulty,
      visibility: problem.visibility,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
      tags: tagsFromDb(problem.tags),
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

  async create(dto: CreateProblemDto, createdById: string) {
    const tags = this.applyTagsInput(dto.tags) ?? [];
    const row = await this.prisma.client.problem.create({
      data: {
        title: dto.title,
        statement: dto.statement ?? '',
        difficulty: dto.difficulty ?? 1,
        visibility: dto.visibility ?? ProblemVisibility.PRIVATE,
        timeLimitMs: dto.timeLimitMs ?? 1000,
        memoryLimitKb: dto.memoryLimitKb ?? 262144,
        tags,
        createdById,
      },
    });
    return {
      id: row.id,
      number: row.number,
      title: row.title,
      tags: tagsFromDb(row.tags),
    };
  }

  async resolveContestRef(ref?: string): Promise<string | undefined> {
    if (!ref?.trim()) return undefined;
    const trimmed = ref.trim();
    if (/^\d+$/.test(trimmed)) {
      const c = await this.prisma.client.contest.findUnique({
        where: { number: Number.parseInt(trimmed, 10) },
      });
      if (c) return c.id;
    }
    const c = await this.prisma.client.contest.findUnique({
      where: { id: trimmed },
    });
    return c?.id;
  }

  async getSubmitContext(
    numberParam: string,
    user: ProblemAccessUser,
    contestRef?: string,
  ) {
    const contestId = await this.resolveContestRef(contestRef);
    const problem = await this.prisma.client.problem.findUnique({
      where: { number: parseEntityNumber(numberParam, 'Problem') },
      select: {
        id: true,
        number: true,
        title: true,
        visibility: true,
        createdById: true,
      },
    });
    if (!problem) throw new NotFoundException();

    await this.problemAccess.assertCanView(
      problem,
      user,
      contestId ? { contestId } : undefined,
    );

    const options = await this.judgeMode.getSubmitOptions(
      user.id,
      problem.id,
      contestId,
    );
    return {
      problemId: problem.id,
      number: problem.number,
      title: problem.title,
      ...options,
    };
  }

  async update(id: string, dto: UpdateProblemDto) {
    const tags = this.applyTagsInput(dto.tags);
    const { tags: _omit, ...rest } = dto;
    return this.prisma.client.problem.update({
      where: { id },
      data: {
        ...rest,
        ...(tags !== undefined ? { tags } : {}),
      },
    });
  }

  async exportZip(problemId: string, includeTestdata: boolean) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { id: problemId },
      include: {
        testcases: { orderBy: { ordinal: 'asc' } },
        assets: true,
      },
    });
    if (!problem) throw new NotFoundException();

    const testcases: {
      input: Buffer;
      output: Buffer;
      score: number;
      isSample: boolean;
    }[] = [];

    if (includeTestdata) {
      for (const tc of problem.testcases) {
        const input = await this.storage.provider.read(tc.inputKey);
        const output = await this.storage.provider.read(tc.outputKey);
        testcases.push({
          input: input.content,
          output: output.content,
          score: tc.score,
          isSample: tc.isSample,
        });
      }
    }

    const assets: { path: string; content: Buffer; mimeType: string }[] = [];
    for (const a of problem.assets) {
      const { content } = await this.storage.provider.read(a.storageKey);
      assets.push({
        path: a.path,
        content: content,
        mimeType: a.mimeType,
      });
    }

    const buffer = buildProblemZip(
      {
        number: problem.number,
        title: problem.title,
        statement: problem.statement,
        timeLimitMs: problem.timeLimitMs,
        memoryLimitKb: problem.memoryLimitKb,
        visibility: problem.visibility,
        difficulty: problem.difficulty,
        tags: tagsFromDb(problem.tags),
        testcases,
        assets,
      },
      { includeTestdata },
    );

    return {
      buffer,
      filename: `problem-${problem.number}.zip`,
    };
  }

  private async ensureProblem(problemId: string) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { id: problemId },
    });
    if (!problem) throw new NotFoundException();
    return problem;
  }

  private async ensureTestcase(problemId: string, testcaseId: string) {
    const tc = await this.prisma.client.problemTestcase.findFirst({
      where: { id: testcaseId, problemId },
    });
    if (!tc) throw new NotFoundException();
    return tc;
  }

  async listTestcases(problemId: string) {
    await this.ensureProblem(problemId);
    const rows = await this.prisma.client.problemTestcase.findMany({
      where: { problemId },
      orderBy: { ordinal: 'asc' },
    });
    return rows.map((t) => ({
      id: t.id,
      ordinal: t.ordinal,
      score: t.score,
      isSample: t.isSample,
      inputSize: t.inputSize,
      outputSize: t.outputSize,
    }));
  }

  async getTestcaseDetail(problemId: string, testcaseId: string) {
    const tc = await this.ensureTestcase(problemId, testcaseId);
    const input = await this.storage.provider.read(tc.inputKey);
    const output = await this.storage.provider.read(tc.outputKey);
    return {
      id: tc.id,
      ordinal: tc.ordinal,
      score: tc.score,
      isSample: tc.isSample,
      input: input.content.toString('utf-8'),
      output: output.content.toString('utf-8'),
    };
  }

  async createTestcase(problemId: string, dto: CreateTestcaseDto) {
    await this.ensureProblem(problemId);
    const max = await this.prisma.client.problemTestcase.aggregate({
      where: { problemId },
      _max: { ordinal: true },
    });
    const ordinal = dto.ordinal ?? (max._max.ordinal ?? -1) + 1;
    const input = Buffer.from(dto.input, 'utf-8');
    const output = Buffer.from(dto.output, 'utf-8');
    if (input.length === 0 || output.length === 0) {
      throw new BadRequestException('Input and output must not be empty');
    }
    const row = await this.addTestcase(
      problemId,
      ordinal,
      input,
      output,
      dto.score,
      dto.isSample ?? false,
    );
    return {
      id: row.id,
      ordinal: row.ordinal,
      score: row.score,
      isSample: row.isSample,
      inputSize: row.inputSize,
      outputSize: row.outputSize,
    };
  }

  async updateTestcase(
    problemId: string,
    testcaseId: string,
    dto: UpdateTestcaseDto,
  ) {
    const tc = await this.ensureTestcase(problemId, testcaseId);
    if (dto.ordinal !== undefined && dto.ordinal !== tc.ordinal) {
      const conflict = await this.prisma.client.problemTestcase.findFirst({
        where: {
          problemId,
          ordinal: dto.ordinal,
          id: { not: testcaseId },
        },
      });
      if (conflict) {
        throw new BadRequestException('Testcase ordinal already exists');
      }
    }

    let inputSize = tc.inputSize;
    let outputSize = tc.outputSize;
    let checksum = tc.checksum;

    if (dto.input !== undefined) {
      const buf = Buffer.from(dto.input, 'utf-8');
      if (buf.length === 0) throw new BadRequestException('Input must not be empty');
      await this.storage.provider.write(tc.inputKey, buf);
      inputSize = buf.length;
      checksum = crypto.createHash('sha256').update(buf).digest('hex');
    }
    if (dto.output !== undefined) {
      const buf = Buffer.from(dto.output, 'utf-8');
      if (buf.length === 0) throw new BadRequestException('Output must not be empty');
      await this.storage.provider.write(tc.outputKey, buf);
      outputSize = buf.length;
    }

    const updated = await this.prisma.client.problemTestcase.update({
      where: { id: testcaseId },
      data: {
        ...(dto.ordinal !== undefined ? { ordinal: dto.ordinal } : {}),
        ...(dto.score !== undefined ? { score: dto.score } : {}),
        ...(dto.isSample !== undefined ? { isSample: dto.isSample } : {}),
        inputSize,
        outputSize,
        checksum,
      },
    });
    return {
      id: updated.id,
      ordinal: updated.ordinal,
      score: updated.score,
      isSample: updated.isSample,
      inputSize: updated.inputSize,
      outputSize: updated.outputSize,
    };
  }

  async deleteTestcase(problemId: string, testcaseId: string) {
    const tc = await this.ensureTestcase(problemId, testcaseId);
    try {
      await this.storage.provider.delete(tc.inputKey);
    } catch {
      /* ignore */
    }
    try {
      await this.storage.provider.delete(tc.outputKey);
    } catch {
      /* ignore */
    }
    await this.prisma.client.problemTestcase.delete({ where: { id: testcaseId } });
    return { ok: true };
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

  async getAssetByNumber(
    numberParam: string,
    assetPath: string,
    user?: ProblemAccessUser,
    context?: ProblemAccessContext,
  ) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { number: parseEntityNumber(numberParam, 'Problem') },
      select: { id: true, visibility: true, createdById: true },
    });
    if (!problem) throw new NotFoundException();
    await this.problemAccess.assertCanView(problem, user, context);
    const path = normalizeAssetPath(assetPath);
    const asset = await this.prisma.client.problemAsset.findUnique({
      where: { problemId_path: { problemId: problem.id, path } },
    });
    if (!asset) throw new NotFoundException();
    const { content } = await this.storage.provider.read(asset.storageKey);
    return { content, mimeType: asset.mimeType };
  }

  async importFromManifest(
    manifest: {
      number?: number;
      title: string;
      statement: string;
      timeLimitMs: number;
      memoryLimitKb: number;
      visibility?: ProblemVisibility;
      difficulty?: number;
      tags?: string[];
      testcases: { input: Buffer; output: Buffer; score: number; isSample?: boolean }[];
      assets?: { path: string; content: Buffer; mimeType: string }[];
    },
    createdById: string,
  ) {
    const visibility = manifest.visibility ?? ProblemVisibility.PRIVATE;
    const tags = manifest.tags ?? [];
    const base = {
      title: manifest.title,
      statement: manifest.statement,
      timeLimitMs: manifest.timeLimitMs,
      memoryLimitKb: manifest.memoryLimitKb,
      visibility,
      ...(manifest.difficulty != null ? { difficulty: manifest.difficulty } : {}),
      tags,
    };

    const problem =
      manifest.number != null
        ? await this.prisma.client.problem.upsert({
            where: { number: manifest.number },
            create: { ...base, createdById },
            update: base,
          })
        : await this.prisma.client.problem.create({
            data: { ...base, createdById },
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
