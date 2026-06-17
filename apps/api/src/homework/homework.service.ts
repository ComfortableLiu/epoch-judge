import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, SubmissionStatus } from '@epoch-judge/db';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto } from './homework.dto';

@Injectable()
export class HomeworkService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHomeworkDto, userId: string, userRole: Role) {
    const cls = await this.prisma.client.class.findUnique({
      where: { id: dto.classId },
    });
    if (!cls) throw new NotFoundException('班级不存在');

    if (cls.teacherId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('只有班级教师或管理员可以布置作业');
    }

    const homework = await this.prisma.client.homework.create({
      data: {
        classId: dto.classId,
        title: dto.title,
        description: dto.description ?? '',
        deadline: new Date(dto.deadline),
        problems: {
          create: dto.problemIds.map((problemId, index) => ({
            problemId,
            ordinal: index,
          })),
        },
      },
      include: {
        problems: { orderBy: { ordinal: 'asc' } },
      },
    });

    return homework;
  }

  async list(userId: string, userRole: Role, classId?: string) {
    const isTeacher =
      userRole === Role.ADMIN || userRole === Role.PROBLEM_EDITOR;

    if (isTeacher && classId) {
      // Teacher viewing homework for a specific class they own
      const cls = await this.prisma.client.class.findUnique({
        where: { id: classId },
      });
      if (!cls) throw new NotFoundException('班级不存在');
      if (cls.teacherId !== userId && userRole !== Role.ADMIN) {
        throw new ForbiddenException('无权查看该班级作业');
      }
      return this.listForClass(classId);
    }

    if (isTeacher) {
      // Teacher viewing all their classes' homework
      const classes = await this.prisma.client.class.findMany({
        where: { teacherId: userId },
        select: { id: true },
      });
      const classIds = classes.map((c) => c.id);
      if (classIds.length === 0) return [];
      return this.listForClasses(classIds);
    }

    // Student: get homework for all classes they're in
    const memberships = await this.prisma.client.classMember.findMany({
      where: { userId },
      select: { classId: true },
    });
    const classIds = memberships.map((m) => m.classId);
    if (classIds.length === 0) return [];

    return this.listForStudent(classIds, userId);
  }

  private async listForClass(classId: string) {
    const homeworks = await this.prisma.client.homework.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
      include: {
        class: { select: { id: true, name: true } },
        problems: {
          orderBy: { ordinal: 'asc' },
          include: {
            problem: { select: { id: true, number: true, title: true } },
          },
        },
        _count: { select: { problems: true } },
      },
    });

    return homeworks.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      deadline: h.deadline,
      createdAt: h.createdAt,
      className: h.class.name,
      classId: h.class.id,
      problemCount: h._count.problems,
      problems: h.problems.map((p) => ({
        id: p.problem.id,
        number: p.problem.number,
        title: p.problem.title,
      })),
    }));
  }

  private async listForClasses(classIds: string[]) {
    const homeworks = await this.prisma.client.homework.findMany({
      where: { classId: { in: classIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        class: { select: { id: true, name: true } },
        _count: { select: { problems: true } },
      },
    });

    return homeworks.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      deadline: h.deadline,
      createdAt: h.createdAt,
      className: h.class.name,
      classId: h.class.id,
      problemCount: h._count.problems,
    }));
  }

  private async listForStudent(classIds: string[], userId: string) {
    const homeworks = await this.prisma.client.homework.findMany({
      where: { classId: { in: classIds } },
      orderBy: { deadline: 'asc' },
      include: {
        class: { select: { id: true, name: true } },
        problems: {
          orderBy: { ordinal: 'asc' },
          include: {
            problem: {
              select: {
                id: true,
                number: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Get all problem IDs across all homeworks
    const allProblemIds = homeworks.flatMap((h) =>
      h.problems.map((p) => p.problemId),
    );

    // Get accepted submissions for this user on these problems
    let acceptedProblemIds = new Set<string>();
    if (allProblemIds.length > 0) {
      const accepted = await this.prisma.client.submission.findMany({
        where: {
          userId,
          problemId: { in: allProblemIds },
          status: SubmissionStatus.ACCEPTED,
        },
        select: { problemId: true },
        distinct: ['problemId'],
      });
      acceptedProblemIds = new Set(accepted.map((s) => s.problemId));
    }

    return homeworks.map((h) => {
      const completedCount = h.problems.filter((p) =>
        acceptedProblemIds.has(p.problemId),
      ).length;
      return {
        id: h.id,
        title: h.title,
        description: h.description,
        deadline: h.deadline,
        createdAt: h.createdAt,
        className: h.class.name,
        classId: h.class.id,
        totalProblems: h.problems.length,
        completedProblems: completedCount,
        problems: h.problems.map((p) => ({
          id: p.problem.id,
          number: p.problem.number,
          title: p.problem.title,
          completed: acceptedProblemIds.has(p.problemId),
        })),
      };
    });
  }

  async getStats(homeworkId: string, userId: string, userRole: Role) {
    const homework = await this.prisma.client.homework.findUnique({
      where: { id: homeworkId },
      include: {
        class: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, username: true, displayName: true },
                },
              },
            },
          },
        },
        problems: {
          orderBy: { ordinal: 'asc' },
          include: {
            problem: { select: { id: true, number: true, title: true } },
          },
        },
      },
    });

    if (!homework) throw new NotFoundException('作业不存在');

    const isTeacher =
      userRole === Role.ADMIN || userRole === Role.PROBLEM_EDITOR;
    if (homework.class.teacherId !== userId && !isTeacher) {
      throw new ForbiddenException('只有班级教师可以查看作业统计');
    }

    const problemIds = homework.problems.map((p) => p.problemId);
    const memberIds = homework.class.members.map((m) => m.userId);

    // Get all accepted submissions for these problems by class members
    const acceptedSubmissions =
      problemIds.length > 0 && memberIds.length > 0
        ? await this.prisma.client.submission.findMany({
            where: {
              userId: { in: memberIds },
              problemId: { in: problemIds },
              status: SubmissionStatus.ACCEPTED,
            },
            select: { userId: true, problemId: true, score: true },
            distinct: ['userId', 'problemId'],
          })
        : [];

    // Build a map: userId -> Set of completed problemIds
    const completedByUser = new Map<string, Set<string>>();
    for (const sub of acceptedSubmissions) {
      if (!completedByUser.has(sub.userId)) {
        completedByUser.set(sub.userId, new Set());
      }
      completedByUser.get(sub.userId)!.add(sub.problemId);
    }

    const totalProblems = homework.problems.length;
    const totalMembers = homework.class.members.length;

    // Per-student stats
    const studentStats = homework.class.members.map((member) => {
      const completed = completedByUser.get(member.userId) ?? new Set();
      const completedCount = completed.size;
      const completionRate =
        totalProblems > 0
          ? Math.round((completedCount / totalProblems) * 100)
          : 0;
      return {
        userId: member.user.id,
        username: member.user.username,
        displayName: member.user.displayName,
        completedProblems: completedCount,
        totalProblems,
        completionRate,
      };
    });

    // Overall stats
    const totalSubmissions = acceptedSubmissions.length;
    const avgCompletionRate =
      totalMembers > 0 && totalProblems > 0
        ? Math.round(
            studentStats.reduce((sum, s) => sum + s.completionRate, 0) /
              totalMembers,
          )
        : 0;

    const notSubmitted = studentStats.filter(
      (s) => s.completedProblems === 0,
    );

    return {
      homeworkId: homework.id,
      title: homework.title,
      deadline: homework.deadline,
      className: homework.class.name,
      totalProblems,
      totalMembers,
      totalSubmissions,
      avgCompletionRate,
      notSubmittedCount: notSubmitted.length,
      notSubmitted: notSubmitted.map((s) => ({
        userId: s.userId,
        username: s.username,
        displayName: s.displayName,
      })),
      students: studentStats,
      problems: homework.problems.map((p) => ({
        id: p.problem.id,
        number: p.problem.number,
        title: p.problem.title,
      })),
    };
  }
}
