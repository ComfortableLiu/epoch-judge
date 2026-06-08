import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  isPinned?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  isPinned?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdmin(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.client.announcement.findMany({
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          createdBy: {
            select: { id: true, username: true, displayName: true },
          },
        },
      }),
      this.prisma.client.announcement.count(),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        startsAt: item.startsAt?.toISOString() ?? null,
        endsAt: item.endsAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async createAdmin(dto: CreateAnnouncementDto, createdById: string) {
    const announcement = await this.prisma.client.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        isPinned: dto.isPinned ?? false,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        createdById,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    return {
      ...announcement,
      startsAt: announcement.startsAt?.toISOString() ?? null,
      endsAt: announcement.endsAt?.toISOString() ?? null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
    };
  }

  async updateAdmin(id: string, dto: UpdateAnnouncementDto) {
    const existing = await this.prisma.client.announcement.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    const announcement = await this.prisma.client.announcement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
        ...(dto.startsAt !== undefined
          ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null }
          : {}),
        ...(dto.endsAt !== undefined
          ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }
          : {}),
      },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    return {
      ...announcement,
      startsAt: announcement.startsAt?.toISOString() ?? null,
      endsAt: announcement.endsAt?.toISOString() ?? null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
    };
  }

  async deleteAdmin(id: string) {
    const existing = await this.prisma.client.announcement.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    await this.prisma.client.announcement.delete({ where: { id } });
    return { ok: true };
  }

  async getActive() {
    const now = new Date();
    const announcements = await this.prisma.client.announcement.findMany({
      where: {
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        title: true,
        content: true,
        isPinned: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    });

    return announcements.map((a) => ({
      ...a,
      startsAt: a.startsAt?.toISOString() ?? null,
      endsAt: a.endsAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    }));
  }
}
