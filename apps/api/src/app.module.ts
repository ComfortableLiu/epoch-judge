import { findMonorepoEnvPath } from '@epoch-judge/shared';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
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
  ],
})
export class AppModule {}
