import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InflightService } from './inflight.service';
import { JudgeQueueService } from './judge-queue.service';
import { JudgeModeService } from './judge-mode.service';
import { JudgeRecoveryService } from './judge-recovery.service';
import { JudgeTaskService } from './judge-task.service';
import { ProblemTestcasesCacheService } from './problem-testcases-cache.service';

@Module({
  imports: [PrismaModule, MetricsModule],
  providers: [
    JudgeQueueService,
    InflightService,
    JudgeTaskService,
    JudgeRecoveryService,
    JudgeModeService,
    ProblemTestcasesCacheService,
  ],
  exports: [JudgeQueueService, InflightService, JudgeTaskService, JudgeModeService, ProblemTestcasesCacheService],
})
export class JudgeModule {}
