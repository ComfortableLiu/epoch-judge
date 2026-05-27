import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JudgeModule } from '../judge/judge.module';
import { ProblemAccessService } from './problem-access.service';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';

@Module({
  imports: [AuthModule, JudgeModule],
  controllers: [ProblemsController],
  providers: [ProblemsService, ProblemAccessService],
  exports: [ProblemsService, ProblemAccessService],
})
export class ProblemsModule {}
