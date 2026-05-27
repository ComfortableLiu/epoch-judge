import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubmissionStatus } from '@epoch-judge/db';
import { isSubmissionTerminal } from '@epoch-judge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JudgeTaskService } from '../judge/judge-task.service';
import type { RejudgeScope } from './rejudge.dto';

type CandidateRow = {
  id: string;
  status: string;
  language: string;
  score: number | null;
  createdAt: Date;
  problemId: string;
  contestId: string | null;
  number: number;
  problem: { number: number; title: string };
  user: { username: string; displayName: string | null };
};

const CANDIDATE_SELECT = {
  id: true,
  number: true,
  status: true,
  language: true,
  score: true,
  createdAt: true,
  problemId: true,
  contestId: true,
  problem: { select: { number: true, title: true } },
  user: { select: { username: true, displayName: true } },
} as const;

export type RejudgeSkip = { submissionId: string; reason: string };

export type RejudgePreviewResult = {
  eligibleCount: number;
  skipped: RejudgeSkip[];
  sampleIds: string[];
};

export type RejudgeExecuteResult = {
  queued: number;
  skipped: RejudgeSkip[];
};

@Injectable()
export class RejudgeService {
  private readonly maxBatch: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly judgeTasks: JudgeTaskService,
    config: ConfigService,
  ) {
    this.maxBatch = Number(config.get('REJUDGE_BATCH_MAX', 500));
  }

  async listCandidates(
    scope: RejudgeScope,
    ids: string[],
    submissionIds?: string[],
    statuses?: string[],
  ) {
    const resolved = await this.resolveSubmissions(
      scope,
      ids,
      submissionIds,
      statuses,
    );
    return resolved.rows;
  }

  async preview(
    scope: RejudgeScope,
    ids: string[],
    submissionIds?: string[],
    statuses?: string[],
  ): Promise<RejudgePreviewResult> {
    const { eligible, skipped } = await this.partitionEligible(
      scope,
      ids,
      submissionIds,
      statuses,
    );
    if (eligible.length > this.maxBatch) {
      throw new BadRequestException(
        `Too many submissions (${eligible.length}); max ${this.maxBatch}`,
      );
    }
    return {
      eligibleCount: eligible.length,
      skipped,
      sampleIds: eligible.slice(0, 10).map((s: CandidateRow) => s.id),
    };
  }

  async execute(
    scope: RejudgeScope,
    ids: string[],
    submissionIds?: string[],
    statuses?: string[],
  ): Promise<RejudgeExecuteResult> {
    const { eligible, skipped } = await this.partitionEligible(
      scope,
      ids,
      submissionIds,
      statuses,
    );
    if (eligible.length > this.maxBatch) {
      throw new BadRequestException(
        `Too many submissions (${eligible.length}); max ${this.maxBatch}`,
      );
    }

    let queued = 0;
    const errors: RejudgeSkip[] = [...skipped];

    for (const sub of eligible) {
      try {
        await this.rejudgeOne(sub.id);
        queued += 1;
      } catch (e) {
        errors.push({
          submissionId: sub.id,
          reason: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }

    return { queued, skipped: errors };
  }

  private async partitionEligible(
    scope: RejudgeScope,
    ids: string[],
    submissionIds?: string[],
    statuses?: string[],
  ) {
    const { rows } = await this.resolveSubmissions(
      scope,
      ids,
      submissionIds,
      statuses,
    );
    const eligible: CandidateRow[] = [];
    const skipped: RejudgeSkip[] = [];

    for (const row of rows) {
      if (!isSubmissionTerminal(row.status)) {
        skipped.push({
          submissionId: row.id,
          reason: `Status ${row.status} is not terminal`,
        });
        continue;
      }
      eligible.push(row);
    }

    return { eligible, skipped };
  }

  private async resolveSubmissions(
    scope: RejudgeScope,
    ids: string[],
    submissionIds?: string[],
    statuses?: string[],
  ): Promise<{ rows: CandidateRow[] }> {
    const statusIn = this.statusFilter(statuses);

    if (scope === 'submission') {
      if (!ids.length) {
        const rows = await this.prisma.client.submission.findMany({
          where: { status: { in: statusIn } },
          orderBy: { createdAt: 'desc' },
          take: 200,
          select: CANDIDATE_SELECT,
        });
        return { rows };
      }
      const rows = await this.prisma.client.submission.findMany({
        where: { id: { in: ids }, status: { in: statusIn } },
        select: CANDIDATE_SELECT,
      });
      return { rows: this.applySubmissionFilter(rows, submissionIds) };
    }

    if (!ids.length) {
      return { rows: [] };
    }

    if (scope === 'problem') {
      const problems = await this.prisma.client.problem.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });
      if (problems.length !== ids.length) {
        throw new NotFoundException('One or more problems not found');
      }
      const rows = await this.prisma.client.submission.findMany({
        where: {
          problemId: { in: ids },
          status: { in: statusIn },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: CANDIDATE_SELECT,
      });
      return { rows: this.applySubmissionFilter(rows, submissionIds) };
    }

    const contests = await this.prisma.client.contest.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (contests.length !== ids.length) {
      throw new NotFoundException('One or more contests not found');
    }
    const rows = await this.prisma.client.submission.findMany({
      where: {
        contestId: { in: ids },
        status: { in: statusIn },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
      select: CANDIDATE_SELECT,
    });
    return { rows: this.applySubmissionFilter(rows, submissionIds) };
  }

  private applySubmissionFilter<T extends { id: string }>(
    rows: T[],
    submissionIds?: string[],
  ): T[] {
    if (!submissionIds?.length) return rows;
    const set = new Set(submissionIds);
    return rows.filter((r) => set.has(r.id));
  }

  private terminalStatusFilter(): SubmissionStatus[] {
    return Object.values(SubmissionStatus).filter((s) =>
      isSubmissionTerminal(s),
    ) as SubmissionStatus[];
  }

  private statusFilter(statuses?: string[]): SubmissionStatus[] {
    const terminal = this.terminalStatusFilter();
    if (!statuses?.length) return terminal;
    const allowed = new Set(terminal);
    const picked = statuses.filter((s) =>
      allowed.has(s as SubmissionStatus),
    ) as SubmissionStatus[];
    return picked.length ? picked : terminal;
  }

  private async rejudgeOne(submissionId: string) {
    const sub = await this.prisma.client.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, status: true },
    });
    if (!sub) throw new NotFoundException(`Submission ${submissionId} not found`);
    if (!isSubmissionTerminal(sub.status)) {
      throw new BadRequestException(`Submission ${submissionId} is not terminal`);
    }
    await this.judgeTasks.enqueueRejudge(submissionId);
  }
}
