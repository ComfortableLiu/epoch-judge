import { Injectable, Logger } from '@nestjs/common';
import { SubmissionStatus } from '@epoch-judge/db';
import { RedisKeys } from '@epoch-judge/redis';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface UserAbilityProfile {
  masteredTags: Map<string, number>; // tag -> count of accepted submissions
  maxDifficulty: number; // highest difficulty the user has passed
  averageDifficulty: number; // average difficulty of passed problems
  weakTags: string[]; // tags with low acceptance rate
  totalAccepted: number;
}

export interface RecommendedProblem {
  id: string;
  number: number;
  title: string;
  difficulty: number;
  tags: string[];
  reason: string; // why this problem was recommended
}

const CACHE_TTL_SECONDS = 3600; // 1 hour
const MIN_SUBMISSIONS_FOR_PROFILE = 10;

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getRecommendations(userId: string, limit = 10): Promise<RecommendedProblem[]> {
    // Check cache first
    const cached = await this.getCachedRecommendations(userId);
    if (cached) {
      return cached.slice(0, limit);
    }

    // Build user ability profile
    const profile = await this.buildUserProfile(userId);

    let recommendations: RecommendedProblem[];

    if (profile.totalAccepted < MIN_SUBMISSIONS_FOR_PROFILE) {
      // Cold start: recommend popular easy problems
      recommendations = await this.getPopularEasyProblems(userId, limit);
    } else {
      // Normal case: use profile-based recommendation
      recommendations = await this.getProfileBasedRecommendations(userId, profile, limit);
    }

    // Cache the results
    await this.cacheRecommendations(userId, recommendations);

    return recommendations.slice(0, limit);
  }

  private async buildUserProfile(userId: string): Promise<UserAbilityProfile> {
    // Get all accepted submissions with problem details
    const acceptedSubmissions = await this.prisma.client.submission.findMany({
      where: {
        userId,
        status: SubmissionStatus.ACCEPTED,
      },
      select: {
        problem: {
          select: {
            id: true,
            difficulty: true,
            tags: true,
          },
        },
      },
      distinct: ['problemId'], // Only count each problem once
    });

    const masteredTags = new Map<string, number>();
    let totalDifficulty = 0;
    let maxDifficulty = 0;
    const tagAttemptCount = new Map<string, number>();
    const tagAcceptCount = new Map<string, number>();

    for (const sub of acceptedSubmissions) {
      const { difficulty, tags } = sub.problem;
      totalDifficulty += difficulty;
      maxDifficulty = Math.max(maxDifficulty, difficulty);

      for (const tag of tags as string[]) {
        masteredTags.set(tag, (masteredTags.get(tag) ?? 0) + 1);
        tagAcceptCount.set(tag, (tagAcceptCount.get(tag) ?? 0) + 1);
      }
    }

    // Get all attempted submissions to calculate weak tags
    const allSubmissions = await this.prisma.client.submission.findMany({
      where: { userId },
      select: {
        problem: {
          select: { tags: true },
        },
        status: true,
      },
    });

    for (const sub of allSubmissions) {
      for (const tag of sub.problem.tags as string[]) {
        tagAttemptCount.set(tag, (tagAttemptCount.get(tag) ?? 0) + 1);
      }
    }

    // Identify weak tags (low acceptance rate but attempted)
    const weakTags: string[] = [];
    for (const [tag, attempts] of tagAttemptCount) {
      if (attempts >= 3) { // Only consider tags with enough attempts
        const accepts = tagAcceptCount.get(tag) ?? 0;
        const acceptRate = accepts / attempts;
        if (acceptRate < 0.3) { // Less than 30% acceptance rate
          weakTags.push(tag);
        }
      }
    }

    return {
      masteredTags,
      maxDifficulty,
      averageDifficulty: acceptedSubmissions.length > 0 ? totalDifficulty / acceptedSubmissions.length : 0,
      weakTags,
      totalAccepted: acceptedSubmissions.length,
    };
  }

  private async getPopularEasyProblems(userId: string, limit: number): Promise<RecommendedProblem[]> {
    // Get problems the user hasn't solved
    const solvedProblemIds = await this.getUserSolvedProblemIds(userId);

    const problems = await this.prisma.client.problem.findMany({
      where: {
        id: { notIn: solvedProblemIds },
        visibility: 'PUBLIC',
        difficulty: { lte: 1000 }, // Easy problems
      },
      orderBy: { difficulty: 'asc' },
      take: limit * 2, // Get extra to filter
      select: {
        id: true,
        number: true,
        title: true,
        difficulty: true,
        tags: true,
      },
    });

    return problems.slice(0, limit).map((p) => ({
      id: p.id,
      number: p.number,
      title: p.title,
      difficulty: p.difficulty,
      tags: p.tags as string[],
      reason: '入门推荐',
    }));
  }

  private async getProfileBasedRecommendations(
    userId: string,
    profile: UserAbilityProfile,
    limit: number,
  ): Promise<RecommendedProblem[]> {
    const solvedProblemIds = await this.getUserSolvedProblemIds(userId);
    const recommendations: RecommendedProblem[] = [];

    // Strategy 1: Slightly harder problems (difficulty progression)
    const harderProblems = await this.prisma.client.problem.findMany({
      where: {
        id: { notIn: solvedProblemIds },
        visibility: 'PUBLIC',
        difficulty: {
          gt: profile.maxDifficulty,
          lte: profile.maxDifficulty + 500, // Slightly above current level
        },
      },
      orderBy: { difficulty: 'asc' },
      take: Math.ceil(limit * 0.4), // 40% of recommendations
      select: {
        id: true,
        number: true,
        title: true,
        difficulty: true,
        tags: true,
      },
    });

    for (const p of harderProblems) {
      recommendations.push({
        id: p.id,
        number: p.number,
        title: p.title,
        difficulty: p.difficulty,
        tags: p.tags as string[],
        reason: '难度递增',
      });
    }

    // Strategy 2: Weak tag problems
    if (profile.weakTags.length > 0) {
      // Fetch candidates and filter by weak tags in memory (JSON array filtering)
      const weakTagCandidates = await this.prisma.client.problem.findMany({
        where: {
          id: { notIn: solvedProblemIds },
          visibility: 'PUBLIC',
          difficulty: {
            gte: profile.averageDifficulty - 300,
            lte: profile.averageDifficulty + 300,
          },
        },
        take: 100, // fetch more, filter below
        select: {
          id: true,
          number: true,
          title: true,
          difficulty: true,
          tags: true,
        },
      });

      const weakTagProblems = weakTagCandidates.filter((p) => {
        const tags = p.tags as string[];
        return tags.some((t) => profile.weakTags.includes(t));
      });

      for (const p of weakTagProblems.slice(0, Math.ceil(limit * 0.4))) {
        // Avoid duplicates
        if (!recommendations.find((r) => r.id === p.id)) {
          const weakTag = (p.tags as string[]).find((t) => profile.weakTags.includes(t));
          recommendations.push({
            id: p.id,
            number: p.number,
            title: p.title,
            difficulty: p.difficulty,
            tags: p.tags as string[],
            reason: weakTag ? `薄弱标签: ${weakTag}` : '薄弱领域',
          });
        }
      }
    }

    // Strategy 3: Fill remaining with random problems at appropriate difficulty
    if (recommendations.length < limit) {
      const remainingCount = limit - recommendations.length;
      const existingIds = new Set(recommendations.map((r) => r.id));
      const allExcludedIds = [...solvedProblemIds, ...existingIds];

      const fillProblems = await this.prisma.client.problem.findMany({
        where: {
          id: { notIn: allExcludedIds },
          visibility: 'PUBLIC',
          difficulty: {
            gte: profile.averageDifficulty - 200,
            lte: profile.maxDifficulty + 300,
          },
        },
        take: remainingCount,
        select: {
          id: true,
          number: true,
          title: true,
          difficulty: true,
          tags: true,
        },
      });

      for (const p of fillProblems) {
        recommendations.push({
          id: p.id,
          number: p.number,
          title: p.title,
          difficulty: p.difficulty,
          tags: p.tags as string[],
          reason: '拓展练习',
        });
      }
    }

    return recommendations;
  }

  private async getUserSolvedProblemIds(userId: string): Promise<string[]> {
    const solved = await this.prisma.client.submission.findMany({
      where: {
        userId,
        status: SubmissionStatus.ACCEPTED,
      },
      select: { problemId: true },
      distinct: ['problemId'],
    });
    return solved.map((s) => s.problemId);
  }

  private async getCachedRecommendations(userId: string): Promise<RecommendedProblem[] | null> {
    try {
      const key = RedisKeys.recommendations(userId);
      const cached = await this.redis.client.get(key);
      if (cached) {
        return JSON.parse(cached) as RecommendedProblem[];
      }
    } catch (error) {
      this.logger.warn(`Failed to get cached recommendations for user ${userId}: ${error}`);
    }
    return null;
  }

  private async cacheRecommendations(userId: string, recommendations: RecommendedProblem[]): Promise<void> {
    try {
      const key = RedisKeys.recommendations(userId);
      await this.redis.client.setex(key, CACHE_TTL_SECONDS, JSON.stringify(recommendations));
    } catch (error) {
      this.logger.warn(`Failed to cache recommendations for user ${userId}: ${error}`);
    }
  }
}
