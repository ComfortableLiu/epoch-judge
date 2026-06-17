import {
  Body,
  Controller,
  Get,
  Param,
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
  @ApiOperation({ summary: 'List all public contests' })
  @ApiResponse({ status: 200, description: 'List of contests' })
  list() {
    return this.contests.list();
  }

  @Get(':number')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get contest detail' })
  @ApiParam({ name: 'number', description: 'Contest number' })
  @ApiResponse({ status: 200, description: 'Contest detail' })
  @ApiResponse({ status: 404, description: 'Contest not found' })
  detail(
    @Param('number') number: string,
    @Req() req: { user?: { id: string; role: Role } },
  ) {
    return this.contests.getDetailByNumber(number, req.user);
  }

  @Get(':number/scoreboard')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get contest scoreboard' })
  @ApiParam({ name: 'number', description: 'Contest number' })
  @ApiResponse({ status: 200, description: 'Public scoreboard' })
  @ApiResponse({ status: 404, description: 'Contest not found' })
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
  @ApiOperation({ summary: 'Get full contest scoreboard (admin only)' })
  @ApiParam({ name: 'number', description: 'Contest number' })
  @ApiResponse({ status: 200, description: 'Full scoreboard with all participants' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
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
  @ApiOperation({ summary: 'Register for a contest' })
  @ApiParam({ name: 'number', description: 'Contest number' })
  @ApiResponse({ status: 201, description: 'Registered successfully' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Contest not found' })
  register(@Param('number') number: string, @Req() req: { user: { id: string } }) {
    return this.contests
      .resolveByNumber(number)
      .then((c) => this.contests.register(req.user.id, c.id));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':number/verify-password')
  @ApiOperation({ summary: 'Verify contest password for private contests' })
  @ApiParam({ name: 'number', description: 'Contest number' })
  @ApiBody({ type: VerifyContestPasswordDto })
  @ApiResponse({ status: 200, description: 'Password verified' })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  verifyPassword(
    @Param('number') number: string,
    @Body() dto: VerifyContestPasswordDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.contests.verifyPassword(number, req.user.id, dto.password);
  }
}
