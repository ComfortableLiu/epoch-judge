import { ApiProperty } from '@nestjs/swagger';
import { DiscussionType } from '@epoch-judge/db';
import { IsEnum, IsOptional, IsString, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiscussionDto {
  @ApiProperty({ enum: DiscussionType })
  @IsEnum(DiscussionType)
  type!: DiscussionType;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  content!: string;
}

export class CreateReplyDto {
  @ApiProperty()
  @IsString()
  content!: string;
}

export class VoteDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  discussionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  replyId?: string;
}

export class ListDiscussionsDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({ required: false, enum: ['latest', 'popular'], default: 'latest' })
  @IsOptional()
  @IsString()
  sort?: 'latest' | 'popular';
}
