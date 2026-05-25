import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    let database: 'up' | 'down' = 'down';
    let redis: 'up' | 'down' = 'down';

    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    try {
      await this.redis.client.ping();
      redis = 'up';
    } catch {
      redis = 'down';
    }

    const ok = database === 'up' && redis === 'up';
    return {
      status: ok ? 'ok' : 'degraded',
      checks: { database, redis },
      service: 'epoch-judge-api',
    };
  }
}
