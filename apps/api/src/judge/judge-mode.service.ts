import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JudgeMode, Language } from '@epoch-judge/db';
import { PrismaService } from '../prisma/prisma.service';
import { t } from '../common/messages';

export type ResolvedSubmitOptions = {
  judgeMode: JudgeMode;
  judgeModeLocked: boolean;
  language: Language;
  contest?: { id: string; title: string; judgeMode: JudgeMode };
};

@Injectable()
export class JudgeModeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForSubmit(
    userId: string,
    problemId: string,
    contestId: string | undefined,
    requestedMode: JudgeMode | undefined,
    locale: string,
  ): Promise<{ judgeMode: JudgeMode; locked: boolean }> {
    if (contestId) {
      const contest = await this.prisma.client.contest.findUnique({
        where: { id: contestId },
        include: {
          problems: { where: { problemId }, select: { problemId: true } },
        },
      });
      if (!contest) throw new NotFoundException();
      if (!contest.problems.length) {
        throw new BadRequestException({
          messageKey: 'contest.problem_not_in_contest',
          message: t('contest.problem_not_in_contest', locale),
        });
      }
      if (
        requestedMode !== undefined &&
        requestedMode !== contest.judgeMode
      ) {
        throw new BadRequestException({
          messageKey: 'contest.judge_mode_locked',
          message: t('contest.judge_mode_locked', locale),
        });
      }
      return { judgeMode: contest.judgeMode, locked: true };
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { preferredJudgeMode: true },
    });
    const judgeMode =
      requestedMode ?? user?.preferredJudgeMode ?? JudgeMode.ACM;
    return { judgeMode, locked: false };
  }

  async getSubmitOptions(
    userId: string,
    problemId: string,
    contestId: string | undefined,
  ): Promise<ResolvedSubmitOptions> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { preferredLanguage: true, preferredJudgeMode: true },
    });

    let judgeMode = user?.preferredJudgeMode ?? JudgeMode.ACM;
    let judgeModeLocked = false;
    let contestInfo: ResolvedSubmitOptions['contest'];

    if (contestId) {
      const contest = await this.prisma.client.contest.findUnique({
        where: { id: contestId },
        include: {
          problems: { where: { problemId }, select: { problemId: true } },
        },
      });
      if (!contest) throw new NotFoundException();
      if (!contest.problems.length) {
        throw new BadRequestException('Problem is not part of this contest');
      }
      judgeMode = contest.judgeMode;
      judgeModeLocked = true;
      contestInfo = {
        id: contest.id,
        title: contest.title,
        judgeMode: contest.judgeMode,
      };
    }

    const language = user?.preferredLanguage ?? Language.PYTHON;

    return {
      judgeMode,
      judgeModeLocked,
      language,
      contest: contestInfo,
    };
  }
}
