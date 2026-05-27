import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubmissionStatus } from '@epoch-judge/db';
import { isSubmissionTerminal } from '@epoch-judge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JudgeTaskService } from './judge-task.service';

@Injectable()
export class JudgeRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(JudgeRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly judgeTasks: JudgeTaskService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const enabled =
      this.config.get('JUDGE_RECOVER_ON_STARTUP', 'true') !== 'false';
    if (!enabled) {
      this.logger.log('Startup judge recovery disabled (JUDGE_RECOVER_ON_STARTUP=false)');
      return;
    }
    void this.recoverStuckSubmissions().catch((e) => {
      this.logger.error(
        'Startup judge recovery failed',
        e instanceof Error ? e.stack : String(e),
      );
    });
  }

  async recoverStuckSubmissions() {
    const terminal = Object.values(SubmissionStatus).filter((s) =>
      isSubmissionTerminal(s),
    ) as SubmissionStatus[];

    const stuck = await this.prisma.client.submission.findMany({
      where: { status: { notIn: terminal } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, status: true, problemId: true },
    });

    if (!stuck.length) {
      this.logger.log('Startup recovery: no non-terminal submissions');
      return;
    }

    this.logger.warn(
      `Startup recovery: re-queuing ${stuck.length} non-terminal submission(s)`,
    );

    let ok = 0;
    const failed: { id: string; error: string }[] = [];

    for (const row of stuck) {
      try {
        await this.judgeTasks.recoverSubmission(row.id);
        ok += 1;
      } catch (e) {
        failed.push({
          id: row.id,
          error: e instanceof Error ? e.message : String(e),
        });
        this.logger.error(
          `Recovery failed submission=${row.id} status=${row.status}`,
          e instanceof Error ? e.stack : String(e),
        );
      }
    }

    this.logger.log(
      `Startup recovery done: queued=${ok} failed=${failed.length}`,
    );
  }
}
