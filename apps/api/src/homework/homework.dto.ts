import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateHomeworkDto {
  @ApiProperty({ description: '班级 ID' })
  @IsString()
  classId!: string;

  @ApiProperty({ description: '作业标题' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false, description: '作业描述' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: '截止时间（ISO 8601）' })
  @IsDateString()
  deadline!: string;

  @ApiProperty({ description: '题目 ID 列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  problemIds!: string[];
}
