import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@epoch-judge/db';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './classes.dto';
import * as crypto from 'crypto';

function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClassDto, teacherId: string) {
    const invitationCode = generateInvitationCode();
    return this.prisma.client.class.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        teacherId,
        invitationCode,
      },
    });
  }

  async joinByCode(invitationCode: string, userId: string) {
    const cls = await this.prisma.client.class.findUnique({
      where: { invitationCode },
    });
    if (!cls) {
      throw new NotFoundException('邀请码无效');
    }

    const existing = await this.prisma.client.classMember.findUnique({
      where: {
        classId_userId: { classId: cls.id, userId },
      },
    });
    if (existing) {
      throw new BadRequestException('你已经是该班级成员');
    }

    await this.prisma.client.classMember.create({
      data: { classId: cls.id, userId },
    });

    return { classId: cls.id, name: cls.name };
  }

  async getMembers(classId: string) {
    const cls = await this.prisma.client.class.findUnique({
      where: { id: classId },
    });
    if (!cls) throw new NotFoundException('班级不存在');

    const members = await this.prisma.client.classMember.findMany({
      where: { classId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      userId: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      joinedAt: m.joinedAt,
    }));
  }

  async removeMember(classId: string, userId: string, operatorId: string, operatorRole: Role) {
    const cls = await this.prisma.client.class.findUnique({
      where: { id: classId },
    });
    if (!cls) throw new NotFoundException('班级不存在');

    if (cls.teacherId !== operatorId && operatorRole !== Role.ADMIN) {
      throw new ForbiddenException('只有班级教师或管理员可以移除成员');
    }

    const member = await this.prisma.client.classMember.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    if (!member) throw new NotFoundException('该用户不是班级成员');

    await this.prisma.client.classMember.delete({
      where: { classId_userId: { classId, userId } },
    });

    return { ok: true };
  }

  async listByTeacher(teacherId: string) {
    return this.prisma.client.class.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true, homeworks: true } },
      },
    });
  }

  async listByStudent(userId: string) {
    const memberships = await this.prisma.client.classMember.findMany({
      where: { userId },
      include: {
        class: {
          include: {
            _count: { select: { members: true, homeworks: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({
      ...m.class,
      memberCount: m.class._count.members,
      homeworkCount: m.class._count.homeworks,
    }));
  }
}
