import { Injectable, NotFoundException } from '@nestjs/common';
import { ContestVisibility, ProblemVisibility, Role } from '@epoch-judge/db';
import { canPreviewContestBeforeStart } from '../contests/contest-access.util';
import { PrismaService } from '../prisma/prisma.service';

export type ProblemAccessUser = { id: string; role: Role };
export type ProblemAccessContext = { contestId?: string };

@Injectable()
export class ProblemAccessService {
  constructor(private readonly prisma: PrismaService) {}

  isStaff(role?: Role): boolean {
    return role === Role.ADMIN || role === Role.PROBLEM_EDITOR;
  }

  async isLockedByActiveContest(problemId: string): Promise<boolean> {
    const now = new Date();
    const link = await this.prisma.client.contestProblem.findFirst({
      where: {
        problemId,
        contest: { endAt: { gt: now } },
      },
      select: { id: true },
    });
    return Boolean(link);
  }

  async getLockedProblemIds(): Promise<Set<string>> {
    const now = new Date();
    const rows = await this.prisma.client.contestProblem.findMany({
      where: { contest: { endAt: { gt: now } } },
      select: { problemId: true },
    });
    return new Set(rows.map((r) => r.problemId));
  }

  async hasContestAccess(
    contestId: string,
    user: ProblemAccessUser | undefined,
  ): Promise<boolean> {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;

    const contest = await this.prisma.client.contest.findUnique({
      where: { id: contestId },
      select: {
        visibility: true,
        accessPassword: true,
        startAt: true,
        createdById: true,
      },
    });
    if (!contest) return false;

    if (!canPreviewContestBeforeStart(contest, user)) return false;

    if (contest.createdById === user.id) return true;

    if (contest.accessPassword?.length) {
      const reg = await this.prisma.client.contestRegistration.findUnique({
        where: { contestId_userId: { contestId, userId: user.id } },
      });
      if (!reg?.passwordVerified) return false;
    }

    if (contest.visibility === ContestVisibility.PUBLIC) return true;

    const reg = await this.prisma.client.contestRegistration.findUnique({
      where: { contestId_userId: { contestId, userId: user.id } },
    });
    return Boolean(reg);
  }

  async isProblemInContest(
    problemId: string,
    contestId: string,
  ): Promise<boolean> {
    const row = await this.prisma.client.contestProblem.findUnique({
      where: { contestId_problemId: { contestId, problemId } },
    });
    return Boolean(row);
  }

  async canView(
    problem: {
      id: string;
      visibility: ProblemVisibility;
      createdById: string | null;
    },
    user: ProblemAccessUser | undefined,
    context?: ProblemAccessContext,
  ): Promise<boolean> {
    if (user && this.isStaff(user.role)) return true;
    if (user && problem.createdById && problem.createdById === user.id) {
      return true;
    }

    if (context?.contestId && user) {
      const inContest = await this.isProblemInContest(
        problem.id,
        context.contestId,
      );
      if (
        inContest &&
        (await this.hasContestAccess(context.contestId, user))
      ) {
        return true;
      }
    }

    if (await this.isLockedByActiveContest(problem.id)) {
      return false;
    }

    return problem.visibility === ProblemVisibility.PUBLIC;
  }

  async assertCanView(
    problem: {
      id: string;
      visibility: ProblemVisibility;
      createdById: string | null;
    },
    user: ProblemAccessUser | undefined,
    context?: ProblemAccessContext,
  ): Promise<void> {
    if (!(await this.canView(problem, user, context))) {
      throw new NotFoundException();
    }
  }
}
