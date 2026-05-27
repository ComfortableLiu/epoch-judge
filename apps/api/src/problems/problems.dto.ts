import { ApiProperty } from '@nestjs/swagger';
import { ProblemVisibility } from '@epoch-judge/db';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProblemDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  statement?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  difficulty?: number;

  @ApiProperty({ enum: ProblemVisibility, required: false })
  @IsOptional()
  @IsEnum(ProblemVisibility)
  visibility?: ProblemVisibility;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(100)
  timeLimitMs?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1024)
  memoryLimitKb?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
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
  @IsInt()
  @Min(1)
  difficulty?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(ProblemVisibility)
  visibility?: ProblemVisibility;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(100)
  timeLimitMs?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1024)
  memoryLimitKb?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateTestcaseDto {
  @ApiProperty()
  @IsString()
  input!: string;

  @ApiProperty()
  @IsString()
  output!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  score!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isSample?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordinal?: number;
}

export class UpdateTestcaseDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  input?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  output?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isSample?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordinal?: number;
}
