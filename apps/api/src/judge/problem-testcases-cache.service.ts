import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LRUCache } from 'lru-cache';
import { PrismaService } from '../prisma/prisma.service';

type TestcaseEntry = {
  id: string;
  inputKey: string;
  outputKey: string;
  score: number;
};

const DEFAULT_MAX_SIZE = 1000;

/**
 * LRU cache for problem testcases to avoid repeated database queries.
 *
 * - Default max size: 1000 entries
 * - Configurable via JUDGE_CACHE_MAX_SIZE environment variable
 * - No TTL (testcases rarely change, LRU eviction is sufficient)
 */
@Injectable()
export class ProblemTestcasesCacheService {
  private readonly logger = new Logger(ProblemTestcasesCacheService.name);
  private readonly cache: LRUCache<string, TestcaseEntry[]>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const maxSize = Number(
      this.config.get('JUDGE_CACHE_MAX_SIZE', String(DEFAULT_MAX_SIZE)),
    );

    this.cache = new LRUCache<string, TestcaseEntry[]>({
      max: maxSize,
      // No TTL - rely on LRU eviction only
      ttl: 0,
    });

    this.logger.log(
      `Problem testcases LRU cache initialized (maxSize=${maxSize})`,
    );
  }

  /**
   * Get testcases for a problem. Returns from cache if available,
   * otherwise fetches from database and caches the result.
   */
  async getTestcases(problemId: string): Promise<TestcaseEntry[]> {
    const cached = this.cache.get(problemId);
    if (cached) {
      return cached;
    }

    const testcases = await this.prisma.client.problemTestcase.findMany({
      where: { problemId },
      orderBy: { ordinal: 'asc' },
      select: {
        id: true,
        inputKey: true,
        outputKey: true,
        score: true,
      },
    });

    this.cache.set(problemId, testcases);
    return testcases;
  }

  /**
   * Invalidate cache for a specific problem.
   * Call this when testcases are modified.
   */
  invalidate(problemId: string): void {
    this.cache.delete(problemId);
    this.logger.debug(`Cache invalidated for problem ${problemId}`);
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }

  /**
   * Get cache statistics.
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitCount: this.cache.size, // lru-cache doesn't track hits by default
    };
  }
}
