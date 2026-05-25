import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { SubmissionStatus, prisma } from '@epoch-judge/db';

@Controller()
export class JudgeGrpcController {
  @GrpcMethod('JudgeService', 'Submit')
  async submit(data: { submissionId: string }) {
    const sub = await prisma.submission.findUnique({
      where: { id: data.submissionId },
    });
    return { accepted: Boolean(sub) };
  }

  @GrpcMethod('JudgeService', 'WatchStatus')
  async *watchStatus(data: { submissionId: string }) {
    for (let i = 0; i < 120; i++) {
      const sub = await prisma.submission.findUnique({
        where: { id: data.submissionId },
        include: { testcaseResults: true },
      });
      if (!sub) break;
      yield {
        submissionId: data.submissionId,
        type: 'status',
        status: sub.status,
        testcaseId: '',
        verdict: '',
        score: sub.score ?? 0,
        timeMs: sub.timeMs ?? 0,
        memoryKb: sub.memoryKb ?? 0,
      };
      for (const r of sub.testcaseResults) {
        yield {
          submissionId: data.submissionId,
          type: 'testcase',
          status: sub.status,
          testcaseId: r.testcaseId,
          verdict: r.verdict,
          score: r.score,
          timeMs: r.timeMs ?? 0,
          memoryKb: r.memoryKb ?? 0,
        };
      }
      const terminal: SubmissionStatus[] = [
        SubmissionStatus.ACCEPTED,
        SubmissionStatus.WRONG_ANSWER,
        SubmissionStatus.COMPILE_ERROR,
        SubmissionStatus.TIME_LIMIT_EXCEEDED,
        SubmissionStatus.RUNTIME_ERROR,
        SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
        SubmissionStatus.SYSTEM_ERROR,
        SubmissionStatus.SECURITY_ERROR,
      ];
      if (terminal.includes(sub.status)) {
        yield {
          submissionId: data.submissionId,
          type: 'done',
          status: sub.status,
          testcaseId: '',
          verdict: '',
          score: sub.score ?? 0,
          timeMs: sub.timeMs ?? 0,
          memoryKb: sub.memoryKb ?? 0,
        };
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
