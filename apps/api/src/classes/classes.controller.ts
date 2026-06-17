import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ClassesService } from './classes.service';
import { CreateClassDto, JoinClassDto } from './classes.dto';

@ApiTags('classes')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Post()
  @ApiOperation({ summary: '创建班级' })
  @ApiResponse({ status: 201, description: '班级创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  create(
    @Body() dto: CreateClassDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.classes.create(dto, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('join')
  @ApiOperation({ summary: '通过邀请码加入班级' })
  @ApiResponse({ status: 200, description: '加入成功' })
  @ApiResponse({ status: 404, description: '邀请码无效' })
  join(
    @Body() dto: JoinClassDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.classes.joinByCode(dto.invitationCode, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiOperation({ summary: '获取我的班级列表' })
  @ApiResponse({ status: 200, description: '班级列表' })
  async myClasses(@Req() req: { user: { id: string; role: Role } }) {
    if (req.user.role === Role.ADMIN || req.user.role === Role.PROBLEM_EDITOR) {
      const taught = await this.classes.listByTeacher(req.user.id);
      const joined = await this.classes.listByStudent(req.user.id);
      return { taught, joined };
    }
    const joined = await this.classes.listByStudent(req.user.id);
    return { taught: [], joined };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/members')
  @ApiOperation({ summary: '获取班级成员列表' })
  @ApiParam({ name: 'id', description: '班级 ID' })
  @ApiResponse({ status: 200, description: '成员列表' })
  @ApiResponse({ status: 404, description: '班级不存在' })
  getMembers(@Param('id') classId: string) {
    return this.classes.getMembers(classId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Delete(':id/members/:userId')
  @ApiOperation({ summary: '移除班级成员' })
  @ApiParam({ name: 'id', description: '班级 ID' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '移除成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '成员不存在' })
  removeMember(
    @Param('id') classId: string,
    @Param('userId') userId: string,
    @Req() req: { user: { id: string; role: Role } },
  ) {
    return this.classes.removeMember(classId, userId, req.user.id, req.user.role);
  }
}
