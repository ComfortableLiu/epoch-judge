import { Module } from '@nestjs/common';
import { ContestsModule } from '../contests/contests.module';
import { JudgeModule } from '../judge/judge.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { SseConnectionService } from './sse-connection.service';

@Module({
  imports: [JudgeModule, ContestsModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SseConnectionService],
})
export class SubmissionsModule {}
