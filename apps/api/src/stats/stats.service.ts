import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RedisKeys } from '@epoch-judge/redis';

export interface PlatformStats {
  dau: number;
  totalSubmissions: number;
  todaySubmissions: number;
  avgJudgeLatencyMs: number;
  onlineJudgeNodes: number;
  submissionTrend: { date: string; count: number }[];
  popularProblems: {
    problemId: string;
    number: number;
    title: string;
    submissionCount: number;
  }[];
  languageDistribution: { language: string; count: number }[];
  updatedAt: string;
}

const STATS_CACHE_TTL = 3600; // 1 hour

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 每小时聚合统计数据并缓存到 Redis
   */
  @Cron(CronExpression.EVERY_HOUR)
  async aggregateStats(): Promise<void> {
    this.logger.log('Aggregating platform stats...');
    try {
      const stats = await this.computeStats();
      await this.redis.client.set(
        RedisKeys.stats(),
        JSON.stringify(stats),
        'EX',
        STATS_CACHE_TTL,
      );
      this.logger.log('Platform stats aggregated and cached');
    } catch (err) {
      this.logger.error('Failed to aggregate stats', err);
    }
  }

  /**
   * 获取统计数据：优先从 Redis 缓存读取，缓存未命中则实时计算
   */
  async getStats(): Promise<PlatformStats> {
    const cached = await this.redis.client.get(RedisKeys.stats());
    if (cached) {
      return JSON.parse(cached) as PlatformStats;
    }
    return this.computeStats();
  }

  /**
   * 实时计算所有统计数据
   */
  private async computeStats(): Promise<PlatformStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      dau,
      totalSubmissions,
      todaySubmissions,
      avgJudgeLatency,
      onlineJudgeNodes,
      submissionTrend,
      popularProblems,
      languageDistribution,
    ] = await Promise.all([
      this.computeDau(todayStart),
      this.prisma.client.submission.count(),
      this.prisma.client.submission.count({ where: { createdAt: { gte: todayStart } } }),
      this.computeAvgJudgeLatency(),
      this.prisma.client.judgeNode.count({ where: { isOnline: true } }),
      this.computeSubmissionTrend(),
      this.computePopularProblems(),
      this.computeLanguageDistribution(),
    ]);

    return {
      dau,
      totalSubmissions,
      todaySubmissions,
      avgJudgeLatencyMs: avgJudgeLatency,
      onlineJudgeNodes,
      submissionTrend,
      popularProblems,
      languageDistribution,
      updatedAt: now.toISOString(),
    };
  }

  /**
   * DAU：今日有提交的不同用户数
   */
  private async computeDau(todayStart: Date): Promise<number> {
    const result = await this.prisma.client.submission.aggregate({
      where: { createdAt: { gte: todayStart } },
      _count: { userId: true },
    });
    // Prisma aggregate doesn't support distinct, so use raw query
    const rows = await this.prisma.client.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM submissions
      WHERE created_at >= ${todayStart}
    `;
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * 平均判题延迟：最近 100 条已完成提交的平均 timeMs
   */
  private async computeAvgJudgeLatency(): Promise<number> {
    const result = await this.prisma.client.submission.aggregate({
      where: {
        timeMs: { not: null },
        status: {
          in: [
            'ACCEPTED',
            'WRONG_ANSWER',
            'TIME_LIMIT_EXCEEDED',
            'MEMORY_LIMIT_EXCEEDED',
            'RUNTIME_ERROR',
            'COMPILE_ERROR',
            'SECURITY_ERROR',
          ],
        },
      },
      _avg: { timeMs: true },
    });
    return Math.round(result._avg.timeMs ?? 0);
  }

  /**
   * 最近 30 天提交量趋势
   */
  private async computeSubmissionTrend(): Promise<{ date: string; count: number }[]> {
    const days = 30;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startDate.setDate(startDate.getDate() - days + 1);

    const rows = await this.prisma.client.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM submissions
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Fill in missing dates with 0
    const dateMap = new Map<string, number>();
    for (const row of rows) {
      dateMap.set(String(row.date), Number(row.count));
    }

    const trend: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      trend.push({ date: dateStr, count: dateMap.get(dateStr) ?? 0 });
    }
    return trend;
  }

  /**
   * 热门题目 Top10（按提交量排序）
   */
  private async computePopularProblems(): Promise<
    { problemId: string; number: number; title: string; submissionCount: number }[]
  > {
    const rows = await this.prisma.client.$queryRaw<
      { problem_id: string; number: number; title: string; count: bigint }[]
    >`
      SELECT s.problem_id, p.number, p.title, COUNT(*) as count
      FROM submissions s
      JOIN problems p ON p.id = s.problem_id
      GROUP BY s.problem_id, p.number, p.title
      ORDER BY count DESC
      LIMIT 10
    `;

    return rows.map((r) => ({
      problemId: String(r.problem_id),
      number: Number(r.number),
      title: String(r.title),
      submissionCount: Number(r.count),
    }));
  }

  /**
   * 语言分布统计
   */
  private async computeLanguageDistribution(): Promise<
    { language: string; count: number }[]
  > {
    const rows = await this.prisma.client.$queryRaw<{ language: string; count: bigint }[]>`
      SELECT language, COUNT(*) as count
      FROM submissions
      GROUP BY language
      ORDER BY count DESC
    `;

    return rows.map((r) => ({
      language: String(r.language),
      count: Number(r.count),
    }));
  }
}
