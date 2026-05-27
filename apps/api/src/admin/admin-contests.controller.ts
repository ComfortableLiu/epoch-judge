import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  AdminUpdateContestRegistrationDto,
  AdminUpsertContestRegistrationDto,
  CreateContestDto,
  UpdateContestDto,
} from '../contests/contests.dto';
import { ContestsService } from '../contests/contests.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/contests')
export class AdminContestsController {
  constructor(private readonly contests: ContestsService) {}

  @Get()
  list() {
    return this.contests.listAdmin();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.contests.getAdminById(id);
  }

  @Post()
  create(
    @Body() dto: CreateContestDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.contests.createAdmin(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContestDto) {
    return this.contests.updateAdmin(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contests.deleteAdmin(id);
  }

  @Get(':id/registrations')
  listRegistrations(@Param('id') id: string) {
    return this.contests.listRegistrationsAdmin(id);
  }

  @Post(':id/registrations')
  addRegistration(
    @Param('id') id: string,
    @Body() dto: AdminUpsertContestRegistrationDto,
  ) {
    return this.contests.upsertRegistrationAdmin(
      id,
      dto.userId,
      dto.isStarTeam ?? false,
    );
  }

  @Patch(':id/registrations/:userId')
  updateRegistration(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateContestRegistrationDto,
  ) {
    if (dto.isStarTeam === undefined) {
      return { ok: true };
    }
    return this.contests.updateRegistrationAdmin(id, userId, dto.isStarTeam);
  }
}
