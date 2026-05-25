import { ApiProperty } from '@nestjs/swagger';
import { JudgeMode, ProblemVisibility } from '@epoch-judge/db';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProblemDto {
  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  statement!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  difficulty?: number;

  @ApiProperty({ enum: ProblemVisibility })
  @IsEnum(ProblemVisibility)
  visibility!: ProblemVisibility;

  @ApiProperty({ enum: JudgeMode })
  @IsEnum(JudgeMode)
  defaultJudgeMode!: JudgeMode;

  @ApiProperty()
  @IsInt()
  @Min(100)
  timeLimitMs!: number;

  @ApiProperty()
  @IsInt()
  @Min(1024)
  memoryLimitKb!: number;
}

export class UpdateProblemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  statement?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(ProblemVisibility)
  visibility?: ProblemVisibility;
}
