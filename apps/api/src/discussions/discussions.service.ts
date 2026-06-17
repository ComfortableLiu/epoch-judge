import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscussionType, Role } from '@epoch-judge/db';
import {
  CreateDiscussionDto,
  CreateReplyDto,
  ListDiscussionsDto,
} from './discussions.dto';

@Injectable()
export class DiscussionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(problemNumber: number, dto: CreateDiscussionDto, userId: string) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { number: problemNumber },
      select: { id: true },
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const discussion = await this.prisma.client.discussion.create({
      data: {
        problemId: problem.id,
        userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
      },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        _count: { select: { replies: true, votes: true } },
      },
    });

    return this.formatDiscussion(discussion);
  }

  async listByProblem(problemNumber: number, dto: ListDiscussionsDto) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { number: problemNumber },
      select: { id: true },
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;
    const sort = dto.sort ?? 'latest';

    const orderBy =
      sort === 'popular'
        ? [{ votes: { _count: 'desc' as const } }, { createdAt: 'desc' as const }]
        : [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      this.prisma.client.discussion.findMany({
        where: { problemId: problem.id },
        orderBy,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
          _count: { select: { replies: true, votes: true } },
        },
      }),
      this.prisma.client.discussion.count({
        where: { problemId: problem.id },
      }),
    ]);

    return {
      items: items.map((item) => this.formatDiscussion(item)),
      total,
      page,
      limit,
    };
  }

  async getDetail(discussionId: string) {
    const discussion = await this.prisma.client.discussion.findUnique({
      where: { id: discussionId },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        _count: { select: { replies: true, votes: true } },
      },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    return this.formatDiscussion(discussion);
  }

  async createReply(
    discussionId: string,
    dto: CreateReplyDto,
    userId: string,
  ) {
    const discussion = await this.prisma.client.discussion.findUnique({
      where: { id: discussionId },
      select: { id: true },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const reply = await this.prisma.client.discussionReply.create({
      data: {
        discussionId,
        userId,
        content: dto.content,
      },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        _count: { select: { votes: true } },
      },
    });

    return this.formatReply(reply);
  }

  async listReplies(discussionId: string, page = 1, limit = 20) {
    const discussion = await this.prisma.client.discussion.findUnique({
      where: { id: discussionId },
      select: { id: true },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.client.discussionReply.findMany({
        where: { discussionId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
          _count: { select: { votes: true } },
        },
      }),
      this.prisma.client.discussionReply.count({
        where: { discussionId },
      }),
    ]);

    return {
      items: items.map((item) => this.formatReply(item)),
      total,
      page,
      limit,
    };
  }

  async vote(discussionId: string | null, replyId: string | null, userId: string) {
    if (!discussionId && !replyId) {
      throw new BadRequestException('Must provide discussionId or replyId');
    }

    if (discussionId && replyId) {
      throw new BadRequestException('Cannot vote on both discussion and reply');
    }

    if (discussionId) {
      const existing = await this.prisma.client.discussionVote.findUnique({
        where: { userId_discussionId: { userId, discussionId } },
      });

      if (existing) {
        await this.prisma.client.discussionVote.delete({
          where: { id: existing.id },
        });
        return { voted: false };
      }

      await this.prisma.client.discussionVote.create({
        data: { userId, discussionId },
      });
      return { voted: true };
    }

    if (replyId) {
      const existing = await this.prisma.client.discussionVote.findUnique({
        where: { userId_replyId: { userId, replyId } },
      });

      if (existing) {
        await this.prisma.client.discussionVote.delete({
          where: { id: existing.id },
        });
        return { voted: false };
      }

      await this.prisma.client.discussionVote.create({
        data: { userId, replyId },
      });
      return { voted: true };
    }
  }

  async pin(discussionId: string) {
    const discussion = await this.prisma.client.discussion.findUnique({
      where: { id: discussionId },
      select: { id: true, isPinned: true },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const updated = await this.prisma.client.discussion.update({
      where: { id: discussionId },
      data: { isPinned: !discussion.isPinned },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        _count: { select: { replies: true, votes: true } },
      },
    });

    return this.formatDiscussion(updated);
  }

  async delete(discussionId: string) {
    const discussion = await this.prisma.client.discussion.findUnique({
      where: { id: discussionId },
      select: { id: true },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    await this.prisma.client.discussion.delete({ where: { id: discussionId } });
    return { ok: true };
  }

  private formatDiscussion(discussion: any) {
    return {
      id: discussion.id,
      problemId: discussion.problemId,
      userId: discussion.userId,
      type: discussion.type,
      title: discussion.title,
      content: discussion.content,
      isPinned: discussion.isPinned,
      createdAt: discussion.createdAt.toISOString(),
      updatedAt: discussion.updatedAt.toISOString(),
      user: discussion.user,
      replyCount: discussion._count?.replies ?? 0,
      voteCount: discussion._count?.votes ?? 0,
    };
  }

  private formatReply(reply: any) {
    return {
      id: reply.id,
      discussionId: reply.discussionId,
      userId: reply.userId,
      content: reply.content,
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
      user: reply.user,
      voteCount: reply._count?.votes ?? 0,
    };
  }
}
