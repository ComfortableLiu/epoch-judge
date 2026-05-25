import { ApiProperty } from '@nestjs/swagger';
import { JudgeMode, Language } from '@epoch-judge/db';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty()
  @IsString()
  problemId!: string;

  @ApiProperty({ enum: Language })
  @IsEnum(Language)
  language!: Language;

  @ApiProperty({ enum: JudgeMode, required: false })
  @IsOptional()
  @IsEnum(JudgeMode)
  judgeMode?: JudgeMode;

  @ApiProperty()
  @IsString()
  sourceCode!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contestId?: string;
}
