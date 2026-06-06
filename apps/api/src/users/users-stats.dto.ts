import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionStatus } from '@epoch-judge/db';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SolvedProblemsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class UserStatsSummaryDto {
  @ApiProperty()
  totalSubmissions!: number;

  @ApiProperty({ description: 'Distinct problems with at least one AC' })
  solvedCount!: number;

  @ApiProperty({ description: 'Distinct problems with at least one terminal submission' })
  attemptedCount!: number;

  @ApiProperty({ description: 'solvedCount / attemptedCount × 100, 0 if no attempts' })
  passRatePercent!: number;
}

export class UserContestStatsItemDto {
  @ApiProperty()
  contestId!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty({ enum: ['upcoming', 'running', 'ended'] })
  status!: 'upcoming' | 'running' | 'ended';

  @ApiProperty()
  submissionCount!: number;

  @ApiProperty()
  acceptedProblemCount!: number;
}

export class UserStatsResponseDto {
  @ApiProperty({ type: UserStatsSummaryDto })
  summary!: UserStatsSummaryDto;

  @ApiProperty({
    description: 'Terminal submission counts by status',
    example: { ACCEPTED: 5, WRONG_ANSWER: 10 },
  })
  verdictBreakdown!: Partial<Record<SubmissionStatus, number>>;

  @ApiProperty({ type: [UserContestStatsItemDto] })
  contests!: UserContestStatsItemDto[];
}

export class SolvedProblemItemDto {
  @ApiProperty()
  problemId!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  firstAcceptedAt!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Contest number if AC was in a contest' })
  contestNumber!: number | null;
}

export class SolvedProblemsPageDto {
  @ApiProperty({ type: [SolvedProblemItemDto] })
  items!: SolvedProblemItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
