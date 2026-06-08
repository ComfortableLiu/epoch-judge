import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  JudgeMode,
  Language,
  SubmissionStatus,
  TestcaseVerdict,
} from '@epoch-judge/db';
import { RedisKeys } from '@epoch-judge/redis';
import { PrismaService } from '../prisma/prisma.service';
import { JudgeModeService } from '../judge/judge-mode.service';
import { JudgeTaskService } from '../judge/judge-task.service';
import { scanSourceCode } from '../judge/security.scanner';
import { t } from '../common/messages';
import { Role } from '@epoch-judge/db';
import { parseEntityNumber } from '../common/parse-entity-number';
import { CreateSubmissionDto } from './submissions.dto';
import { ContestsService } from '../contests/contests.service';

const SUPPORTED = new Set<string>(Object.values(Language));

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly judgeTasks: JudgeTaskService,
    private readonly judgeMode: JudgeModeService,
    private readonly contests: ContestsService,
  ) {}

  async create(
    user: { id: string; role: Role },
    dto: CreateSubmissionDto,
    locale: string,
  ) {
    const userId = user.id;
    if (!SUPPORTED.has(dto.language)) {
      throw new BadRequestException('Unsupported language');
    }
    const scanResult = scanSourceCode(dto.language, dto.sourceCode);
    if (scanResult.blocked) {
      this.logger.warn(
        `Blocked submission: ${scanResult.violations.length} violation(s) — ${scanResult.violations.map((v) => `${v.rule}@${v.line}:${v.column}`).join(', ')}`,
      );
      throw new BadRequestException({
        messageKey: 'security.forbidden_pattern',
        message: t('security.forbidden_pattern', locale),
      });
    }

    const problem = await this.prisma.client.problem.findUnique({
      where: { id: dto.problemId },
      include: { testcases: { orderBy: { ordinal: 'asc' } } },
    });
    if (!problem) throw new NotFoundException();

    let contestId = dto.contestId;
    if (contestId) {
      const resolved = await this.contests.resolveContestRef(contestId);
      if (!resolved) throw new NotFoundException();
      contestId = resolved;
      await this.contests.assertSubmitAccess(contestId, user);
      const active = await this.contests.isActiveForSubmit(contestId);
      if (!active) {
        throw new ForbiddenException({
          messageKey: 'contest.not_active',
          message: t('contest.not_active', locale),
        });
      }
    }

    const { judgeMode } = await this.judgeMode.resolveForSubmit(
      userId,
      problem.id,
      contestId,
      dto.judgeMode,
      locale,
    );

    const submission = await this.prisma.client.submission.create({
      data: {
        userId,
        problemId: problem.id,
        contestId,
        language: dto.language,
        judgeMode,
        sourceCode: dto.sourceCode,
        status: SubmissionStatus.QUEUED,
      },
    });

    await this.prisma.client.submissionTestcaseResult.createMany({
      data: problem.testcases.map((tc) => ({
        submissionId: submission.id,
        testcaseId: tc.id,
        verdict: TestcaseVerdict.PENDING,
      })),
    });

    this.logger.log(
      `Submission created id=${submission.id} user=${userId} problem=${problem.id} testcases=${problem.testcases.length} status=${submission.status}`,
    );
    await this.judgeTasks.enqueueNewSubmission(submission.id);

    return { number: submission.number, status: submission.status };
  }

  async resolveByNumber(raw: string) {
    const number = parseEntityNumber(raw, 'Submission');
    const sub = await this.prisma.client.submission.findUnique({
      where: { number },
    });
    if (!sub) throw new NotFoundException();
    return sub;
  }

  async listForUser(
    userId: string,
    problemId?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.client.submission.findMany({
        where: { userId, problemId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          number: true,
          status: true,
          language: true,
          score: true,
          createdAt: true,
          problem: { select: { number: true, title: true } },
          user: { select: { username: true, displayName: true } },
        },
      }),
      this.prisma.client.submission.count({
        where: { userId, problemId },
      }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDetailByNumber(numberParam: string, userId?: string) {
    const sub = await this.prisma.client.submission.findUnique({
      where: { number: parseEntityNumber(numberParam, 'Submission') },
      include: {
        testcaseResults: { include: { testcase: true } },
        problem: { select: { number: true, title: true } },
      },
    });
    if (!sub) throw new NotFoundException();
    if (userId && sub.userId !== userId) {
      const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') throw new ForbiddenException();
    }

    const isOwn = Boolean(userId && sub.userId === userId);
    const maxTimeMs = sub.testcaseResults.reduce(
      (m, r) => Math.max(m, r.timeMs ?? 0),
      0,
    );
    const maxMemoryKb = sub.testcaseResults.reduce(
      (m, r) => Math.max(m, r.memoryKb ?? 0),
      0,
    );

    return {
      id: sub.id,
      number: sub.number,
      status: sub.status,
      score: sub.score,
      timeMs: sub.timeMs,
      memoryKb: sub.memoryKb,
      maxTimeMs,
      maxMemoryKb,
      judgeMode: sub.judgeMode,
      language: sub.language,
      isOwn,
      sourceCode: isOwn ? sub.sourceCode : undefined,
      createdAt: sub.createdAt,
      problem: sub.problem,
      testcaseResults: sub.testcaseResults.map((r) => ({
        verdict: r.verdict,
        score: r.score,
        timeMs: r.timeMs,
        memoryKb: r.memoryKb,
        message: r.message,
        testcaseId: r.testcaseId,
        testcase: { ordinal: r.testcase.ordinal, isSample: r.testcase.isSample },
      })),
    };
  }

  streamChannel() {
    return RedisKeys.judgeEvents();
  }
}
