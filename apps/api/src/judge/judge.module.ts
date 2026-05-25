import { Module } from '@nestjs/common';
import { InflightService } from './inflight.service';
import { JudgeQueueService } from './judge-queue.service';

@Module({
  providers: [JudgeQueueService, InflightService],
  exports: [JudgeQueueService, InflightService],
})
export class JudgeModule {}
