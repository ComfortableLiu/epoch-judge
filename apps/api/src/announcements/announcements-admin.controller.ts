import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  AnnouncementsService,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './announcements.service';

@ApiTags('admin/announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/announcements')
export class AnnouncementsAdminController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
    const l = Math.min(100, Math.max(1, Number.parseInt(limit ?? '20', 10) || 20));
    return this.announcements.listAdmin(p, l);
  }

  @Post()
  create(
    @Body() dto: CreateAnnouncementDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.announcements.createAdmin(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcements.updateAdmin(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.announcements.deleteAdmin(id);
  }
}
