import { Injectable, NotFoundException } from '@nestjs/common';
import { JudgeMode, ContestVisibility } from '@epoch-judge/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.client.contest.findMany({
      where: { visibility: ContestVisibility.PUBLIC },
      orderBy: { startAt: 'desc' },
    });
  }

  async getBySlug(slug: string) {
    const contest = await this.prisma.client.contest.findUnique({
      where: { slug },
      include: {
        problems: { include: { problem: true }, orderBy: { ordinal: 'asc' } },
      },
    });
    if (!contest) throw new NotFoundException();
    return contest;
  }

  async isActiveForSubmit(contestId: string) {
    const contest = await this.prisma.client.contest.findUnique({
      where: { id: contestId },
    });
    if (!contest) return false;
    const now = new Date();
    return now >= contest.startAt && now <= contest.endAt;
  }

  async register(userId: string, contestId: string) {
    return this.prisma.client.contestRegistration.upsert({
      where: { contestId_userId: { contestId, userId } },
      create: { contestId, userId },
      update: {},
    });
  }

  async scoreboard(contestId: string, _frozen = false, forceFull = false) {
    const contest = await this.prisma.client.contest.findUnique({
      where: { id: contestId },
    });
    if (!contest) throw new NotFoundException();

    const now = new Date();
    const shouldFreeze =
      !forceFull && contest.freezeAt && now >= contest.freezeAt;

    const subs = await this.prisma.client.submission.findMany({
      where: {
        contestId,
        status: 'ACCEPTED',
        ...(shouldFreeze ? { createdAt: { lte: contest.freezeAt! } } : {}),
      },
      include: { user: { select: { username: true } } },
    });

    if (contest.judgeMode === JudgeMode.OI) {
      const byUser = new Map<string, { username: string; score: number }>();
      for (const s of subs) {
        const cur = byUser.get(s.userId) ?? {
          username: s.user.username,
          score: 0,
        };
        cur.score = Math.max(cur.score, s.score ?? 0);
        byUser.set(s.userId, cur);
      }
      return [...byUser.entries()]
        .map(([userId, v]) => ({ userId, ...v }))
        .sort((a, b) => b.score - a.score);
    }

    const byUser = new Map<
      string,
      { username: string; solved: number; penalty: number }
    >();
    for (const s of subs) {
      const cur = byUser.get(s.userId) ?? {
        username: s.user.username,
        solved: 0,
        penalty: 0,
      };
      cur.solved += 1;
      cur.penalty += Math.floor((s.createdAt.getTime() - contest.startAt.getTime()) / 60000);
      byUser.set(s.userId, cur);
    }
    return [...byUser.entries()]
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) =>
        b.solved !== a.solved ? b.solved - a.solved : a.penalty - b.penalty,
      );
  }
}
