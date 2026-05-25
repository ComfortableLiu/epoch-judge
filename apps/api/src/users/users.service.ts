import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@epoch-judge/db';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './users.dto';

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
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        email: dto.email,
      },
    });
    return this.getProfile(user.id);
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
    return users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));
  }
}
