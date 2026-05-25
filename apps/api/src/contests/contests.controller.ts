import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ContestsService } from './contests.service';

@ApiTags('contests')
@Controller('contests')
export class ContestsController {
  constructor(private readonly contests: ContestsService) {}

  @Get()
  list() {
    return this.contests.list();
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.contests.getBySlug(slug);
  }

  @Get(':id/scoreboard')
  scoreboard(@Param('id') id: string) {
    return this.contests.scoreboard(id, true, false);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id/scoreboard/full')
  scoreboardFull(@Param('id') id: string) {
    return this.contests.scoreboard(id, false, true);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/register')
  register(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.contests.register(req.user.id, id);
  }
}
