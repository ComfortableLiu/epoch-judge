import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/optional-jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { VerifyContestPasswordDto } from './contests.dto';
import { ContestsService } from './contests.service';

@ApiTags('contests')
@Controller('contests')
export class ContestsController {
  constructor(private readonly contests: ContestsService) {}

  @Get()
  list() {
    return this.contests.list();
  }

  @Get(':number')
  @UseGuards(OptionalJwtAuthGuard)
  detail(
    @Param('number') number: string,
    @Req() req: { user?: { id: string; role: Role } },
  ) {
    return this.contests.getDetailByNumber(number, req.user);
  }

  @Get(':number/scoreboard')
  @UseGuards(OptionalJwtAuthGuard)
  scoreboard(
    @Param('number') number: string,
    @Req() req: { user?: { id: string; role: Role }; locale?: string },
  ) {
    return this.contests.scoreboard(
      number,
      req.user,
      req.locale ?? 'zh-CN',
      true,
      false,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':number/scoreboard/full')
  scoreboardFull(
    @Param('number') number: string,
    @Req() req: { user: { id: string; role: Role }; locale?: string },
  ) {
    return this.contests.scoreboard(
      number,
      req.user,
      req.locale ?? 'zh-CN',
      false,
      true,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':number/register')
  register(@Param('number') number: string, @Req() req: { user: { id: string } }) {
    return this.contests
      .resolveByNumber(number)
      .then((c) => this.contests.register(req.user.id, c.id));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':number/verify-password')
  verifyPassword(
    @Param('number') number: string,
    @Body() dto: VerifyContestPasswordDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.contests.verifyPassword(number, req.user.id, dto.password);
  }
}
