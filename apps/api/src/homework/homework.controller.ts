import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './homework.dto';

@ApiTags('homework')
@Controller('homework')
export class HomeworkController {
  constructor(private readonly homework: HomeworkService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Post()
  @ApiOperation({ summary: '创建作业' })
  @ApiResponse({ status: 201, description: '作业创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  create(
    @Body() dto: CreateHomeworkDto,
    @Req() req: { user: { id: string; role: Role } },
  ) {
    return this.homework.create(dto, req.user.id, req.user.role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: '查询作业列表',
    description: '教师查看自己班级的作业，学生查看所在班级的作业',
  })
  @ApiQuery({ name: 'classId', required: false, description: '按班级筛选' })
  @ApiResponse({ status: 200, description: '作业列表' })
  list(
    @Query('classId') classId: string | undefined,
    @Req() req: { user: { id: string; role: Role } },
  ) {
    return this.homework.list(req.user.id, req.user.role, classId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/stats')
  @ApiOperation({
    summary: '获取作业统计',
    description: '教师查看作业完成情况统计',
  })
  @ApiParam({ name: 'id', description: '作业 ID' })
  @ApiResponse({ status: 200, description: '作业统计数据' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '作业不存在' })
  getStats(
    @Param('id') homeworkId: string,
    @Req() req: { user: { id: string; role: Role } },
  ) {
    return this.homework.getStats(homeworkId, req.user.id, req.user.role);
  }
}
