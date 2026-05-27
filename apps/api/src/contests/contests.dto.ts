import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContestVisibility, JudgeMode } from '@epoch-judge/db';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateContestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ enum: ContestVisibility })
  @IsEnum(ContestVisibility)
  visibility!: ContestVisibility;

  @ApiProperty({ enum: JudgeMode })
  @IsEnum(JudgeMode)
  judgeMode!: JudgeMode;

  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiProperty()
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  freezeAt?: string | null;

  @ApiPropertyOptional({ description: '明文比赛密码，空表示无密码' })
  @IsOptional()
  @IsString()
  accessPassword?: string | null;

  @ApiPropertyOptional({ type: [String], description: '题目 ID 列表，顺序即题号 A/B/C…' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  problemIds?: string[];
}

export class UpdateContestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ContestVisibility })
  @IsOptional()
  @IsEnum(ContestVisibility)
  visibility?: ContestVisibility;

  @ApiPropertyOptional({ enum: JudgeMode })
  @IsOptional()
  @IsEnum(JudgeMode)
  judgeMode?: JudgeMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  freezeAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  accessPassword?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  problemIds?: string[];
}

export class VerifyContestPasswordDto {
  @ApiProperty()
  @IsString()
  password!: string;
}

export class AdminUpsertContestRegistrationDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isStarTeam?: boolean;
}

export class AdminUpdateContestRegistrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isStarTeam?: boolean;
}
