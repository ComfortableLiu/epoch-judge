import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InflightService } from './inflight.service';
import { JudgeQueueService } from './judge-queue.service';
import { JudgeModeService } from './judge-mode.service';
import { JudgeRecoveryService } from './judge-recovery.service';
import { JudgeTaskService } from './judge-task.service';

@Module({
  imports: [PrismaModule],
  providers: [
    JudgeQueueService,
    InflightService,
    JudgeTaskService,
    JudgeRecoveryService,
    JudgeModeService,
  ],
  exports: [JudgeQueueService, InflightService, JudgeTaskService, JudgeModeService],
})
export class JudgeModule {}
