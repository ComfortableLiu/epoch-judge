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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'List all contests (admin)' })
  @ApiResponse({ status: 200, description: 'List of all contests including hidden' })
  list() {
    return this.contests.listAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contest detail by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Contest ID' })
  @ApiResponse({ status: 200, description: 'Contest detail' })
  @ApiResponse({ status: 404, description: 'Contest not found' })
  get(@Param('id') id: string) {
    return this.contests.getAdminById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new contest' })
  @ApiBody({ type: CreateContestDto })
  @ApiResponse({ status: 201, description: 'Contest created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @Body() dto: CreateContestDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.contests.createAdmin(dto, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contest' })
  @ApiParam({ name: 'id', description: 'Contest ID' })
  @ApiBody({ type: UpdateContestDto })
  @ApiResponse({ status: 200, description: 'Contest updated' })
  @ApiResponse({ status: 404, description: 'Contest not found' })
  update(@Param('id') id: string, @Body() dto: UpdateContestDto) {
    return this.contests.updateAdmin(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contest' })
  @ApiParam({ name: 'id', description: 'Contest ID' })
  @ApiResponse({ status: 200, description: 'Contest deleted' })
  @ApiResponse({ status: 404, description: 'Contest not found' })
  remove(@Param('id') id: string) {
    return this.contests.deleteAdmin(id);
  }

  @Get(':id/registrations')
  @ApiOperation({ summary: 'List contest registrations' })
  @ApiParam({ name: 'id', description: 'Contest ID' })
  @ApiResponse({ status: 200, description: 'List of registrations' })
  listRegistrations(@Param('id') id: string) {
    return this.contests.listRegistrationsAdmin(id);
  }

  @Post(':id/registrations')
  @ApiOperation({ summary: 'Add or update a contest registration' })
  @ApiParam({ name: 'id', description: 'Contest ID' })
  @ApiBody({ type: AdminUpsertContestRegistrationDto })
  @ApiResponse({ status: 201, description: 'Registration created or updated' })
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
  @ApiOperation({ summary: 'Update a contest registration' })
  @ApiParam({ name: 'id', description: 'Contest ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: AdminUpdateContestRegistrationDto })
  @ApiResponse({ status: 200, description: 'Registration updated' })
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
