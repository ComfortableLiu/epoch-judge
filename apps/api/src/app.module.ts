import { findMonorepoEnvPath } from '@epoch-judge/shared';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { createThrottleConfig } from './common/throttle.config';
import { AdminModule } from './admin/admin.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AuthModule } from './auth/auth.module';
import { ContestsModule } from './contests/contests.module';
import { HealthModule } from './health/health.module';
import { JudgeModule } from './judge/judge.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProblemsModule } from './problems/problems.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { TemplatesModule } from './templates/templates.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: findMonorepoEnvPath() ?? '.env',
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createThrottleConfig(config),
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProblemsModule,
    SubmissionsModule,
    ContestsModule,
    JudgeModule,
    AdminModule,
    TemplatesModule,
    AnnouncementsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
