import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JudgeMode, ContestVisibility, Role } from '@epoch-judge/db';
import { isSubmissionTerminal } from '@epoch-judge/shared';
import * as bcrypt from 'bcryptjs';
import { t } from '../common/messages';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProblemAccessService,
  type ProblemAccessUser,
} from '../problems/problem-access.service';
import { canPreviewContestBeforeStart } from './contest-access.util';
import type { CreateContestDto, UpdateContestDto } from './contests.dto';

function contestProblemLabel(ordinal: number): string {
  if (ordinal < 26) return String.fromCharCode(65 + ordinal);
  return `P${ordinal + 1}`;
}

function parseContestNumber(raw: string): number {
  const number = Number.parseInt(raw, 10);
  if (!Number.isFinite(number) || number < 1) {
    throw new NotFoundException();
  }
  return number;
}

export type ContestScoreboardRow = {
  userId: string;
  displayName: string;
  isStarTeam: boolean;
  rank: number | null;
  score?: number;
  solved?: number;
  penalty?: number;
};

function contestDisplayLabel(snapshot: string, isStarTeam: boolean): string {
  return isStarTeam ? `*${snapshot}` : snapshot;
}

export type ContestListStatus = 'upcoming' | 'running' | 'ended';

function contestListStatus(
  startAt: Date,
  endAt: Date,
  now: Date,
): ContestListStatus {
  if (now < startAt) return 'upcoming';
  if (now > endAt) return 'ended';
  return 'running';
}

async function hashPassword(plain: string): Promise<string> {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  return bcrypt.hash(plain, rounds);
}

