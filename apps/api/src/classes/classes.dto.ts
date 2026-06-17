import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({ description: '班级名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ required: false, description: '班级描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class JoinClassDto {
  @ApiProperty({ description: '邀请码' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  invitationCode!: string;
}
