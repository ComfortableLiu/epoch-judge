import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role, SubmissionStatus } from '@epoch-judge/db';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './users.dto';

const TERMINAL_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.ACCEPTED,
  SubmissionStatus.WRONG_ANSWER,
  SubmissionStatus.TIME_LIMIT_EXCEEDED,
  SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
  SubmissionStatus.RUNTIME_ERROR,
  SubmissionStatus.COMPILE_ERROR,
  SubmissionStatus.SECURITY_ERROR,
  SubmissionStatus.SYSTEM_ERROR,
];

type ContestListStatus = 'upcoming' | 'running' | 'ended';

function contestListStatus(
  startAt: Date,
  endAt: Date,
  now: Date,
): ContestListStatus {
  if (now < startAt) return 'upcoming';
  if (now > endAt) return 'ended';
  return 'running';
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      preferredJudgeMode: user.preferredJudgeMode,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { passwordHash, mustResetPassword: false },
    });
    return { ok: true };
  }

  async resetPasswordByAdmin(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('Cannot reset your own password here');
    }
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    const placeholder = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    await this.prisma.client.user.update({
      where: { id },
      data: { passwordHash: placeholder, mustResetPassword: true },
    });
    return { ok: true, username: user.username };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: {
      displayName?: string | null;
      email?: string | null;
      preferredLanguage?: UpdateProfileDto['preferredLanguage'];
      preferredJudgeMode?: UpdateProfileDto['preferredJudgeMode'];
    } = {};
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName.trim() || null;
    }
    if (dto.email !== undefined) {
      data.email = dto.email.trim() || null;
    }
    if (dto.preferredLanguage !== undefined) {
      data.preferredLanguage = dto.preferredLanguage;
    }
    if (dto.preferredJudgeMode !== undefined) {
      data.preferredJudgeMode = dto.preferredJudgeMode;
    }
    if (Object.keys(data).length === 0) {
      return this.getProfile(userId);
    }
    await this.prisma.client.user.update({
      where: { id: userId },
      data,
    });
    return this.getProfile(userId);
  }

  async batchImport(
    rows: { username: string; email?: string; password: string }[],
  ) {
    const results: { username: string; ok: boolean; error?: string }[] = [];
    for (const row of rows) {
      try {
        const passwordHash = await bcrypt.hash(row.password, 10);
        await this.prisma.client.user.upsert({
          where: { username: row.username },
          create: {
            username: row.username,
            email: row.email,
            passwordHash,
            role: Role.USER,
          },
          update: {
            email: row.email,
            passwordHash,
          },
        });
        results.push({ username: row.username, ok: true });
      } catch (e) {
        results.push({
          username: row.username,
          ok: false,
          error: e instanceof Error ? e.message : 'unknown',
        });
      }
    }
    return {
      total: rows.length,
      success: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      rows: results,
    };
  }

  async createUser(dto: AdminCreateUserDto) {
    const existing = await this.prisma.client.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new BadRequestException('Username already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.client.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        displayName: dto.displayName?.trim() || null,
        role: dto.role,
        passwordHash,
      },
    });
    return this.toAdminUser(user);
  }

  async updateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();

    if (dto.role && dto.role !== Role.ADMIN && user.role === Role.ADMIN) {
      const adminCount = await this.prisma.client.user.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the last admin');
      }
    }

    const data: {
      email?: string | null;
      displayName?: string | null;
      role?: Role;
      passwordHash?: string;
    } = {};
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.displayName !== undefined) data.displayName = dto.displayName || null;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.client.user.update({
      where: { id },
      data,
    });
    return this.toAdminUser(updated);
  }

  async deleteUser(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('Cannot delete your own account');
    }
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();

    if (user.role === Role.ADMIN) {
      const adminCount = await this.prisma.client.user.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin');
      }
    }

    await this.prisma.client.user.delete({ where: { id } });
    return { ok: true };
  }

  private toAdminUser(user: {
    id: string;
    username: string;
    email: string | null;
    displayName: string | null;
    role: Role;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async listUsers() {
    const users = await this.prisma.client.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });
    return users.map((u) => this.toAdminUser(u));
  }

  async getMyStats(userId: string) {
    const [totalSubmissions, verdictGroups, acceptedRows, attemptedRows, regs, contestSubRows] =
      await Promise.all([
        this.prisma.client.submission.count({ where: { userId } }),
        this.prisma.client.submission.groupBy({
          by: ['status'],
          where: { userId, status: { in: TERMINAL_STATUSES } },
          _count: { _all: true },
        }),
        this.prisma.client.submission.findMany({
          where: { userId, status: SubmissionStatus.ACCEPTED },
          select: { problemId: true },
          distinct: ['problemId'],
        }),
        this.prisma.client.submission.findMany({
          where: { userId, status: { in: TERMINAL_STATUSES } },
          select: { problemId: true },
          distinct: ['problemId'],
        }),
        this.prisma.client.contestRegistration.findMany({
          where: { userId },
          select: { contestId: true },
        }),
        this.prisma.client.submission.findMany({
          where: { userId, contestId: { not: null } },
          select: { contestId: true },
          distinct: ['contestId'],
        }),
      ]);

    const solvedCount = acceptedRows.length;
    const attemptedCount = attemptedRows.length;
    const passRatePercent =
      attemptedCount === 0
        ? 0
        : Math.round((solvedCount / attemptedCount) * 1000) / 10;

    const verdictBreakdown: Partial<Record<SubmissionStatus, number>> = {};
    for (const g of verdictGroups) {
      verdictBreakdown[g.status] = g._count._all;
    }

    const contestIdSet = new Set<string>();
    for (const r of regs) contestIdSet.add(r.contestId);
    for (const s of contestSubRows) {
      if (s.contestId) contestIdSet.add(s.contestId);
    }

    const now = new Date();
    const contests =
      contestIdSet.size === 0
        ? []
        : await Promise.all(
            (
              await this.prisma.client.contest.findMany({
                where: { id: { in: [...contestIdSet] } },
                orderBy: { startAt: 'desc' },
              })
            ).map(async (c) => {
              const [submissionCount, acceptedInContest] = await Promise.all([
                this.prisma.client.submission.count({
                  where: { userId, contestId: c.id },
                }),
                this.prisma.client.submission.findMany({
                  where: {
                    userId,
                    contestId: c.id,
                    status: SubmissionStatus.ACCEPTED,
                  },
                  select: { problemId: true },
                  distinct: ['problemId'],
                }),
              ]);
              return {
                contestId: c.id,
                number: c.number,
                title: c.title,
                startAt: c.startAt.toISOString(),
                endAt: c.endAt.toISOString(),
                status: contestListStatus(c.startAt, c.endAt, now),
                submissionCount,
                acceptedProblemCount: acceptedInContest.length,
              };
            }),
          );

    return {
      summary: {
        totalSubmissions,
        solvedCount,
        attemptedCount,
        passRatePercent,
      },
      verdictBreakdown,
      contests,
    };
  }

  async listMySolvedProblems(userId: string, page: number, pageSize: number) {
    const acSubs = await this.prisma.client.submission.findMany({
      where: { userId, status: SubmissionStatus.ACCEPTED },
      orderBy: { createdAt: 'asc' },
      select: { problemId: true, createdAt: true, contestId: true },
    });

    const firstByProblem = new Map<
      string,
      { createdAt: Date; contestId: string | null }
    >();
    for (const s of acSubs) {
      if (!firstByProblem.has(s.problemId)) {
        firstByProblem.set(s.problemId, {
          createdAt: s.createdAt,
          contestId: s.contestId,
        });
      }
    }

    const sorted = [...firstByProblem.entries()].sort(
      (a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime(),
    );
    const total = sorted.length;
    const slice = sorted.slice((page - 1) * pageSize, page * pageSize);

    if (slice.length === 0) {
      return { items: [], total, page, pageSize };
    }

    const problemIds = slice.map(([id]) => id);
    const problems = await this.prisma.client.problem.findMany({
      where: { id: { in: problemIds } },
      select: { id: true, number: true, title: true },
    });
    const problemMap = new Map(problems.map((p) => [p.id, p]));

    const contestIds = [
      ...new Set(
        slice.map(([, m]) => m.contestId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const contestRows =
      contestIds.length > 0
        ? await this.prisma.client.contest.findMany({
            where: { id: { in: contestIds } },
            select: { id: true, number: true },
          })
        : [];
    const contestMap = new Map(contestRows.map((c) => [c.id, c.number]));

    const items = slice.map(([problemId, meta]) => {
      const p = problemMap.get(problemId)!;
      return {
        problemId,
        number: p.number,
        title: p.title,
        firstAcceptedAt: meta.createdAt.toISOString(),
        contestNumber: meta.contestId
          ? (contestMap.get(meta.contestId) ?? null)
          : null,
      };
    });

    return { items, total, page, pageSize };
  }
}