@Injectable()
export class ContestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly problemAccess: ProblemAccessService,
  ) {}

  async resolveByNumber(raw: string) {
    const number = parseContestNumber(raw);
    const contest = await this.prisma.client.contest.findUnique({
      where: { number },
    });
    if (!contest) throw new NotFoundException();
    return contest;
  }

  async resolveContestId(raw: string): Promise<string> {
    const contest = await this.resolveByNumber(raw);
    return contest.id;
  }

  /** Accepts numeric public id or internal cuid. */
  async resolveContestRef(ref: string | undefined): Promise<string | undefined> {
    if (!ref?.trim()) return undefined;
    const trimmed = ref.trim();
    if (/^\d+$/.test(trimmed)) {
      const c = await this.prisma.client.contest.findUnique({
        where: { number: Number.parseInt(trimmed, 10) },
      });
      if (c) return c.id;
    }
    const byId = await this.prisma.client.contest.findUnique({
      where: { id: trimmed },
    });
    return byId?.id;
  }

  private needsPassword(contest: { accessPassword: string | null }) {
    return Boolean(contest.accessPassword?.length);
  }

  async hasContestEntryAccess(
    contestId: string,
    user: ProblemAccessUser | undefined,
  ): Promise<boolean> {
    const contest = await this.prisma.client.contest.findUnique({
      where: { id: contestId },
      select: { accessPassword: true, startAt: true, createdById: true },
    });
    if (!contest) return false;

    if (!canPreviewContestBeforeStart(contest, user)) return false;

    if (user?.role === Role.ADMIN) return true;
    if (user && contest.createdById === user.id) return true;

    if (!this.needsPassword(contest)) return true;
    if (!user) return false;

    const reg = await this.prisma.client.contestRegistration.findUnique({
      where: { contestId_userId: { contestId, userId: user.id } },
    });
    return Boolean(reg?.passwordVerified);
  }

  async assertContestViewAccess(
    contestId: string,
    user: ProblemAccessUser | undefined,
    locale: string,
  ): Promise<void> {
    if (await this.hasContestEntryAccess(contestId, user)) return;

    const contest = await this.prisma.client.contest.findUnique({
      where: { id: contestId },
      select: { startAt: true },
    });
    if (!contest) throw new NotFoundException();

    if (new Date() < contest.startAt) {
      throw new ForbiddenException({
        messageKey: 'contest.not_started',
        message: t('contest.not_started', locale),
      });
    }
    throw new ForbiddenException('Contest access denied');
  }

  async list() {
    const now = new Date();
    const rows = await this.prisma.client.contest.findMany({
      where: { visibility: ContestVisibility.PUBLIC },
      orderBy: { startAt: 'desc' },
      select: {
        id: true,
        number: true,
        title: true,
        visibility: true,
        judgeMode: true,
        startAt: true,
        endAt: true,
        freezeAt: true,
        accessPassword: true,
        _count: { select: { problems: true } },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      number: c.number,
      title: c.title,
      visibility: c.visibility,
      judgeMode: c.judgeMode,
      startAt: c.startAt.toISOString(),
      endAt: c.endAt.toISOString(),
      freezeAt: c.freezeAt?.toISOString() ?? null,
      requiresPassword: Boolean(c.accessPassword?.length),
      problemCount: c._count.problems,
      status: contestListStatus(c.startAt, c.endAt, now),
    }));
  }

  async listAdmin() {
    const rows = await this.prisma.client.contest.findMany({
      orderBy: { startAt: 'desc' },
      select: {
        id: true,
        number: true,
        title: true,
        visibility: true,
        judgeMode: true,
        startAt: true,
        endAt: true,
        freezeAt: true,
        accessPassword: true,
        createdAt: true,
        _count: {
          select: { problems: true, registrations: true, submissions: true },
        },
      },
    });
    return rows.map(({ accessPassword, ...rest }) => ({
      ...rest,
      requiresPassword: Boolean(accessPassword?.length),
    }));
  }

  async getAdminById(id: string) {
    const contest = await this.prisma.client.contest.findUnique({
      where: { id },
      include: {
        problems: {
          orderBy: { ordinal: 'asc' },
          include: {
            problem: { select: { id: true, number: true, title: true } },
          },
        },
      },
    });
    if (!contest) throw new NotFoundException();
    return {
      id: contest.id,
      number: contest.number,
      title: contest.title,
      description: contest.description,
      visibility: contest.visibility,
      judgeMode: contest.judgeMode,
      startAt: contest.startAt.toISOString(),
      endAt: contest.endAt.toISOString(),
      freezeAt: contest.freezeAt?.toISOString() ?? null,
      requiresPassword: Boolean(contest.accessPassword?.length),
      problemIds: contest.problems.map((p) => p.problemId),
      problems: contest.problems.map((p) => ({
        problemId: p.problemId,
        label: p.label,
        number: p.problem.number,
        title: p.problem.title,
      })),
    };
  }

  async createAdmin(dto: CreateContestDto, createdById: string) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }
    const freezeAt =
      dto.freezeAt === null || dto.freezeAt === undefined
        ? null
        : new Date(dto.freezeAt);
    if (freezeAt && (freezeAt < startAt || freezeAt > endAt)) {
      throw new BadRequestException('freezeAt must be within contest duration');
    }

    if (dto.problemIds?.length) {
      await this.assertProblemsExist(dto.problemIds);
    }

    const contest = await this.prisma.client.contest.create({
      data: {
        title: dto.title,
        description: dto.description,
        visibility: dto.visibility,
        judgeMode: dto.judgeMode,
        startAt,
        endAt,
        freezeAt,
        createdById,
        accessPassword: dto.accessPassword?.trim()
          ? await hashPassword(dto.accessPassword.trim())
          : null,
        problems: dto.problemIds?.length
          ? {
              create: dto.problemIds.map((problemId, ordinal) => ({
                problemId,
                label: contestProblemLabel(ordinal),
                ordinal,
              })),
            }
          : undefined,
      },
    });

    return this.getAdminById(contest.id);
  }

  async updateAdmin(id: string, dto: UpdateContestDto) {
    const existing = await this.prisma.client.contest.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException();

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    let freezeAt: Date | null =
      dto.freezeAt === null
        ? null
        : dto.freezeAt !== undefined
          ? new Date(dto.freezeAt)
          : existing.freezeAt;
    if (freezeAt && (freezeAt < startAt || freezeAt > endAt)) {
      throw new BadRequestException('freezeAt must be within contest duration');
    }

    if (dto.problemIds !== undefined) {
      await this.assertProblemsExist(dto.problemIds);
    }

    await this.prisma.client.$transaction(async (tx) => {
      const data: {
        title?: string;
        description?: string;
        visibility?: ContestVisibility;
        judgeMode?: JudgeMode;
        startAt?: Date;
        endAt?: Date;
        freezeAt?: Date | null;
        accessPassword?: string | null;
      } = {};
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.visibility !== undefined) data.visibility = dto.visibility;
      if (dto.judgeMode !== undefined) data.judgeMode = dto.judgeMode;
      if (dto.startAt !== undefined) data.startAt = startAt;
      if (dto.endAt !== undefined) data.endAt = endAt;
      if (dto.freezeAt !== undefined) data.freezeAt = freezeAt;
      if (dto.accessPassword !== undefined) {
        const trimmed = dto.accessPassword?.trim();
        data.accessPassword = trimmed ? await hashPassword(trimmed) : null;
      }

      await tx.contest.update({
        where: { id },
        data,
      });

      if (dto.problemIds !== undefined) {
        await tx.contestProblem.deleteMany({ where: { contestId: id } });
        if (dto.problemIds.length) {
          await tx.contestProblem.createMany({
            data: dto.problemIds.map((problemId, ordinal) => ({
              contestId: id,
              problemId,
              label: contestProblemLabel(ordinal),
              ordinal,
            })),
          });
        }
      }
    });

    return this.getAdminById(id);
  }

  async deleteAdmin(id: string) {
    const contest = await this.prisma.client.contest.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });
    if (!contest) throw new NotFoundException();
    if (contest._count.submissions > 0) {
      throw new BadRequestException(
        'Cannot delete contest with existing submissions',
      );
    }

    await this.prisma.client.contest.delete({ where: { id } });
    return { ok: true };
  }

  private async assertProblemsExist(problemIds: string[]) {
    const found = await this.prisma.client.problem.findMany({
      where: { id: { in: problemIds } },
      select: { id: true },
    });
    if (found.length !== problemIds.length) {
      throw new BadRequestException('One or more problems not found');
    }
  }

  async getDetailByNumber(
    numberParam: string,
    user: ProblemAccessUser | undefined,
  ) {
    const contest = await this.prisma.client.contest.findUnique({
      where: { number: parseContestNumber(numberParam) },
      include: {
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                number: true,
                title: true,
                visibility: true,
                createdById: true,
              },
            },
          },
          orderBy: { ordinal: 'asc' },
        },
      },
    });
    if (!contest) throw new NotFoundException();

    const now = new Date();
    const status = contestListStatus(contest.startAt, contest.endAt, now);
    const requiresPassword = this.needsPassword(contest);
    const accessGranted = await this.hasContestEntryAccess(contest.id, user);

    if (!accessGranted) {
      const notStarted = now < contest.startAt;
      return {
        id: contest.id,
        number: contest.number,
        title: contest.title,
        judgeMode: contest.judgeMode,
        startAt: contest.startAt.toISOString(),
        endAt: contest.endAt.toISOString(),
        requiresPassword,
        accessGranted: false,
        accessDeniedReason: notStarted ? 'not_started' : 'password',
        status,
        canSubmit: false,
        previewMode: false,
        problems: [],
        description: '',
        freezeAt: null,
      };
    }

    const previewMode = now < contest.startAt;
    const canSubmit = now >= contest.startAt && now <= contest.endAt;

    const visibleProblems = [];
    for (const cp of contest.problems) {
      const ok = await this.problemAccess.canView(cp.problem, user, {
        contestId: contest.id,
      });
      if (ok) {
        visibleProblems.push({
          label: cp.label,
          problem: { number: cp.problem.number, title: cp.problem.title },
        });
      }
    }

    return {
      id: contest.id,
      number: contest.number,
      title: contest.title,
      description: contest.description,
      visibility: contest.visibility,
      judgeMode: contest.judgeMode,
      startAt: contest.startAt.toISOString(),
      endAt: contest.endAt.toISOString(),
      freezeAt: contest.freezeAt?.toISOString() ?? null,
      requiresPassword,
      accessGranted: true,
      accessDeniedReason: null,
      status,
      canSubmit,
      previewMode,
      problems: visibleProblems,
    };
  }

  private async displayNameSnapshotForUser(userId: string): Promise<string> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { username: true, displayName: true },
    });
    if (!user) throw new NotFoundException();
    const nick = user.displayName?.trim();
    return nick || user.username;
  }

  private async ensureRegistration(
    contestId: string,
    userId: string,
    opts: { passwordVerified?: boolean; isStarTeam?: boolean } = {},
  ) {
    const existing = await this.prisma.client.contestRegistration.findUnique({
      where: { contestId_userId: { contestId, userId } },
    });
    if (existing) {
      const data: { passwordVerified?: boolean; isStarTeam?: boolean } = {};
      if (opts.passwordVerified !== undefined) {
        data.passwordVerified = opts.passwordVerified;
      }
      if (opts.isStarTeam !== undefined) {
        data.isStarTeam = opts.isStarTeam;
      }
      if (Object.keys(data).length === 0) return existing;
      return this.prisma.client.contestRegistration.update({
        where: { id: existing.id },
        data,
      });
    }
    const displayNameSnapshot = await this.displayNameSnapshotForUser(userId);
    return this.prisma.client.contestRegistration.create({
      data: {
        contestId,
        userId,
        displayNameSnapshot,
        passwordVerified: opts.passwordVerified ?? false,
        isStarTeam: opts.isStarTeam ?? false,
      },
    });
  }

  async listRegistrationsAdmin(contestId: string) {
    const contest = await this.prisma.client.contest.findUnique({
      where: { id: contestId },
    });
    if (!contest) throw new NotFoundException();

    const rows = await this.prisma.client.contestRegistration.findMany({
      where: { contestId },
      orderBy: [{ isStarTeam: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: { select: { username: true, displayName: true } },
      },
    });
    return rows.map((r) => ({
      userId: r.userId,
      username: r.user.username,
      displayNameSnapshot: r.displayNameSnapshot,
      displayName: contestDisplayLabel(r.displayNameSnapshot, r.isStarTeam),
      isStarTeam: r.isStarTeam,
      passwordVerified: r.passwordVerified,
      createdAt: r.createdAt.toISOString(),
      currentDisplayName: r.user.displayName,
    }));
  }

  async upsertRegistrationAdmin(
    contestId: string,
    userId: string,
    isStarTeam = false,
  ) {
    const contest = await this.prisma.client.contest.findUnique({
      where: { id: contestId },
    });
    if (!contest) throw new NotFoundException();

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const passwordVerified = !this.needsPassword(contest);
    return this.ensureRegistration(contestId, userId, {
      passwordVerified,
      isStarTeam,
    });
  }

  async updateRegistrationAdmin(
    contestId: string,
    userId: string,
    isStarTeam: boolean,
  ) {
    const reg = await this.prisma.client.contestRegistration.findUnique({
      where: { contestId_userId: { contestId, userId } },
    });
    if (!reg) {
      return this.upsertRegistrationAdmin(contestId, userId, isStarTeam);
    }
    return this.prisma.client.contestRegistration.update({
      where: { id: reg.id },
      data: { isStarTeam },
    });
  }

  async verifyPassword(
    numberParam: string,
    userId: string,
    password: string,
  ) {
    const contest = await this.resolveByNumber(numberParam);
    if (!this.needsPassword(contest)) {
      return { ok: true };
    }
    const matches = await bcrypt.compare(password, contest.accessPassword!);
    if (!matches) {
      throw new ForbiddenException('Invalid contest password');
    }
    await this.ensureRegistration(contest.id, userId, {
      passwordVerified: true,
    });
    return { ok: true };
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
    const contest = await this.prisma.client.contest.findUnique({
      where: { id: contestId },
    });
    if (!contest) throw new NotFoundException();

    const passwordVerified = !this.needsPassword(contest);
    return this.ensureRegistration(contestId, userId, { passwordVerified });
  }

  async assertSubmitAccess(contestId: string, user: ProblemAccessUser) {
    if (user.role === Role.ADMIN) return;

    const contest = await this.prisma.client.contest.findUnique({
      where: { id: contestId },
    });
    if (!contest) throw new NotFoundException();

    if (this.needsPassword(contest)) {
      const reg = await this.prisma.client.contestRegistration.findUnique({
        where: { contestId_userId: { contestId, userId: user.id } },
      });
      if (!reg?.passwordVerified) {
        throw new ForbiddenException('Contest password required');
      }
    }

    const reg = await this.prisma.client.contestRegistration.findUnique({
      where: { contestId_userId: { contestId, userId: user.id } },
    });
    if (!reg) {
      throw new ForbiddenException('Contest registration required');
    }
  }

  /**
   * Calculate contest scoreboard.
   *
   * ACM mode penalty formula (standard ACM-ICPC rules):
   *   penalty = sum over solved problems of (first_ac_time_minutes + 20 * failed_attempts_before_ac)
   *   - first_ac_time_minutes: minutes from contest start to first accepted submission
   *   - failed_attempts_before_ac: count of non-AC submissions before the first AC on that problem
   *   - Submissions after the first AC are ignored
   *   - Problems without AC do not contribute to penalty
   *
   * OI mode: ranks by total score (best score per problem per user).
   */
  async scoreboard(
    numberOrId: string,
    user: ProblemAccessUser | undefined,
    locale: string,
    _frozen = false,
    forceFull = false,
  ): Promise<ContestScoreboardRow[]> {
    const contestId = await this.resolveContestId(numberOrId);
    const contest = await this.prisma.client.contest.findUnique({
      where: { id: contestId },
    });
    if (!contest) throw new NotFoundException();

    await this.assertContestViewAccess(contestId, user, locale);

    const registrations = await this.prisma.client.contestRegistration.findMany({
      where: { contestId },
      select: {
        userId: true,
        displayNameSnapshot: true,
        isStarTeam: true,
      },
    });
    const regByUser = new Map(
      registrations.map((r) => [r.userId, r] as const),
    );

    const now = new Date();
    const shouldFreeze =
      !forceFull && contest.freezeAt && now >= contest.freezeAt;

    // Query ALL submissions (not just ACCEPTED) to calculate ACM penalty correctly
    const subs = await this.prisma.client.submission.findMany({
      where: {
        contestId,
        ...(shouldFreeze ? { createdAt: { lte: contest.freezeAt! } } : {}),
      },
      select: {
        id: true,
        userId: true,
        problemId: true,
        status: true,
        score: true,
        createdAt: true,
        user: { select: { username: true, displayName: true } },
      },
    });

    type Stats = { score?: number; solved?: number; penalty?: number };
    const statsByUser = new Map<string, Stats>();

    if (contest.judgeMode === JudgeMode.OI) {
      // OI mode: keep best score per problem per user
      for (const s of subs) {
        const cur = statsByUser.get(s.userId) ?? { score: 0 };
        cur.score = Math.max(cur.score ?? 0, s.score ?? 0);
        statsByUser.set(s.userId, cur);
      }
    } else {
      // ACM mode: calculate penalty with failed attempts before first AC
      // Group submissions by (userId, problemId)
      const subsByUserProblem = new Map<
        string,
        Array<{ status: string; createdAt: Date }>
      >();
      for (const s of subs) {
        const key = `${s.userId}:${s.problemId}`;
        const arr = subsByUserProblem.get(key) ?? [];
        arr.push({ status: s.status, createdAt: s.createdAt });
        subsByUserProblem.set(key, arr);
      }

      // Process each (user, problem) group
      for (const [key, userSubs] of subsByUserProblem) {
        const userId = key.split(':')[0];
        // Sort by submission time
        userSubs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        // Find first AC and count failures before it
        let firstAcTime: Date | null = null;
        let failedBeforeAc = 0;

        for (const sub of userSubs) {
          if (sub.status === 'ACCEPTED') {
            firstAcTime = sub.createdAt;
            break;
          }
          // Only count terminal non-AC statuses as failed attempts.
          // Non-terminal statuses (QUEUED, JUDGING, etc.) are not real failures.
          if (isSubmissionTerminal(sub.status) && sub.status !== 'ACCEPTED') {
            failedBeforeAc++;
          }
        }

        // Only count solved problems (those with AC)
        if (firstAcTime) {
          const cur = statsByUser.get(userId) ?? { solved: 0, penalty: 0 };
          cur.solved = (cur.solved ?? 0) + 1;
          // Penalty = time from contest start to first AC (minutes) + 20 * failed attempts before AC
          const acMinutes = Math.floor(
            (firstAcTime.getTime() - contest.startAt.getTime()) / 60000,
          );
          cur.penalty = (cur.penalty ?? 0) + acMinutes + 20 * failedBeforeAc;
          statsByUser.set(userId, cur);
        }
      }
    }

    const buildRow = (
      userId: string,
      stats: Stats,
      isStarTeam: boolean,
      snapshot: string,
      rank: number | null,
    ): ContestScoreboardRow => ({
      userId,
      displayName: contestDisplayLabel(snapshot, isStarTeam),
      isStarTeam,
      rank,
      ...(isStarTeam
        ? {}
        : contest.judgeMode === JudgeMode.OI
          ? { score: stats.score ?? 0 }
          : { solved: stats.solved ?? 0, penalty: stats.penalty ?? 0 }),
    });

    const official: Array<{ userId: string; stats: Stats; snapshot: string }> =
      [];
    const star: Array<{ userId: string; snapshot: string }> = [];

    for (const [userId, stats] of statsByUser) {
      const reg = regByUser.get(userId);
      const snapshot =
        reg?.displayNameSnapshot ??
        subs.find((s) => s.userId === userId)?.user.displayName?.trim() ??
        subs.find((s) => s.userId === userId)?.user.username ??
        userId;
      if (reg?.isStarTeam) {
        star.push({ userId, snapshot });
      } else {
        official.push({ userId, stats, snapshot });
      }
    }

    if (contest.judgeMode === JudgeMode.OI) {
      official.sort((a, b) => (b.stats.score ?? 0) - (a.stats.score ?? 0));
    } else {
      official.sort((a, b) => {
        const sa = a.stats.solved ?? 0;
        const sb = b.stats.solved ?? 0;
        if (sb !== sa) return sb - sa;
        return (a.stats.penalty ?? 0) - (b.stats.penalty ?? 0);
      });
    }

    const rows: ContestScoreboardRow[] = official.map((entry, index) =>
      buildRow(entry.userId, entry.stats, false, entry.snapshot, index + 1),
    );

    star
      .sort((a, b) => a.snapshot.localeCompare(b.snapshot, 'zh-CN'))
      .forEach((entry) => {
        rows.push(
          buildRow(entry.userId, {}, true, entry.snapshot, null),
        );
      });

    return rows;
  }
}
