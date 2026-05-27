import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export type RejudgeScope = 'problem' | 'submission' | 'contest';

export class RejudgeRequestDto {
  @ApiProperty({ enum: ['problem', 'submission', 'contest'] })
  @IsIn(['problem', 'submission', 'contest'])
  scope!: RejudgeScope;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  submissionIds?: string[];

  /** 按终态筛选；为空时包含全部终态 */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statuses?: string[];
}
